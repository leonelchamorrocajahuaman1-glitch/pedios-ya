-- =============================================================================
-- Mikuy · Lógica de negocio en la base de datos
-- Cálculo de totales, envío, cupones, stock, pedidos idempotentes, estados,
-- pagos, reseñas, estadísticas y auditoría.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Restaurante abierto (columna calculada: restaurants.is_open en PostgREST)
-- ---------------------------------------------------------------------------
create or replace function public.is_open(r public.restaurants)
returns boolean
language sql stable set search_path = ''
as $$
  with now_lima as (select (now() at time zone 'America/Lima') as ts)
  select r.status = 'approved'
    and r.is_accepting_orders
    and extract(dow from ts)::smallint = any (r.open_days)
    and case
      when r.closes_at > r.opens_at then ts::time >= r.opens_at and ts::time < r.closes_at
      else ts::time >= r.opens_at or ts::time < r.closes_at  -- horario que cruza medianoche
    end
  from now_lima;
$$;

-- Distancia en km (fórmula de Haversine)
create or replace function public.distance_km(lat1 double precision, lng1 double precision,
                                              lat2 double precision, lng2 double precision)
returns numeric
language sql immutable set search_path = ''
as $$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )))::numeric, 2);
$$;

-- ---------------------------------------------------------------------------
-- Motor de precios (interno). Calcula líneas, envío, cupón y total a partir
-- de los precios de la BASE DE DATOS: nunca confía en importes del cliente.
-- p_items: [{"product_id": uuid, "quantity": int, "options": [{"group": text, "choice": text}], "notes": text}]
-- ---------------------------------------------------------------------------
create or replace function public._price_order(
  p_restaurant_id uuid,
  p_items jsonb,
  p_coupon_code text,
  p_lat double precision,
  p_lng double precision,
  p_user_id uuid,
  p_lock boolean
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_settings public.platform_settings;
  v_rest public.restaurants;
  v_item jsonb;
  v_prod public.products;
  v_qty int;
  v_group jsonb;
  v_sel jsonb;
  v_choice jsonb;
  v_selected jsonb;
  v_count int;
  v_opt_price numeric(10,2);
  v_opts jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_used jsonb := '{}'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_distance numeric;
  v_fee numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_coupon public.coupons;
  v_user_uses int;
  v_total numeric(10,2);
begin
  select * into v_settings from public.platform_settings where id = 1;
  select * into v_rest from public.restaurants where id = p_restaurant_id;
  if not found or v_rest.status <> 'approved' then
    raise exception 'El restaurante no está disponible' using hint = 'RESTAURANT_UNAVAILABLE';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío' using hint = 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'Demasiados productos en un solo pedido' using hint = 'TOO_MANY_ITEMS';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 50 then
      raise exception 'Cantidad inválida' using hint = 'INVALID_QUANTITY';
    end if;

    if p_lock then
      select * into v_prod from public.products
        where id = (v_item ->> 'product_id')::uuid and restaurant_id = p_restaurant_id
        for update;
    else
      select * into v_prod from public.products
        where id = (v_item ->> 'product_id')::uuid and restaurant_id = p_restaurant_id;
    end if;
    if not found then
      raise exception 'Un producto del carrito ya no existe' using hint = 'PRODUCT_NOT_FOUND';
    end if;
    if not v_prod.is_available then
      raise exception '"%" no está disponible en este momento', v_prod.name using hint = 'PRODUCT_UNAVAILABLE';
    end if;

    -- Validación de stock acumulada por producto
    v_used := jsonb_set(v_used, array[v_prod.id::text],
      to_jsonb(coalesce((v_used ->> v_prod.id::text)::int, 0) + v_qty));
    if v_prod.stock is not null and (v_used ->> v_prod.id::text)::int > v_prod.stock then
      raise exception 'Stock insuficiente para "%" (disponibles: %)', v_prod.name, v_prod.stock
        using hint = 'OUT_OF_STOCK';
    end if;

    -- Validación de opciones contra la definición del producto
    v_selected := coalesce(v_item -> 'options', '[]'::jsonb);
    if jsonb_typeof(v_selected) <> 'array' then
      raise exception 'Opciones inválidas' using hint = 'INVALID_OPTIONS';
    end if;
    for v_sel in select * from jsonb_array_elements(v_selected) loop
      if not exists (select 1 from jsonb_array_elements(v_prod.options) g where g ->> 'name' = v_sel ->> 'group') then
        raise exception 'Opción no válida para "%"', v_prod.name using hint = 'INVALID_OPTIONS';
      end if;
    end loop;

    v_opt_price := 0;
    v_opts := '[]'::jsonb;
    for v_group in select * from jsonb_array_elements(v_prod.options) loop
      v_count := 0;
      for v_sel in select * from jsonb_array_elements(v_selected) s where s ->> 'group' = v_group ->> 'name' loop
        select c into v_choice from jsonb_array_elements(v_group -> 'choices') c
          where c ->> 'name' = v_sel ->> 'choice';
        if v_choice is null then
          raise exception 'Opción "%" no válida', v_sel ->> 'choice' using hint = 'INVALID_OPTIONS';
        end if;
        v_count := v_count + 1;
        v_opt_price := v_opt_price + coalesce((v_choice ->> 'price')::numeric, 0);
        v_opts := v_opts || jsonb_build_object(
          'group', v_group ->> 'name', 'choice', v_choice ->> 'name',
          'price', coalesce((v_choice ->> 'price')::numeric, 0));
      end loop;
      if coalesce((v_group ->> 'required')::boolean, false) and v_count = 0 then
        raise exception 'Elige una opción de "%" para "%"', v_group ->> 'name', v_prod.name
          using hint = 'OPTION_REQUIRED';
      end if;
      if v_count > coalesce((v_group ->> 'max')::int, 1) then
        raise exception 'Demasiadas opciones en "%"', v_group ->> 'name' using hint = 'INVALID_OPTIONS';
      end if;
    end loop;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'product_name', v_prod.name,
      'product_image', v_prod.image_url,
      'unit_price', v_prod.price,
      'options', v_opts,
      'options_price', v_opt_price,
      'quantity', v_qty,
      'line_total', (v_prod.price + v_opt_price) * v_qty,
      'notes', left(nullif(trim(v_item ->> 'notes'), ''), 200)
    );
    v_subtotal := v_subtotal + (v_prod.price + v_opt_price) * v_qty;
  end loop;

  if v_subtotal < v_rest.min_order_amount then
    raise exception 'El pedido mínimo de % es S/ %', v_rest.name, v_rest.min_order_amount
      using hint = 'MIN_ORDER';
  end if;

  -- Envío: tarifa del local + recargo por km fuera del radio incluido
  v_fee := v_rest.delivery_fee;
  if p_lat is not null and p_lng is not null and v_rest.lat is not null and v_rest.lng is not null then
    v_distance := public.distance_km(v_rest.lat, v_rest.lng, p_lat, p_lng);
    if v_distance > v_settings.max_delivery_km then
      raise exception 'La dirección está fuera de la zona de reparto (% km)', v_distance
        using hint = 'OUT_OF_RANGE';
    end if;
    v_fee := v_fee + greatest(0, v_distance - v_settings.included_km) * v_settings.fee_per_km;
  end if;
  v_fee := round(v_fee, 1);
  if v_settings.free_delivery_threshold is not null and v_subtotal >= v_settings.free_delivery_threshold then
    v_fee := 0;
  end if;

  -- Cupón
  if nullif(trim(p_coupon_code), '') is not null then
    if p_lock then
      select * into v_coupon from public.coupons where code = upper(trim(p_coupon_code)) for update;
    else
      select * into v_coupon from public.coupons where code = upper(trim(p_coupon_code));
    end if;
    if not found or not v_coupon.is_active then
      raise exception 'El cupón no existe o no está activo' using hint = 'COUPON_INVALID';
    end if;
    if v_coupon.starts_at > now() or (v_coupon.expires_at is not null and v_coupon.expires_at <= now()) then
      raise exception 'El cupón no está vigente' using hint = 'COUPON_EXPIRED';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then
      raise exception 'El cupón alcanzó su límite de usos' using hint = 'COUPON_EXHAUSTED';
    end if;
    if v_coupon.restaurant_id is not null and v_coupon.restaurant_id <> p_restaurant_id then
      raise exception 'El cupón no aplica para este restaurante' using hint = 'COUPON_RESTAURANT';
    end if;
    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'El cupón requiere un pedido mínimo de S/ %', v_coupon.min_order_amount
        using hint = 'COUPON_MIN_ORDER';
    end if;
    if p_user_id is not null then
      select count(*) into v_user_uses from public.coupon_usages cu
        join public.orders o on o.id = cu.order_id
        where cu.coupon_id = v_coupon.id and cu.user_id = p_user_id and o.status <> 'cancelled';
      if v_user_uses >= v_coupon.per_user_limit then
        raise exception 'Ya usaste este cupón el máximo de veces permitido' using hint = 'COUPON_USER_LIMIT';
      end if;
    end if;

    v_discount := case v_coupon.discount_type
      when 'percentage' then round(v_subtotal * v_coupon.discount_value / 100, 2)
      when 'fixed' then least(v_coupon.discount_value, v_subtotal)
      when 'free_delivery' then v_fee
    end;
    if v_coupon.max_discount is not null then
      v_discount := least(v_discount, v_coupon.max_discount);
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_fee + v_settings.service_fee - v_discount);

  return jsonb_build_object(
    'restaurant_id', v_rest.id,
    'lines', v_lines,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'service_fee', v_settings.service_fee,
    'discount', v_discount,
    'total', v_total,
    'distance_km', v_distance,
    'coupon_id', v_coupon.id,
    'coupon_code', v_coupon.code,
    'coupon_type', v_coupon.discount_type,
    'commission_rate', v_rest.commission_rate,
    'used_stock', v_used
  );
end $$;
revoke all on function public._price_order(uuid, jsonb, text, double precision, double precision, uuid, boolean)
  from public, anon, authenticated;

-- Cotización pública del carrito (no reserva stock ni consume cupones)
create or replace function public.quote_order(
  p_restaurant_id uuid,
  p_items jsonb,
  p_coupon_code text default null,
  p_address_id uuid default null
)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_result jsonb;
begin
  if p_address_id is not null then
    select lat, lng into v_lat, v_lng from public.addresses
      where id = p_address_id and user_id = auth.uid();
  end if;
  v_result := public._price_order(p_restaurant_id, p_items, p_coupon_code, v_lat, v_lng, auth.uid(), false);
  return v_result - 'used_stock' - 'commission_rate';
end $$;
grant execute on function public.quote_order(uuid, jsonb, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Crear pedido (atómico e idempotente)
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_restaurant_id uuid,
  p_items jsonb,
  p_address_id uuid,
  p_payment_method public.payment_method,
  p_idempotency_key uuid,
  p_coupon_code text default null,
  p_notes text default null,
  p_reference text default null,
  p_contact_phone text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_existing uuid;
  v_addr public.addresses;
  v_rest public.restaurants;
  v_settings public.platform_settings;
  v_q jsonb;
  v_order_id uuid;
  v_line jsonb;
  v_pid text;
  v_rows int;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para comprar' using errcode = '42501', hint = 'AUTH_REQUIRED';
  end if;
  if not public.is_active_user() then
    raise exception 'Tu cuenta está suspendida' using errcode = '42501', hint = 'ACCOUNT_SUSPENDED';
  end if;
  if p_idempotency_key is null then
    raise exception 'Falta la clave de idempotencia' using hint = 'IDEMPOTENCY_REQUIRED';
  end if;

  -- Serializa los pedidos de un mismo usuario y evita duplicados por doble clic / reintentos
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 42));
  select id into v_existing from public.orders where user_id = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then
    raise exception 'Selecciona una dirección de entrega válida' using hint = 'ADDRESS_REQUIRED';
  end if;

  select * into v_rest from public.restaurants where id = p_restaurant_id;
  if not found or not public.is_open(v_rest) then
    raise exception 'El restaurante está cerrado en este momento' using hint = 'RESTAURANT_CLOSED';
  end if;

  select * into v_settings from public.platform_settings where id = 1;
  if (p_payment_method = 'cash' and not v_settings.payment_cash_enabled)
     or (p_payment_method = 'yape' and not v_settings.payment_yape_enabled)
     or (p_payment_method = 'plin' and not v_settings.payment_plin_enabled)
     or (p_payment_method = 'card' and not v_settings.payment_card_enabled) then
    raise exception 'El método de pago seleccionado no está disponible' using hint = 'PAYMENT_METHOD_DISABLED';
  end if;

  v_q := public._price_order(p_restaurant_id, p_items, p_coupon_code, v_addr.lat, v_addr.lng, v_uid, true);

  -- Descontar inventario (las filas ya están bloqueadas por _price_order)
  for v_pid in select jsonb_object_keys(v_q -> 'used_stock') loop
    update public.products
      set stock = stock - (v_q -> 'used_stock' ->> v_pid)::int
      where id = v_pid::uuid and stock is not null;
  end loop;

  insert into public.orders (
    user_id, restaurant_id, address_id, delivery_address, delivery_district, delivery_reference,
    delivery_lat, delivery_lng, contact_phone, notes, payment_method, payment_status,
    subtotal, delivery_fee, service_fee, discount, total, commission_rate, commission_amount,
    coupon_id, distance_km, idempotency_key
  ) values (
    v_uid, p_restaurant_id, v_addr.id, v_addr.street, v_addr.district,
    coalesce(nullif(left(trim(p_reference), 250), ''), v_addr.reference),
    v_addr.lat, v_addr.lng,
    coalesce(nullif(trim(p_contact_phone), ''), (select phone from public.profiles where id = v_uid)),
    nullif(left(trim(p_notes), 300), ''),
    p_payment_method, 'pending',
    (v_q ->> 'subtotal')::numeric, (v_q ->> 'delivery_fee')::numeric, (v_q ->> 'service_fee')::numeric,
    (v_q ->> 'discount')::numeric, (v_q ->> 'total')::numeric,
    (v_q ->> 'commission_rate')::numeric,
    round((v_q ->> 'subtotal')::numeric * (v_q ->> 'commission_rate')::numeric, 2),
    (v_q ->> 'coupon_id')::uuid, (v_q ->> 'distance_km')::numeric, p_idempotency_key
  ) returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(v_q -> 'lines') loop
    insert into public.order_items (order_id, product_id, product_name, product_image, unit_price,
      options, options_price, quantity, line_total, notes)
    values (v_order_id, (v_line ->> 'product_id')::uuid, v_line ->> 'product_name', v_line ->> 'product_image',
      (v_line ->> 'unit_price')::numeric, v_line -> 'options', (v_line ->> 'options_price')::numeric,
      (v_line ->> 'quantity')::int, (v_line ->> 'line_total')::numeric, v_line ->> 'notes');
  end loop;

  if v_q ->> 'coupon_id' is not null then
    update public.coupons set usage_count = usage_count + 1
      where id = (v_q ->> 'coupon_id')::uuid
        and (usage_limit is null or usage_count < usage_limit);
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      raise exception 'El cupón alcanzó su límite de usos' using hint = 'COUPON_EXHAUSTED';
    end if;
    insert into public.coupon_usages (coupon_id, user_id, order_id, discount_amount)
      values ((v_q ->> 'coupon_id')::uuid, v_uid, v_order_id, (v_q ->> 'discount')::numeric);
  end if;

  -- Registro de pago: SIEMPRE nace pendiente. Solo el proveedor (webhook) o un admin lo confirma.
  insert into public.payments (order_id, method, provider, amount, status)
  values (v_order_id, p_payment_method,
    case p_payment_method when 'card' then 'mercadopago' else p_payment_method::text end,
    (v_q ->> 'total')::numeric, 'pending');

  return v_order_id;
end $$;
revoke all on function public.place_order(uuid, jsonb, uuid, public.payment_method, uuid, text, text, text, text)
  from public, anon;
grant execute on function public.place_order(uuid, jsonb, uuid, public.payment_method, uuid, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Estados del pedido: historial, marcas de tiempo y notificaciones
-- ---------------------------------------------------------------------------
create or replace function public.order_status_label(s public.order_status)
returns text language sql immutable set search_path = '' as $$
  select case s
    when 'received' then 'Pedido recibido'
    when 'accepted' then 'El restaurante aceptó tu pedido'
    when 'preparing' then 'Estamos preparando tu pedido'
    when 'courier_assigned' then 'Repartidor asignado'
    when 'picked_up' then 'El repartidor recogió tu pedido'
    when 'on_the_way' then 'Tu pedido está en camino'
    when 'delivered' then 'Pedido entregado'
    when 'cancelled' then 'Pedido cancelado'
  end;
$$;

create or replace function public.order_status_before()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'accepted' then new.accepted_at := now(); end if;
    if new.status = 'delivered' then new.delivered_at := now(); end if;
    if new.status = 'cancelled' then new.cancelled_at := now(); end if;
  end if;
  return new;
end $$;
create trigger orders_status_before before update of status on public.orders
  for each row execute function public.order_status_before();

create or replace function public.order_status_after()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_code text := new.code;
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, changed_by)
      values (new.id, new.status, auth.uid());
    insert into public.notifications (user_id, type, title, body, order_id)
      values (new.user_id, 'order_status', public.order_status_label(new.status),
              'Pedido ' || v_code, new.id);
  end if;
  return new;
end $$;
create trigger orders_status_after_insert after insert on public.orders
  for each row execute function public.order_status_after();
create trigger orders_status_after_update after update of status on public.orders
  for each row execute function public.order_status_after();

-- Reponer stock y liberar cupón (interno)
create or replace function public._cancel_order(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_item record;
begin
  for v_item in select product_id, sum(quantity) as qty from public.order_items
                where order_id = p_order_id and product_id is not null group by product_id loop
    update public.products set stock = stock + v_item.qty where id = v_item.product_id and stock is not null;
  end loop;

  update public.coupons c set usage_count = greatest(0, c.usage_count - 1)
    from public.coupon_usages cu where cu.order_id = p_order_id and cu.coupon_id = c.id;
  delete from public.coupon_usages where order_id = p_order_id;

  update public.payments set status = 'cancelled'
    where order_id = p_order_id and status in ('pending', 'pending_verification');
  update public.orders
    set status = 'cancelled', cancel_reason = left(p_reason, 300),
        payment_status = case when payment_status in ('pending', 'pending_verification') then 'cancelled' else payment_status end
    where id = p_order_id;
end $$;
revoke all on function public._cancel_order(uuid, text) from public, anon, authenticated;

-- El cliente puede cancelar solo mientras el restaurante no lo haya aceptado
create or replace function public.cancel_my_order(p_order_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Pedido no encontrado' using errcode = '42501';
  end if;
  if v_order.status <> 'received' then
    raise exception 'El pedido ya fue aceptado por el restaurante y no puede cancelarse desde la app'
      using hint = 'CANNOT_CANCEL';
  end if;
  if v_order.payment_status = 'approved' then
    raise exception 'El pago ya fue confirmado. Contacta a soporte para gestionar el reembolso'
      using hint = 'PAID_ORDER';
  end if;
  perform public._cancel_order(p_order_id, coalesce(nullif(trim(p_reason), ''), 'Cancelado por el cliente'));
end $$;
grant execute on function public.cancel_my_order(uuid, text) to authenticated;

-- El cliente reporta su pago Yape/Plin; queda "por verificar" hasta que un admin lo confirme
create or replace function public.report_wallet_payment(p_order_id uuid, p_operation_number text, p_payer_phone text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Pedido no encontrado' using errcode = '42501';
  end if;
  if v_order.payment_method not in ('yape', 'plin') then
    raise exception 'Este pedido no usa Yape ni Plin';
  end if;
  if v_order.status = 'cancelled' or v_order.payment_status not in ('pending', 'rejected') then
    raise exception 'El pago de este pedido no puede reportarse';
  end if;
  if p_operation_number !~ '^[0-9A-Za-z-]{4,30}$' then
    raise exception 'Número de operación inválido' using hint = 'INVALID_OPERATION';
  end if;
  update public.payments
    set status = 'pending_verification', operation_number = p_operation_number,
        payer_phone = nullif(left(trim(p_payer_phone), 20), '')
    where order_id = p_order_id and method = v_order.payment_method
      and status in ('pending', 'rejected');
  update public.orders set payment_status = 'pending_verification' where id = p_order_id;
end $$;
grant execute on function public.report_wallet_payment(uuid, text, text) to authenticated;

-- Datos públicos del repartidor de MI pedido
create or replace function public.get_order_courier(p_order_id uuid)
returns table (full_name text, vehicle_type text, vehicle_plate text, phone text,
               last_lat double precision, last_lng double precision, last_seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.full_name, c.vehicle_type, c.vehicle_plate, c.phone,
         case when c.location_consent then c.last_lat end,
         case when c.location_consent then c.last_lng end,
         c.last_seen_at
  from public.orders o join public.couriers c on c.id = o.courier_id
  where o.id = p_order_id
    and (o.user_id = auth.uid() or public.is_admin())
    and o.status in ('courier_assigned', 'picked_up', 'on_the_way', 'delivered');
$$;
grant execute on function public.get_order_courier(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
create or replace function public.log_admin_action(p_action text, p_entity text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  insert into public.admin_audit_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end $$;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;

-- Auditoría automática de cambios administrativos en tablas de gestión
create or replace function public.audit_admin_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
  if auth.uid() is not null and public.is_admin() then
    v_id := coalesce(
      (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
      (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'restaurant_id');
    insert into public.admin_audit_logs (actor_id, action, entity, entity_id, details)
    values (auth.uid(), lower(tg_op), tg_table_name, v_id,
      case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
           when tg_op = 'DELETE' then jsonb_build_object('before', to_jsonb(old))
           else jsonb_build_object('after', to_jsonb(new)) end);
  end if;
  return coalesce(new, old);
end $$;

create trigger audit_restaurants after insert or update or delete on public.restaurants
  for each row execute function public.audit_admin_change();
create trigger audit_products after insert or update or delete on public.products
  for each row execute function public.audit_admin_change();
create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_admin_change();
create trigger audit_coupons after insert or update or delete on public.coupons
  for each row execute function public.audit_admin_change();
create trigger audit_couriers after insert or update or delete on public.couriers
  for each row execute function public.audit_admin_change();
create trigger audit_settings after update on public.platform_settings
  for each row execute function public.audit_admin_change();

-- ---------------------------------------------------------------------------
-- Gestión de pedidos (admin)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_flow public.order_status[] := array['received','accepted','preparing','courier_assigned','picked_up','on_the_way','delivered']::public.order_status[];
  v_from int;
  v_to int;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'El pedido ya está cerrado' using hint = 'ORDER_CLOSED';
  end if;

  if p_status = 'cancelled' then
    perform public._cancel_order(p_order_id, coalesce(nullif(trim(p_note), ''), 'Cancelado por administración'));
  else
    v_from := array_position(v_flow, v_order.status);
    v_to := array_position(v_flow, p_status);
    if v_to <> v_from + 1 then
      raise exception 'Transición no permitida: % → %', v_order.status, p_status using hint = 'INVALID_TRANSITION';
    end if;
    if p_status = 'accepted' and v_order.payment_method = 'card' and v_order.payment_status <> 'approved' then
      raise exception 'El pago con tarjeta aún no fue confirmado por la pasarela' using hint = 'PAYMENT_PENDING';
    end if;
    if p_status = 'courier_assigned' and v_order.courier_id is null then
      raise exception 'Asigna un repartidor antes de cambiar el estado' using hint = 'COURIER_REQUIRED';
    end if;
    update public.orders set status = p_status where id = p_order_id;
  end if;

  if p_note is not null then
    update public.order_status_history set note = left(p_note, 300)
      where id = (select max(id) from public.order_status_history where order_id = p_order_id);
  end if;
  perform public.log_admin_action('order_status', 'orders', p_order_id::text,
    jsonb_build_object('from', v_order.status, 'to', p_status, 'note', p_note));
end $$;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text) to authenticated;

create or replace function public.admin_assign_courier(p_order_id uuid, p_courier_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_courier public.couriers;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_order.status not in ('accepted', 'preparing', 'courier_assigned') then
    raise exception 'Solo se puede asignar repartidor a pedidos aceptados o en preparación'
      using hint = 'INVALID_TRANSITION';
  end if;
  select * into v_courier from public.couriers where id = p_courier_id;
  if not found or v_courier.status <> 'active' then
    raise exception 'El repartidor no está activo';
  end if;
  update public.orders set courier_id = p_courier_id, status = 'courier_assigned' where id = p_order_id;
  perform public.log_admin_action('assign_courier', 'orders', p_order_id::text,
    jsonb_build_object('courier_id', p_courier_id, 'previous', v_order.courier_id));
end $$;
grant execute on function public.admin_assign_courier(uuid, uuid) to authenticated;

-- Confirmación manual de cobros que no pasan por pasarela (efectivo, Yape, Plin)
create or replace function public.admin_review_payment(p_payment_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_pay public.payments;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Pago no encontrado'; end if;
  if v_pay.method = 'card' then
    raise exception 'Los pagos con tarjeta solo los confirma la pasarela mediante webhook'
      using hint = 'CARD_WEBHOOK_ONLY';
  end if;
  if v_pay.status not in ('pending', 'pending_verification') then
    raise exception 'Este pago ya fue procesado';
  end if;
  update public.payments
    set status = case when p_approve then 'approved'::public.payment_status else 'rejected'::public.payment_status end,
        confirmed_at = now(), confirmed_by = auth.uid(),
        raw_response = coalesce(raw_response, '{}'::jsonb) || jsonb_build_object('admin_note', p_note)
    where id = p_payment_id;
  update public.orders
    set payment_status = case when p_approve then 'approved'::public.payment_status else 'rejected'::public.payment_status end
    where id = v_pay.order_id;
  insert into public.notifications (user_id, type, title, body, order_id)
    select o.user_id, 'payment',
      case when p_approve then 'Pago confirmado' else 'No pudimos verificar tu pago' end,
      'Pedido ' || o.code || coalesce(' · ' || p_note, ''), o.id
    from public.orders o where o.id = v_pay.order_id;
  perform public.log_admin_action(case when p_approve then 'payment_approved' else 'payment_rejected' end,
    'payments', p_payment_id::text, jsonb_build_object('order_id', v_pay.order_id, 'note', p_note));
end $$;
grant execute on function public.admin_review_payment(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Pasarela de tarjetas (solo service_role, invocado por el webhook verificado)
-- ---------------------------------------------------------------------------
create or replace function public.apply_card_payment(
  p_order_id uuid, p_provider_payment_id text, p_status text, p_amount numeric, p_raw jsonb
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_status public.payment_status;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then return 'order_not_found'; end if;
  if v_order.payment_method <> 'card' then return 'not_card_order'; end if;

  v_status := case p_status
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    when 'cancelled' then 'cancelled'
    when 'refunded' then 'refunded'
    when 'charged_back' then 'refunded'
    else 'pending'
  end;
  if v_status = 'approved' and abs(p_amount - v_order.total) > 0.01 then
    -- Importe distinto al pedido: no se acepta como pagado
    v_status := 'pending_verification';
  end if;

  update public.payments
    set provider_payment_id = p_provider_payment_id, status = v_status, raw_response = p_raw,
        confirmed_at = case when v_status = 'approved' then now() else confirmed_at end
    where order_id = p_order_id and method = 'card'
      and (provider_payment_id is null or provider_payment_id = p_provider_payment_id);
  if not found then
    insert into public.payments (order_id, method, provider, amount, status, provider_payment_id, raw_response, confirmed_at)
      values (p_order_id, 'card', 'mercadopago', p_amount, v_status, p_provider_payment_id, p_raw,
              case when v_status = 'approved' then now() end)
      on conflict (provider, provider_payment_id) where provider_payment_id is not null
      do update set status = excluded.status, raw_response = excluded.raw_response;
  end if;

  -- Un pago aprobado nunca se degrada por una notificación tardía de otro intento
  if v_order.payment_status <> 'approved' or v_status in ('refunded') then
    update public.orders set payment_status = v_status where id = p_order_id;
  end if;
  if v_status = 'approved' and v_order.payment_status <> 'approved' then
    insert into public.notifications (user_id, type, title, body, order_id)
      values (v_order.user_id, 'payment', 'Pago con tarjeta confirmado', 'Pedido ' || v_order.code, v_order.id);
  end if;
  return v_status::text;
end $$;
revoke all on function public.apply_card_payment(uuid, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.apply_card_payment(uuid, text, text, numeric, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Repartidores (enlace personal; invocado por la API con service_role)
-- ---------------------------------------------------------------------------
create or replace function public.courier_advance_order(p_courier_id uuid, p_order_id uuid, p_status public.order_status)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and courier_id = p_courier_id for update;
  if not found then raise exception 'Pedido no asignado a este repartidor' using errcode = '42501'; end if;
  if not ((v_order.status = 'courier_assigned' and p_status = 'picked_up')
       or (v_order.status = 'picked_up' and p_status = 'on_the_way')
       or (v_order.status = 'on_the_way' and p_status = 'delivered')) then
    raise exception 'Transición no permitida' using hint = 'INVALID_TRANSITION';
  end if;
  update public.orders set status = p_status where id = p_order_id;
end $$;
revoke all on function public.courier_advance_order(uuid, uuid, public.order_status) from public, anon, authenticated;
grant execute on function public.courier_advance_order(uuid, uuid, public.order_status) to service_role;

create or replace function public.courier_report_location(
  p_courier_id uuid, p_lat double precision, p_lng double precision,
  p_heading double precision default null, p_speed double precision default null
)
returns int language plpgsql security definer set search_path = '' as $$
declare v_courier public.couriers; v_rows int;
begin
  select * into v_courier from public.couriers where id = p_courier_id for update;
  if not found or v_courier.status <> 'active' or not v_courier.location_consent then
    raise exception 'El repartidor no autorizó el seguimiento' using errcode = '42501';
  end if;
  update public.couriers set last_lat = p_lat, last_lng = p_lng, last_seen_at = now() where id = p_courier_id;
  insert into public.delivery_locations (order_id, courier_id, lat, lng, heading, speed)
    select o.id, p_courier_id, p_lat, p_lng, p_heading, p_speed
    from public.orders o
    where o.courier_id = p_courier_id and o.status in ('courier_assigned', 'picked_up', 'on_the_way');
  get diagnostics v_rows = row_count;
  return v_rows;
end $$;
revoke all on function public.courier_report_location(uuid, double precision, double precision, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.courier_report_location(uuid, double precision, double precision, double precision, double precision)
  to service_role;

-- ---------------------------------------------------------------------------
-- Reseñas
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(p_order_id uuid, p_rating smallint, p_comment text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid();
  if not found then raise exception 'Pedido no encontrado' using errcode = '42501'; end if;
  if v_order.status <> 'delivered' then
    raise exception 'Solo puedes calificar pedidos entregados' using hint = 'NOT_DELIVERED';
  end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Calificación inválida'; end if;
  insert into public.reviews (order_id, user_id, restaurant_id, rating, comment)
    values (p_order_id, auth.uid(), v_order.restaurant_id, p_rating, nullif(left(trim(p_comment), 500), ''))
    on conflict (order_id) do nothing;
  if not found then raise exception 'Ya calificaste este pedido' using hint = 'ALREADY_REVIEWED'; end if;
end $$;
grant execute on function public.submit_review(uuid, smallint, text) to authenticated;

create or replace function public.refresh_restaurant_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_rid uuid := coalesce(new.restaurant_id, old.restaurant_id);
begin
  update public.restaurants r set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where restaurant_id = v_rid), 0),
    rating_count = (select count(*) from public.reviews where restaurant_id = v_rid)
  where r.id = v_rid;
  return null;
end $$;
create trigger reviews_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_restaurant_rating();

-- ---------------------------------------------------------------------------
-- Solicitudes de afiliación de negocios (quedan "pending" hasta aprobación admin)
-- ---------------------------------------------------------------------------
create or replace function public.submit_restaurant_application(
  p_name text, p_description text, p_address text, p_district text, p_phone text, p_email text,
  p_category_ids uuid[] default '{}'
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_slug text; v_pending int;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;
  select count(*) into v_pending from public.restaurants where owner_id = auth.uid() and status = 'pending';
  if v_pending >= 3 then
    raise exception 'Ya tienes solicitudes pendientes de revisión';
  end if;
  v_slug := trim(both '-' from regexp_replace(lower(translate(p_name,
    'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')), '[^a-z0-9]+', '-', 'g'));
  v_slug := left(v_slug, 60) || '-' || substr(md5(random()::text), 1, 5);
  insert into public.restaurants (slug, name, description, address, district, phone, email, status, owner_id)
    values (v_slug, left(trim(p_name), 100), left(coalesce(p_description, ''), 600), left(p_address, 200),
            left(coalesce(p_district, ''), 80), left(p_phone, 20), left(p_email, 120), 'pending', auth.uid())
    returning id into v_id;
  insert into public.restaurant_categories (restaurant_id, category_id)
    select v_id, c from unnest(p_category_ids) c where exists (select 1 from public.categories where id = c);
  return v_id;
end $$;
grant execute on function public.submit_restaurant_application(text, text, text, text, text, text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Gestión de clientes (admin)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_customer_status(p_user_id uuid, p_status public.account_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'No puedes cambiar el estado de tu propia cuenta'; end if;
  if exists (select 1 from public.profiles where id = p_user_id and role = 'admin') then
    raise exception 'No se puede suspender a un administrador desde el panel';
  end if;
  update public.profiles set status = p_status where id = p_user_id;
  perform public.log_admin_action('customer_status', 'profiles', p_user_id::text, jsonb_build_object('status', p_status));
end $$;
grant execute on function public.admin_set_customer_status(uuid, public.account_status) to authenticated;

create or replace function public.admin_update_customer(p_user_id uuid, p_full_name text, p_phone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  update public.profiles set full_name = left(trim(p_full_name), 120), phone = nullif(trim(p_phone), '')
    where id = p_user_id;
  perform public.log_admin_action('customer_update', 'profiles', p_user_id::text,
    jsonb_build_object('full_name', p_full_name, 'phone', p_phone));
end $$;
grant execute on function public.admin_update_customer(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Estadísticas (admin)
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select jsonb_build_object(
    'total_sales', coalesce(sum(total) filter (where status = 'delivered'), 0),
    'orders_total', count(*),
    'orders_pending', count(*) filter (where status not in ('delivered', 'cancelled')),
    'orders_completed', count(*) filter (where status = 'delivered'),
    'orders_cancelled', count(*) filter (where status = 'cancelled'),
    'commissions', coalesce(sum(commission_amount) filter (where status = 'delivered'), 0),
    'delivery_fees', coalesce(sum(delivery_fee) filter (where status = 'delivered'), 0),
    'revenue', coalesce(sum(commission_amount + service_fee) filter (where status = 'delivered'), 0),
    'avg_ticket', coalesce(round(avg(total) filter (where status = 'delivered'), 2), 0)
  ) into v from public.orders;

  v := v || jsonb_build_object(
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'restaurants', (select count(*) from public.restaurants where status = 'approved'),
    'restaurants_pending', (select count(*) from public.restaurants where status = 'pending'),
    'couriers_active', (select count(*) from public.couriers where status = 'active'),
    'payments_to_verify', (select count(*) from public.payments where status = 'pending_verification'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(d, 'DD/MM'), 'sales', coalesce(s.sales, 0), 'orders', coalesce(s.orders, 0)) order by d), '[]')
      from generate_series((now() at time zone 'America/Lima')::date - 29, (now() at time zone 'America/Lima')::date, interval '1 day') d
      left join (
        select (created_at at time zone 'America/Lima')::date as day,
               sum(total) filter (where status <> 'cancelled') as sales, count(*) as orders
        from public.orders where created_at > now() - interval '31 days' group by 1
      ) s on s.day = d::date
    ),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', 'Sem ' || to_char(w, 'DD/MM'), 'sales', coalesce(s.sales, 0), 'orders', coalesce(s.orders, 0)) order by w), '[]')
      from generate_series(date_trunc('week', (now() at time zone 'America/Lima')) - interval '11 weeks',
                           date_trunc('week', (now() at time zone 'America/Lima')), interval '1 week') w
      left join (
        select date_trunc('week', created_at at time zone 'America/Lima') as wk,
               sum(total) filter (where status <> 'cancelled') as sales, count(*) as orders
        from public.orders where created_at > now() - interval '13 weeks' group by 1
      ) s on s.wk = w
    ),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(m, 'MM/YYYY'), 'sales', coalesce(s.sales, 0), 'orders', coalesce(s.orders, 0)) order by m), '[]')
      from generate_series(date_trunc('month', (now() at time zone 'America/Lima')) - interval '11 months',
                           date_trunc('month', (now() at time zone 'America/Lima')), interval '1 month') m
      left join (
        select date_trunc('month', created_at at time zone 'America/Lima') as mo,
               sum(total) filter (where status <> 'cancelled') as sales, count(*) as orders
        from public.orders where created_at > now() - interval '13 months' group by 1
      ) s on s.mo = m
    ),
    'by_payment', (
      select coalesce(jsonb_agg(jsonb_build_object('method', payment_method, 'orders', n, 'sales', t)), '[]')
      from (select payment_method, count(*) n, sum(total) t from public.orders where status <> 'cancelled' group by 1) x
    )
  );
  return v;
end $$;
grant execute on function public.admin_dashboard_stats() to authenticated;

create or replace function public.admin_restaurant_sales()
returns table (restaurant_id uuid, orders bigint, delivered bigint, sales numeric, commission numeric, last_order_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
    select o.restaurant_id, count(*), count(*) filter (where o.status = 'delivered'),
           coalesce(sum(o.total) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.commission_amount) filter (where o.status = 'delivered'), 0),
           max(o.created_at)
    from public.orders o group by o.restaurant_id;
end $$;
grant execute on function public.admin_restaurant_sales() to authenticated;

create or replace function public.admin_courier_stats()
returns table (courier_id uuid, deliveries bigint, active_orders bigint, earnings numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  -- Ganancia estimada del repartidor: tarifa de envío de los pedidos entregados
  return query
    select o.courier_id, count(*) filter (where o.status = 'delivered'),
           count(*) filter (where o.status in ('courier_assigned', 'picked_up', 'on_the_way')),
           coalesce(sum(o.delivery_fee) filter (where o.status = 'delivered'), 0)
    from public.orders o where o.courier_id is not null group by o.courier_id;
end $$;
grant execute on function public.admin_courier_stats() to authenticated;

-- Eliminar los datos de demostración sin tocar operaciones reales
create or replace function public.admin_purge_demo_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_products int; v_restaurants int; v_coupons int; v_suspended int;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  delete from public.coupons where is_demo and not exists (select 1 from public.coupon_usages cu where cu.coupon_id = coupons.id);
  get diagnostics v_coupons = row_count;
  -- Restaurantes demo con pedidos reales se suspenden (los pedidos se conservan)
  update public.restaurants set status = 'suspended'
    where is_demo and exists (select 1 from public.orders o where o.restaurant_id = restaurants.id);
  get diagnostics v_suspended = row_count;
  delete from public.products p where p.is_demo
    and not exists (select 1 from public.orders o where o.restaurant_id = p.restaurant_id);
  get diagnostics v_products = row_count;
  delete from public.restaurants r where r.is_demo
    and not exists (select 1 from public.orders o where o.restaurant_id = r.id);
  get diagnostics v_restaurants = row_count;
  perform public.log_admin_action('purge_demo_data', 'system', null,
    jsonb_build_object('products', v_products, 'restaurants', v_restaurants, 'coupons', v_coupons, 'suspended', v_suspended));
  return jsonb_build_object('products', v_products, 'restaurants', v_restaurants, 'coupons', v_coupons, 'suspended', v_suspended);
end $$;
grant execute on function public.admin_purge_demo_data() to authenticated;

-- Las funciones internas no deben ser invocables desde la API
revoke all on function public.order_status_before() from public, anon, authenticated;
revoke all on function public.order_status_after() from public, anon, authenticated;
revoke all on function public.audit_admin_change() from public, anon, authenticated;
revoke all on function public.refresh_restaurant_rating() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_profile_update() from public, anon, authenticated;
