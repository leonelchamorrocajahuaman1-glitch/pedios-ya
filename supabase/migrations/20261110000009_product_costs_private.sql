-- =============================================================================
-- MULTIPRODUCTOS HUAYTALLA · El precio de compra (costo) deja de ser público
--
-- products.cost_price era legible por cualquiera mediante la API (RLS filtra
-- filas, no columnas). No se pueden usar privilegios por columna porque las
-- columnas calculadas final_price(products) necesitan la fila completa.
-- Solución: mover el costo a product_costs, visible solo para administradores.
-- Esta migración es ADITIVA. La columna antigua se elimina en la 010
-- (requiere autorización explícita por ser un cambio destructivo).
-- =============================================================================

create table public.product_costs (
  product_id uuid primary key references public.products (id) on delete cascade,
  cost_price numeric(10,2) not null check (cost_price >= 0),
  updated_at timestamptz not null default now()
);
alter table public.product_costs enable row level security;
create policy "product_costs: solo admin" on public.product_costs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.product_costs from anon;
grant select, insert, update, delete on public.product_costs to authenticated;

insert into public.product_costs (product_id, cost_price)
select id, cost_price from public.products where cost_price is not null
on conflict (product_id) do nothing;

create trigger audit_product_costs after insert or update or delete on public.product_costs
  for each row execute function public.audit_admin_change();

-- Costo de cada venta: también privado (order_items es legible por el cliente dueño del pedido)
create table public.order_item_costs (
  order_item_id uuid primary key references public.order_items (id) on delete cascade,
  unit_cost numeric(10,2) not null check (unit_cost >= 0)
);
alter table public.order_item_costs enable row level security;
create policy "order_item_costs: solo admin" on public.order_item_costs for select to authenticated using (public.is_admin());
revoke all on public.order_item_costs from anon;
grant select on public.order_item_costs to authenticated;
insert into public.order_item_costs (order_item_id, unit_cost)
select id, unit_cost from public.order_items where unit_cost is not null
on conflict (order_item_id) do nothing;

-- El cálculo del carrito toma el costo de la nueva tabla (solo para reportes de ganancia)
create or replace function public._store_price_cart(
  p_items jsonb, p_coupon_code text, p_fulfillment text, p_district text, p_user_id uuid, p_lock boolean
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  s public.store_settings;
  v_req jsonb := '{}'::jsonb;
  v_item jsonb;
  v_qty int;
  v_prod public.products;
  v_unit numeric(10,2);
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric(10,2) := 0;
  v_count int := 0;
  v_fee numeric(10,2) := 0;
  v_min numeric(10,2);
  v_zone public.delivery_zones;
  v_promo public.promotions;
  v_promo_amount numeric(10,2) := 0;
  v_coupon public.coupons;
  v_coupon_amount numeric(10,2) := 0;
  v_uses int;
  v_key text;
begin
  select * into s from public.store_settings where id = 1;
  if p_fulfillment not in ('delivery', 'pickup') then
    raise exception 'Modalidad de entrega inválida' using hint = 'INVALID_FULFILLMENT';
  end if;
  if p_fulfillment = 'delivery' and not s.delivery_enabled then
    raise exception 'El delivery no está disponible en este momento' using hint = 'DELIVERY_DISABLED';
  end if;
  if p_fulfillment = 'pickup' and not s.pickup_enabled then
    raise exception 'El recojo en tienda no está disponible' using hint = 'PICKUP_DISABLED';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Tu carrito está vacío' using hint = 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 60 then
    raise exception 'Demasiados productos en un solo pedido' using hint = 'TOO_MANY_ITEMS';
  end if;

  -- Agrupar cantidades por producto
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Cantidad inválida' using hint = 'INVALID_QUANTITY';
    end if;
    v_key := (v_item ->> 'product_id')::uuid::text;
    v_req := jsonb_set(v_req, array[v_key], to_jsonb(coalesce((v_req ->> v_key)::int, 0) + v_qty));
  end loop;

  -- Bloqueo ordenado por id (evita interbloqueos) solo cuando se va a comprar:
  -- dos clientes que compran la última unidad quedan en fila y el segundo ve el stock real.
  if p_lock then
    perform 1 from public.products
      where id in (select k::uuid from jsonb_object_keys(v_req) k)
      order by id
      for update;
  end if;

  for v_item in select jsonb_build_object('id', key, 'qty', value) from jsonb_each(v_req) loop
    select * into v_prod from public.products where id = (v_item ->> 'id')::uuid;
    v_qty := (v_item ->> 'qty')::int;
    if not found or v_prod.catalog <> 'store' then
      raise exception 'Un producto de tu carrito ya no existe' using hint = 'PRODUCT_NOT_FOUND';
    end if;
    if not v_prod.is_available then
      raise exception '«%» ya no está disponible', v_prod.name using hint = 'PRODUCT_UNAVAILABLE';
    end if;
    if v_prod.stock < v_qty then
      raise exception 'Solo quedan % unidades de «%»', v_prod.stock, v_prod.name using hint = 'OUT_OF_STOCK';
    end if;
    v_unit := public.final_price(v_prod);
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id, 'product_name', v_prod.name, 'product_image', v_prod.image_url,
      'sku', v_prod.sku, 'unit_price', v_unit, 'original_price', v_prod.price, 'unit_cost', (select pc.cost_price from public.product_costs pc where pc.product_id = v_prod.id),
      'quantity', v_qty, 'line_total', v_unit * v_qty, 'stock', v_prod.stock);
    v_subtotal := v_subtotal + v_unit * v_qty;
    v_count := v_count + v_qty;
  end loop;

  -- Delivery: zona por distrito (si existe) o tarifa general
  v_min := s.min_order_amount;
  if p_fulfillment = 'delivery' then
    v_fee := s.delivery_fee;
    if nullif(trim(p_district), '') is not null then
      select * into v_zone from public.delivery_zones z
        where z.is_active and exists (select 1 from unnest(z.districts) d where lower(trim(d)) = lower(trim(p_district)))
        order by z.sort_order limit 1;
      if found then
        v_fee := v_zone.fee;
        v_min := coalesce(v_zone.min_order_amount, v_min);
      end if;
    end if;
    if s.free_delivery_threshold is not null and v_subtotal >= s.free_delivery_threshold then
      v_fee := 0;
    end if;
  end if;
  if v_subtotal < v_min then
    raise exception 'La compra mínima es de S/ %', to_char(v_min, 'FM999990.00') using hint = 'MIN_ORDER';
  end if;

  -- Promoción automática sobre el total (la de mayor beneficio)
  select * into v_promo from public.promotions pr
    where pr.scope = 'order' and pr.is_active and pr.starts_at <= now() and (pr.ends_at is null or pr.ends_at > now())
      and v_subtotal >= pr.min_order_amount and (pr.usage_limit is null or pr.usage_count < pr.usage_limit)
    order by case pr.discount_type when 'percentage' then v_subtotal * pr.discount_value / 100 else pr.discount_value end desc
    limit 1;
  if found then
    v_promo_amount := least(v_subtotal, case v_promo.discount_type
      when 'percentage' then round(v_subtotal * v_promo.discount_value / 100, 2) else v_promo.discount_value end);
    if v_promo.max_discount is not null then v_promo_amount := least(v_promo_amount, v_promo.max_discount); end if;
  end if;

  -- Cupón
  if nullif(trim(p_coupon_code), '') is not null then
    select * into v_coupon from public.coupons
      where code = upper(trim(p_coupon_code)) and catalog = 'store';
    if not found or not v_coupon.is_active then
      raise exception 'El cupón no existe o no está activo' using hint = 'COUPON_INVALID';
    end if;
    if v_coupon.starts_at > now() or (v_coupon.expires_at is not null and v_coupon.expires_at <= now()) then
      raise exception 'El cupón no está vigente' using hint = 'COUPON_EXPIRED';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then
      raise exception 'El cupón alcanzó su límite de usos' using hint = 'COUPON_EXHAUSTED';
    end if;
    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'El cupón requiere una compra mínima de S/ %', to_char(v_coupon.min_order_amount, 'FM999990.00')
        using hint = 'COUPON_MIN_ORDER';
    end if;
    if p_user_id is not null then
      select count(*) into v_uses from public.coupon_usages cu join public.orders o on o.id = cu.order_id
        where cu.coupon_id = v_coupon.id and cu.user_id = p_user_id and o.status <> 'cancelled';
      if v_uses >= v_coupon.per_user_limit then
        raise exception 'Ya usaste este cupón el máximo de veces permitido' using hint = 'COUPON_USER_LIMIT';
      end if;
    end if;
    if v_coupon.discount_type = 'free_delivery' and p_fulfillment = 'pickup' then
      raise exception 'Este cupón solo aplica para delivery' using hint = 'COUPON_DELIVERY_ONLY';
    end if;
    v_coupon_amount := case v_coupon.discount_type
      when 'percentage' then round((v_subtotal - v_promo_amount) * v_coupon.discount_value / 100, 2)
      when 'fixed' then least(v_coupon.discount_value, v_subtotal - v_promo_amount)
      when 'free_delivery' then v_fee
    end;
    if v_coupon.max_discount is not null then v_coupon_amount := least(v_coupon_amount, v_coupon.max_discount); end if;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'items_count', v_count,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'promotion_id', v_promo.id,
    'promotion_name', v_promo.name,
    'promotion_discount', v_promo_amount,
    'coupon_id', v_coupon.id,
    'coupon_code', v_coupon.code,
    'coupon_discount', v_coupon_amount,
    'discount', v_promo_amount + v_coupon_amount,
    'total', greatest(0, v_subtotal - v_promo_amount - v_coupon_amount + v_fee),
    'min_order_amount', v_min,
    'fulfillment', p_fulfillment
  );
end $$;
revoke all on function public._store_price_cart(jsonb, text, text, text, uuid, boolean) from public, anon, authenticated;

-- La cotización pública ya no devuelve costos
create or replace function public.store_quote(
  p_items jsonb, p_coupon_code text default null, p_fulfillment text default 'delivery', p_address_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_district text; v jsonb;
begin
  if p_address_id is not null then
    select district into v_district from public.addresses where id = p_address_id and user_id = auth.uid();
  end if;
  v := public._store_price_cart(p_items, p_coupon_code, coalesce(p_fulfillment, 'delivery'), v_district, auth.uid(), false);
  return jsonb_set(v, '{lines}', (select coalesce(jsonb_agg(l - 'unit_cost'), '[]'::jsonb) from jsonb_array_elements(v -> 'lines') l));
end $$;
grant execute on function public.store_quote(jsonb, text, text, uuid) to anon, authenticated;

-- El pedido guarda el costo en la tabla privada (order_items.unit_cost queda vacío)
create or replace function public.store_place_order(
  p_items jsonb,
  p_fulfillment text,
  p_payment_method public.payment_method,
  p_idempotency_key uuid,
  p_customer_name text,
  p_contact_phone text,
  p_address_id uuid default null,
  p_reference text default null,
  p_coupon_code text default null,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_item_id uuid;
  v_uid uuid := auth.uid();
  v_existing uuid;
  s public.store_settings;
  v_pm public.payment_methods;
  v_addr public.addresses;
  v_q jsonb;
  v_line jsonb;
  v_order_id uuid := gen_random_uuid();
  v_rows int;
begin
  if v_uid is null then
    raise exception 'Inicia sesión para comprar' using errcode = '42501', hint = 'AUTH_REQUIRED';
  end if;
  if not public.is_active_user() then
    raise exception 'Tu cuenta está suspendida' using errcode = '42501', hint = 'ACCOUNT_SUSPENDED';
  end if;
  if p_idempotency_key is null then
    raise exception 'Falta la clave de idempotencia' using hint = 'IDEMPOTENCY_REQUIRED';
  end if;

  -- Un pedido por clave: doble clic o reintento devuelven el mismo pedido
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 42));
  select id into v_existing from public.orders where user_id = v_uid and idempotency_key = p_idempotency_key;
  if v_existing is not null then return v_existing; end if;

  select * into s from public.store_settings where id = 1;
  if not s.accepting_orders then
    raise exception 'La tienda no está recibiendo pedidos en este momento' using hint = 'STORE_CLOSED';
  end if;

  if char_length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Ingresa tu nombre' using hint = 'NAME_REQUIRED';
  end if;
  if coalesce(p_contact_phone, '') !~ '^\+?[0-9 ]{6,20}$' then
    raise exception 'Ingresa un teléfono válido' using hint = 'PHONE_REQUIRED';
  end if;

  select * into v_pm from public.payment_methods where code = p_payment_method;
  if not found or not v_pm.is_enabled or p_payment_method = 'card' then
    raise exception 'El método de pago no está disponible' using hint = 'PAYMENT_METHOD_DISABLED';
  end if;
  if p_payment_method in ('yape', 'plin') and v_pm.phone_number is null then
    raise exception 'El negocio aún no configuró su número de %', v_pm.name using hint = 'PAYMENT_NOT_CONFIGURED';
  end if;

  if p_fulfillment = 'delivery' then
    select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
    if not found then
      raise exception 'Selecciona una dirección de entrega' using hint = 'ADDRESS_REQUIRED';
    end if;
  end if;

  v_q := public._store_price_cart(p_items, p_coupon_code, p_fulfillment, v_addr.district, v_uid, true);

  insert into public.orders (
    id, code, catalog, user_id, restaurant_id, address_id, fulfillment, customer_name,
    delivery_address, delivery_district, delivery_reference, delivery_lat, delivery_lng,
    contact_phone, notes, payment_method, payment_status,
    subtotal, delivery_fee, service_fee, discount, promotion_discount, coupon_discount, total,
    commission_rate, commission_amount, coupon_id, promotion_id, idempotency_key
  ) values (
    v_order_id, 'HU-' || nextval('public.order_code_seq'), 'store', v_uid, null, v_addr.id, p_fulfillment,
    left(trim(p_customer_name), 120),
    case when p_fulfillment = 'delivery' then v_addr.street else 'Recojo en tienda' end,
    case when p_fulfillment = 'delivery' then v_addr.district else '' end,
    case when p_fulfillment = 'delivery' then coalesce(nullif(left(trim(p_reference), 250), ''), v_addr.reference) end,
    v_addr.lat, v_addr.lng,
    trim(p_contact_phone), nullif(left(trim(p_notes), 300), ''),
    p_payment_method, 'pending',
    (v_q ->> 'subtotal')::numeric, (v_q ->> 'delivery_fee')::numeric, 0,
    (v_q ->> 'discount')::numeric, (v_q ->> 'promotion_discount')::numeric, (v_q ->> 'coupon_discount')::numeric,
    (v_q ->> 'total')::numeric, 0, 0,
    (v_q ->> 'coupon_id')::uuid, (v_q ->> 'promotion_id')::uuid, p_idempotency_key
  );

  for v_line in select * from jsonb_array_elements(v_q -> 'lines') loop
    insert into public.order_items (order_id, product_id, product_name, product_image, sku, unit_price,
      original_price, unit_cost, quantity, line_total)
    values (v_order_id, (v_line ->> 'product_id')::uuid, v_line ->> 'product_name', v_line ->> 'product_image',
      v_line ->> 'sku', (v_line ->> 'unit_price')::numeric, (v_line ->> 'original_price')::numeric,
      null, (v_line ->> 'quantity')::int, (v_line ->> 'line_total')::numeric)
    returning id into v_item_id;
    if v_line ->> 'unit_cost' is not null then
      insert into public.order_item_costs (order_item_id, unit_cost) values (v_item_id, (v_line ->> 'unit_cost')::numeric);
    end if;
  end loop;

  -- Descuento de stock (filas ya bloqueadas) con registro en inventario
  perform set_config('app.stock_type', 'sale', true);
  perform set_config('app.stock_reason', 'Venta', true);
  perform set_config('app.stock_order', v_order_id::text, true);
  update public.products p
    set stock = p.stock - (l.value ->> 'quantity')::int
    from jsonb_array_elements(v_q -> 'lines') as l(value)
    where p.id = (l.value ->> 'product_id')::uuid and p.stock >= (l.value ->> 'quantity')::int;
  get diagnostics v_rows = row_count;
  if v_rows <> jsonb_array_length(v_q -> 'lines') then
    raise exception 'Stock insuficiente, actualiza tu carrito' using hint = 'OUT_OF_STOCK';
  end if;
  perform set_config('app.stock_type', '', true);
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order', '', true);

  if v_q ->> 'coupon_id' is not null then
    update public.coupons set usage_count = usage_count + 1
      where id = (v_q ->> 'coupon_id')::uuid and (usage_limit is null or usage_count < usage_limit);
    get diagnostics v_rows = row_count;
    if v_rows = 0 then raise exception 'El cupón alcanzó su límite de usos' using hint = 'COUPON_EXHAUSTED'; end if;
    insert into public.coupon_usages (coupon_id, user_id, order_id, discount_amount)
      values ((v_q ->> 'coupon_id')::uuid, v_uid, v_order_id, (v_q ->> 'coupon_discount')::numeric);
  end if;
  if v_q ->> 'promotion_id' is not null then
    update public.promotions set usage_count = usage_count + 1 where id = (v_q ->> 'promotion_id')::uuid;
  end if;

  -- El pago SIEMPRE nace pendiente: solo el administrador (o una pasarela futura) lo confirma
  insert into public.payments (order_id, method, provider, amount, status)
    values (v_order_id, p_payment_method, p_payment_method::text, (v_q ->> 'total')::numeric, 'pending');

  return v_order_id;
end $$;
revoke all on function public.store_place_order(jsonb, text, public.payment_method, uuid, text, text, uuid, text, text, text) from public, anon;
grant execute on function public.store_place_order(jsonb, text, public.payment_method, uuid, text, text, uuid, text, text, text) to authenticated;

-- Reportes: costo desde la tabla privada (con respaldo en la columna anterior)
create or replace function public.admin_store_dashboard()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v jsonb;
  v_today date := (now() at time zone 'America/Lima')::date;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;

  with o as (
    select *, (coalesce(delivered_at, created_at) at time zone 'America/Lima')::date as day
    from public.orders where catalog = 'store'
  )
  select jsonb_build_object(
    'sales_today', coalesce(sum(total) filter (where status = 'delivered' and day = v_today), 0),
    'sales_yesterday', coalesce(sum(total) filter (where status = 'delivered' and day = v_today - 1), 0),
    'sales_week', coalesce(sum(total) filter (where status = 'delivered' and day >= date_trunc('week', v_today)::date), 0),
    'sales_month', coalesce(sum(total) filter (where status = 'delivered' and day >= date_trunc('month', v_today)::date), 0),
    'revenue_total', coalesce(sum(total) filter (where status = 'delivered'), 0),
    'orders_today', count(*) filter (where (created_at at time zone 'America/Lima')::date = v_today),
    'orders_pending', count(*) filter (where status = 'received'),
    'orders_confirmed', count(*) filter (where status = 'accepted'),
    'orders_preparing', count(*) filter (where status = 'preparing'),
    'orders_ready', count(*) filter (where status = 'ready'),
    'orders_on_the_way', count(*) filter (where status = 'on_the_way'),
    'orders_delivered', count(*) filter (where status = 'delivered'),
    'orders_cancelled', count(*) filter (where status = 'cancelled'),
    'avg_ticket', coalesce(round(avg(total) filter (where status = 'delivered'), 2), 0)
  ) into v from o;

  v := v || jsonb_build_object(
    'gross_profit_total', (
      select coalesce(sum(oi.line_total - coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity), 0)
      from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.catalog = 'store' and o.status = 'delivered'),
    'products_available', (select count(*) from public.products where catalog = 'store' and is_available and stock > 0),
    'products_out_of_stock', (select count(*) from public.products where catalog = 'store' and is_available and stock = 0),
    'products_low_stock', (select count(*) from public.products where catalog = 'store' and is_available and stock > 0 and stock <= min_stock),
    'products_inactive', (select count(*) from public.products where catalog = 'store' and not is_available),
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'payments_to_verify', (select count(*) from public.payments p join public.orders o on o.id = p.order_id
                           where o.catalog = 'store' and p.status = 'pending_verification'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(d, 'DD/MM'), 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.n, 0)) order by d), '[]')
      from generate_series(v_today - 29, v_today, interval '1 day') d
      left join (select (delivered_at at time zone 'America/Lima')::date dd, sum(total) sales, count(*) n
                 from public.orders where catalog = 'store' and status = 'delivered' group by 1) x on x.dd = d::date),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', 'Sem ' || to_char(w, 'DD/MM'), 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.n, 0)) order by w), '[]')
      from generate_series(date_trunc('week', v_today::timestamp) - interval '11 weeks', date_trunc('week', v_today::timestamp), interval '1 week') w
      left join (select date_trunc('week', delivered_at at time zone 'America/Lima') wk, sum(total) sales, count(*) n
                 from public.orders where catalog = 'store' and status = 'delivered' group by 1) x on x.wk = w),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(m, 'MM/YYYY'), 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.n, 0),
                                                   'profit', coalesce(x.profit, 0)) order by m), '[]')
      from generate_series(date_trunc('month', v_today::timestamp) - interval '11 months', date_trunc('month', v_today::timestamp), interval '1 month') m
      left join (select date_trunc('month', o.delivered_at at time zone 'America/Lima') mo, sum(oi.line_total) sales,
                        count(distinct o.id) n, sum(oi.line_total - coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity) profit
                 from public.orders o join public.order_items oi on oi.order_id = o.id
                 where o.catalog = 'store' and o.status = 'delivered' group by 1) x on x.mo = m),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.qty desc), '[]') from (
        select oi.product_name as name, sum(oi.quantity) qty, sum(oi.line_total) revenue
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where o.catalog = 'store' and o.status = 'delivered'
        group by oi.product_name order by 2 desc limit 8) t),
    'top_categories', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]') from (
        select c.name, sum(oi.quantity) qty, sum(oi.line_total) revenue
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.products p on p.id = oi.product_id
        join public.categories c on c.id = p.category_id
        where o.catalog = 'store' and o.status = 'delivered'
        group by c.name order by 3 desc limit 8) t)
  );
  return v;
end $$;
grant execute on function public.admin_store_dashboard() to authenticated;
revoke execute on function public.admin_store_dashboard() from anon, public;

create or replace function public.admin_sales_report(p_from date, p_to date, p_group text default 'day')
returns table (period text, period_start date, orders bigint, items bigint, subtotal numeric, discounts numeric,
               delivery numeric, revenue numeric, cost numeric, profit numeric, cancelled bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_group not in ('day', 'week', 'month') then raise exception 'Agrupación inválida'; end if;
  if p_to < p_from or p_to - p_from > 800 then raise exception 'Rango de fechas inválido'; end if;
  return query
    with o as (
      select o.*, date_trunc(p_group, (coalesce(o.delivered_at, o.created_at) at time zone 'America/Lima'))::date as ps
      from public.orders o
      where o.catalog = 'store'
        and (coalesce(o.delivered_at, o.created_at) at time zone 'America/Lima')::date between p_from and p_to
    ), items as (
      select oi.order_id, sum(oi.quantity) q, sum(coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity) c
      from public.order_items oi join o on o.id = oi.order_id group by oi.order_id
    )
    select case p_group when 'day' then to_char(o.ps, 'DD/MM/YYYY') when 'week' then 'Semana del ' || to_char(o.ps, 'DD/MM/YYYY')
                else to_char(o.ps, 'MM/YYYY') end,
           o.ps,
           count(*) filter (where o.status = 'delivered'),
           coalesce(sum(i.q) filter (where o.status = 'delivered'), 0)::bigint,
           coalesce(sum(o.subtotal) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.discount) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.delivery_fee) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.total) filter (where o.status = 'delivered'), 0),
           coalesce(sum(i.c) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.subtotal - o.discount - i.c) filter (where o.status = 'delivered'), 0),
           count(*) filter (where o.status = 'cancelled')
    from o left join items i on i.order_id = o.id
    group by o.ps order by o.ps;
end $$;
grant execute on function public.admin_sales_report(date, date, text) to authenticated;
revoke execute on function public.admin_sales_report(date, date, text) from anon, public;

create or replace function public.admin_product_sales(p_from date, p_to date)
returns table (product_id uuid, name text, sku text, category text, stock int, qty bigint, revenue numeric, profit numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
    select p.id, p.name, p.sku, c.name, p.stock,
           coalesce(sum(oi.quantity), 0)::bigint,
           coalesce(sum(oi.line_total), 0),
           coalesce(sum(oi.line_total - coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity), 0)
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join public.order_items oi on oi.product_id = p.id
      and exists (select 1 from public.orders o where o.id = oi.order_id and o.catalog = 'store' and o.status = 'delivered'
                  and (o.delivered_at at time zone 'America/Lima')::date between p_from and p_to)
    where p.catalog = 'store'
    group by p.id, p.name, p.sku, c.name, p.stock
    order by 6 desc, 2;
end $$;
grant execute on function public.admin_product_sales(date, date) to authenticated;
revoke execute on function public.admin_product_sales(date, date) from anon, public;
