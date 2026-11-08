-- =============================================================================
-- MULTIPRODUCTOS HUAYTALLA · Núcleo del minimarket (migración ADITIVA)
--
-- No borra ni modifica datos del modelo marketplace: agrega tablas, columnas,
-- políticas y funciones nuevas. Mientras la app anterior siga en producción,
-- el catálogo del minimarket (catalog = 'store') solo es visible para la app
-- nueva, que envía la cabecera "x-app: huaytalla". Esa condición es solo de
-- aislamiento visual durante la transición (no es un control de seguridad: el
-- catálogo es público) y se retira en la migración de limpieza.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Aislamiento temporal entre la app anterior y la nueva
-- ---------------------------------------------------------------------------
create or replace function public.is_store_app()
returns boolean language sql stable set search_path = ''
as $$
  select coalesce((nullif(current_setting('request.headers', true), '')::json ->> 'x-app'), '') = 'huaytalla';
$$;

-- ---------------------------------------------------------------------------
-- Configuración del negocio
-- ---------------------------------------------------------------------------
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'MULTIPRODUCTOS HUAYTALLA' check (char_length(business_name) between 2 and 80),
  slogan text not null default 'Todo lo que necesitas, en un solo lugar' check (char_length(slogan) <= 120),
  logo_url text,
  phone text,
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9 ]{6,20}$'),
  email text,
  address text not null default '',
  district text not null default '',
  city text not null default 'Lima',
  lat double precision,
  lng double precision,
  -- [{"day":0..6, "open":"07:00", "close":"22:00", "closed":false}] (0 = domingo)
  opening_hours jsonb not null default '[
    {"day":1,"open":"07:00","close":"22:00","closed":false},
    {"day":2,"open":"07:00","close":"22:00","closed":false},
    {"day":3,"open":"07:00","close":"22:00","closed":false},
    {"day":4,"open":"07:00","close":"22:00","closed":false},
    {"day":5,"open":"07:00","close":"22:00","closed":false},
    {"day":6,"open":"07:00","close":"22:00","closed":false},
    {"day":0,"open":"08:00","close":"20:00","closed":false}]'::jsonb check (jsonb_typeof(opening_hours) = 'array'),
  accepting_orders boolean not null default true,
  delivery_enabled boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_fee numeric(10,2) not null default 5.00 check (delivery_fee >= 0),
  free_delivery_threshold numeric(10,2) check (free_delivery_threshold is null or free_delivery_threshold > 0),
  min_order_amount numeric(10,2) not null default 20.00 check (min_order_amount >= 0),
  delivery_eta text not null default '30 a 60 minutos' check (char_length(delivery_eta) <= 60),
  welcome_message text not null default '',
  checkout_message text not null default '',
  order_confirmation_message text not null default '¡Gracias por tu compra! Te avisaremos cada vez que tu pedido avance.',
  support_message text not null default '',
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  low_stock_default int not null default 5 check (low_stock_default >= 0),
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id, free_delivery_threshold) values (1, 80.00) on conflict do nothing;
create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- Métodos de pago (preparado para pasarelas futuras: card queda deshabilitado)
create table public.payment_methods (
  code public.payment_method primary key,
  name text not null,
  is_enabled boolean not null default false,
  account_holder text,
  phone_number text check (phone_number is null or phone_number ~ '^\+?[0-9 ]{6,20}$'),
  qr_image_url text,
  instructions text not null default '',
  requires_proof boolean not null default false,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.payment_methods (code, name, is_enabled, requires_proof, sort_order, instructions) values
  ('cash', 'Efectivo', true, false, 1, 'Paga en efectivo al recibir tu pedido o al recogerlo en tienda.'),
  ('yape', 'Yape', true, true, 2, 'Yapea el monto exacto y adjunta la captura del comprobante.'),
  ('plin', 'Plin', true, true, 3, 'Transfiere por Plin el monto exacto y adjunta la captura del comprobante.'),
  ('card', 'Tarjeta (próximamente)', false, false, 4, 'Pasarela de pago no configurada.')
on conflict (code) do nothing;
create trigger payment_methods_updated_at before update on public.payment_methods
  for each row execute function public.set_updated_at();

-- Zonas de reparto (preparado: si hay zonas activas se usan; si no, tarifa general)
create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  districts text[] not null default '{}',
  fee numeric(10,2) not null check (fee >= 0),
  min_order_amount numeric(10,2) check (min_order_amount is null or min_order_amount >= 0),
  eta text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Catálogo: categorías y productos (columnas nuevas, sin tocar las existentes)
-- ---------------------------------------------------------------------------
alter table public.categories
  add column catalog text not null default 'marketplace' check (catalog in ('marketplace', 'store')),
  add column parent_id uuid references public.categories (id) on delete cascade,
  add column description text not null default '' check (char_length(description) <= 300),
  add column is_demo boolean not null default false;
alter table public.categories drop constraint if exists categories_slug_key;
create unique index categories_catalog_slug_idx on public.categories (catalog, slug);
create index categories_parent_idx on public.categories (parent_id);

alter table public.products alter column restaurant_id drop not null;
alter table public.products
  add column catalog text not null default 'marketplace' check (catalog in ('marketplace', 'store')),
  add column slug text,
  add column brand text check (brand is null or char_length(brand) <= 80),
  add column sku text check (sku is null or sku ~ '^[A-Za-z0-9._-]{2,40}$'),
  add column barcode text check (barcode is null or barcode ~ '^[0-9]{6,14}$'),
  add column subcategory_id uuid references public.categories (id) on delete set null,
  add column cost_price numeric(10,2) check (cost_price is null or cost_price >= 0),
  add column min_stock int not null default 5 check (min_stock >= 0),
  add column weight numeric(10,3) check (weight is null or weight > 0),
  add column unit text not null default 'unidad'
    check (unit in ('unidad', 'kg', 'g', 'l', 'ml', 'paquete', 'caja', 'docena', 'bolsa', 'lata', 'botella', 'six pack')),
  add column is_featured boolean not null default false,
  add column image_credit text;
alter table public.products add constraint products_store_shape
  check (catalog <> 'store' or (restaurant_id is null and stock is not null and slug is not null));
create unique index products_slug_idx on public.products (slug) where slug is not null;
create unique index products_sku_idx on public.products (sku) where sku is not null;
create unique index products_barcode_idx on public.products (barcode) where barcode is not null;
create index products_catalog_idx on public.products (catalog, is_available);
create index products_subcategory_idx on public.products (subcategory_id);
create index products_created_idx on public.products (created_at desc);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Inventario
-- ---------------------------------------------------------------------------
create table public.inventory_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('in', 'out', 'adjustment', 'sale', 'sale_cancel')),
  quantity int not null,             -- variación con signo (+ entra, − sale)
  stock_before int,
  stock_after int,
  reason text check (reason is null or char_length(reason) <= 200),
  order_id uuid references public.orders (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);

-- Todo cambio de stock de un producto del minimarket queda registrado.
-- Las funciones indican el tipo/motivo con set_config('app.stock_*', ..., true).
create or replace function public.log_stock_movement()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_type text;
  v_reason text;
  v_order uuid;
begin
  if new.catalog <> 'store' then return null; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.stock, 0) > 0 then
      insert into public.inventory_movements (product_id, type, quantity, stock_before, stock_after, reason, created_by)
      values (new.id, 'in', new.stock, 0, new.stock, 'Stock inicial', auth.uid());
    end if;
    return null;
  end if;
  if new.stock is not distinct from old.stock then return null; end if;
  v_type := coalesce(nullif(current_setting('app.stock_type', true), ''), 'adjustment');
  v_reason := nullif(current_setting('app.stock_reason', true), '');
  v_order := nullif(current_setting('app.stock_order', true), '')::uuid;
  insert into public.inventory_movements (product_id, type, quantity, stock_before, stock_after, reason, order_id, created_by)
  values (new.id, v_type, coalesce(new.stock, 0) - coalesce(old.stock, 0), old.stock, new.stock,
          coalesce(v_reason, case when v_type = 'adjustment' then 'Edición directa del producto' end),
          v_order, auth.uid());
  return null;
end $$;
create trigger products_stock_movement after insert or update of stock on public.products
  for each row execute function public.log_stock_movement();

-- ---------------------------------------------------------------------------
-- Promociones y cupones
-- ---------------------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  -- product/category: rebaja el precio del producto; order: descuento al total del carrito
  scope text not null check (scope in ('product', 'category', 'order')),
  product_id uuid references public.products (id) on delete cascade,
  category_id uuid references public.categories (id) on delete cascade,
  min_order_amount numeric(10,2) not null default 0 check (min_order_amount >= 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  usage_count int not null default 0 check (usage_count >= 0),
  is_active boolean not null default true,
  show_on_home boolean not null default true,
  banner_image_url text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint promotions_percentage_range check (discount_type <> 'percentage' or discount_value <= 90),
  constraint promotions_dates check (ends_at is null or ends_at > starts_at),
  constraint promotions_scope_target check (
    (scope = 'product' and product_id is not null) or
    (scope = 'category' and category_id is not null) or
    (scope = 'order'))
);
create index promotions_active_idx on public.promotions (is_active, scope);
create index promotions_product_idx on public.promotions (product_id);
create index promotions_category_idx on public.promotions (category_id);

alter table public.coupons
  add column catalog text not null default 'marketplace' check (catalog in ('marketplace', 'store'));

-- ---------------------------------------------------------------------------
-- Pedidos y pagos (columnas nuevas)
-- ---------------------------------------------------------------------------
alter table public.orders alter column restaurant_id drop not null;
alter table public.orders alter column commission_rate set default 0;
alter table public.orders
  add column catalog text not null default 'marketplace' check (catalog in ('marketplace', 'store')),
  add column fulfillment text not null default 'delivery' check (fulfillment in ('delivery', 'pickup')),
  add column customer_name text check (customer_name is null or char_length(customer_name) between 2 and 120),
  add column delivery_person_name text check (delivery_person_name is null or char_length(delivery_person_name) <= 80),
  add column delivery_person_phone text check (delivery_person_phone is null or delivery_person_phone ~ '^\+?[0-9 ]{6,20}$'),
  add column promotion_id uuid references public.promotions (id) on delete set null,
  add column promotion_discount numeric(10,2) not null default 0 check (promotion_discount >= 0),
  add column coupon_discount numeric(10,2) not null default 0 check (coupon_discount >= 0);
create index orders_catalog_created_idx on public.orders (catalog, created_at desc);
create index orders_delivered_idx on public.orders (delivered_at) where status = 'delivered';

alter table public.order_items
  add column sku text,
  add column unit_cost numeric(10,2),
  add column original_price numeric(10,2);

alter table public.payments
  add column proof_path text,
  add column review_note text;

-- ---------------------------------------------------------------------------
-- RLS de las tablas nuevas y ajustes aditivos en las existentes
-- ---------------------------------------------------------------------------
alter table public.store_settings enable row level security;
alter table public.payment_methods enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.promotions enable row level security;

revoke insert, update, delete on public.store_settings, public.payment_methods, public.delivery_zones,
  public.product_images, public.promotions from anon;
revoke insert, update, delete on public.inventory_movements from anon, authenticated;

create policy "store_settings: lectura" on public.store_settings for select to anon, authenticated using (true);
create policy "store_settings: admin" on public.store_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "payment_methods: lectura" on public.payment_methods for select to anon, authenticated
  using (is_enabled or public.is_admin());
create policy "payment_methods: admin" on public.payment_methods for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "delivery_zones: lectura" on public.delivery_zones for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "delivery_zones: admin" on public.delivery_zones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "product_images: lectura" on public.product_images for select to anon, authenticated
  using (public.is_admin() or exists (
    select 1 from public.products p where p.id = product_id and p.catalog = 'store' and p.is_available and public.is_store_app()));
create policy "product_images: admin" on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "inventory_movements: admin lee" on public.inventory_movements for select to authenticated
  using (public.is_admin());

create policy "promotions: vigentes" on public.promotions for select to anon, authenticated
  using (public.is_admin() or (is_active and starts_at <= now() and (ends_at is null or ends_at > now()) and public.is_store_app()));
create policy "promotions: admin" on public.promotions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Productos del minimarket: visibles (activos) solo para la app nueva
create policy "products: tienda" on public.products for select to anon, authenticated
  using (catalog = 'store' and is_available and public.is_store_app());

-- Categorías: la app anterior deja de ver las del minimarket y viceversa
drop policy "categories: lectura" on public.categories;
create policy "categories: lectura" on public.categories for select to anon, authenticated
  using ((is_active and ((catalog = 'marketplace' and not public.is_store_app()) or (catalog = 'store' and public.is_store_app())))
         or public.is_admin());

-- Cupones públicos: cada app ve solo los suyos
drop policy "coupons: promociones públicas" on public.coupons;
create policy "coupons: promociones públicas" on public.coupons for select to anon, authenticated using (
  (is_public and is_active and starts_at <= now() and (expires_at is null or expires_at > now())
     and ((catalog = 'marketplace' and not public.is_store_app()) or (catalog = 'store' and public.is_store_app())))
  or public.is_admin());

-- ---------------------------------------------------------------------------
-- Comprobantes de pago (bucket PRIVADO): el cliente sube en su carpeta,
-- solo él y los administradores pueden verlos.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "payment-proofs: cliente sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "payment-proofs: dueño o admin lee" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "payment-proofs: admin elimina" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-proofs' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Precios con promociones (columnas calculadas para PostgREST)
-- ---------------------------------------------------------------------------
create or replace function public._item_promotion(p public.products)
returns table (promotion_id uuid, amount numeric)
language sql stable security definer set search_path = ''
as $$
  select pr.id,
         least(p.price, case pr.discount_type
           when 'percentage' then round(p.price * pr.discount_value / 100, 2)
           else pr.discount_value end)
  from public.promotions pr
  where pr.is_active and pr.starts_at <= now() and (pr.ends_at is null or pr.ends_at > now())
    and ((pr.scope = 'product' and pr.product_id = p.id)
      or (pr.scope = 'category' and pr.category_id in (p.category_id, p.subcategory_id)))
  order by 2 desc
  limit 1;
$$;
revoke all on function public._item_promotion(public.products) from public, anon, authenticated;

create or replace function public.final_price(p public.products)
returns numeric language sql stable security definer set search_path = ''
as $$
  select greatest(0, p.price - coalesce((select amount from public._item_promotion(p)), 0))::numeric(10,2);
$$;

create or replace function public.discount_percent(p public.products)
returns int language sql stable security definer set search_path = ''
as $$
  select case when p.price > 0
    then round(coalesce((select amount from public._item_promotion(p)), 0) / p.price * 100)::int else 0 end;
$$;

-- ---------------------------------------------------------------------------
-- Motor de precios del carrito (interno). Precios, stock, promociones, cupón y
-- delivery SIEMPRE desde la base de datos.
-- p_items: [{"product_id": uuid, "quantity": int}]
-- ---------------------------------------------------------------------------
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
      'sku', v_prod.sku, 'unit_price', v_unit, 'original_price', v_prod.price, 'unit_cost', v_prod.cost_price,
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

-- Cotización pública (no reserva stock ni consume cupones)
create or replace function public.store_quote(
  p_items jsonb, p_coupon_code text default null, p_fulfillment text default 'delivery', p_address_id uuid default null
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_district text;
begin
  if p_address_id is not null then
    select district into v_district from public.addresses where id = p_address_id and user_id = auth.uid();
  end if;
  return public._store_price_cart(p_items, p_coupon_code, coalesce(p_fulfillment, 'delivery'), v_district, auth.uid(), false);
end $$;
grant execute on function public.store_quote(jsonb, text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Crear pedido: atómico, idempotente y con stock bloqueado por fila
-- ---------------------------------------------------------------------------
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
      (v_line ->> 'unit_cost')::numeric, (v_line ->> 'quantity')::int, (v_line ->> 'line_total')::numeric);
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

-- El cliente registra la operación Yape/Plin y su comprobante → "por verificar"
create or replace function public.store_report_payment(p_order_id uuid, p_reference text, p_proof_path text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Pedido no encontrado' using errcode = '42501'; end if;
  if v_order.payment_method not in ('yape', 'plin') then raise exception 'Este pedido no se paga con Yape ni Plin'; end if;
  if v_order.status = 'cancelled' or v_order.payment_status not in ('pending', 'rejected') then
    raise exception 'El pago de este pedido ya no puede reportarse' using hint = 'PAYMENT_LOCKED';
  end if;
  if coalesce(p_reference, '') !~ '^[0-9A-Za-z-]{4,30}$' then
    raise exception 'Ingresa el número de operación que muestra tu app' using hint = 'INVALID_OPERATION';
  end if;
  if p_proof_path is not null and (p_proof_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
       or split_part(p_proof_path, '/', 1) <> auth.uid()::text) then
    raise exception 'Comprobante inválido' using hint = 'INVALID_PROOF';
  end if;
  update public.payments
    set status = 'pending_verification', operation_number = p_reference, proof_path = coalesce(p_proof_path, proof_path)
    where order_id = p_order_id and method = v_order.payment_method and status in ('pending', 'rejected');
  update public.orders set payment_status = 'pending_verification' where id = p_order_id;
end $$;
grant execute on function public.store_report_payment(uuid, text, text) to authenticated;
revoke execute on function public.store_report_payment(uuid, text, text) from anon, public;

-- Cancelación (compartida): ahora registra la reposición en inventario
create or replace function public._cancel_order(p_order_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_item record;
begin
  perform set_config('app.stock_type', 'sale_cancel', true);
  perform set_config('app.stock_reason', 'Pedido cancelado', true);
  perform set_config('app.stock_order', p_order_id::text, true);
  for v_item in select product_id, sum(quantity) as qty from public.order_items
                where order_id = p_order_id and product_id is not null group by product_id loop
    update public.products set stock = stock + v_item.qty where id = v_item.product_id and stock is not null;
  end loop;
  perform set_config('app.stock_type', '', true);
  perform set_config('app.stock_reason', '', true);
  perform set_config('app.stock_order', '', true);

  update public.coupons c set usage_count = greatest(0, c.usage_count - 1)
    from public.coupon_usages cu where cu.order_id = p_order_id and cu.coupon_id = c.id;
  delete from public.coupon_usages where order_id = p_order_id;
  update public.promotions pr set usage_count = greatest(0, pr.usage_count - 1)
    from public.orders o where o.id = p_order_id and o.promotion_id = pr.id;

  update public.payments set status = 'cancelled'
    where order_id = p_order_id and status in ('pending', 'pending_verification');
  update public.orders
    set status = 'cancelled', cancel_reason = left(p_reason, 300),
        payment_status = case when payment_status in ('pending', 'pending_verification') then 'cancelled' else payment_status end
    where id = p_order_id;
end $$;
revoke all on function public._cancel_order(uuid, text) from public, anon, authenticated;

-- Textos de notificación neutrales (sirven para ambos modelos)
create or replace function public.order_status_label(s public.order_status)
returns text language sql immutable set search_path = '' as $$
  select case s
    when 'received' then 'Recibimos tu pedido'
    when 'accepted' then 'Tu pedido fue confirmado'
    when 'preparing' then 'Estamos preparando tu pedido'
    when 'ready' then 'Tu pedido está listo'
    when 'courier_assigned' then 'Repartidor asignado'
    when 'picked_up' then 'El repartidor recogió tu pedido'
    when 'on_the_way' then 'Tu pedido está en camino'
    when 'delivered' then 'Pedido entregado'
    when 'cancelled' then 'Pedido cancelado'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Administración: estados, entrega, inventario
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders;
  v_allowed boolean;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into v_order from public.orders where id = p_order_id and catalog = 'store' for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v_order.status in ('delivered', 'cancelled') then
    raise exception 'El pedido ya está cerrado' using hint = 'ORDER_CLOSED';
  end if;

  if p_status = 'cancelled' then
    perform public._cancel_order(p_order_id, coalesce(nullif(trim(p_note), ''), 'Cancelado por el negocio'));
  else
    v_allowed := case v_order.status
      when 'received' then p_status = 'accepted'
      when 'accepted' then p_status = 'preparing'
      when 'preparing' then p_status = 'ready'
      when 'ready' then (v_order.fulfillment = 'delivery' and p_status = 'on_the_way')
                        or (v_order.fulfillment = 'pickup' and p_status = 'delivered')
      when 'on_the_way' then p_status = 'delivered'
      else false end;
    if not v_allowed then
      raise exception 'Cambio de estado no permitido' using hint = 'INVALID_TRANSITION';
    end if;
    if p_status = 'accepted' and v_order.payment_method in ('yape', 'plin') and v_order.payment_status <> 'approved' then
      raise exception 'Verifica el pago % antes de confirmar el pedido', initcap(v_order.payment_method::text)
        using hint = 'PAYMENT_PENDING';
    end if;
    update public.orders set status = p_status where id = p_order_id;
  end if;

  if nullif(trim(p_note), '') is not null then
    update public.order_status_history set note = left(p_note, 300)
      where id = (select max(id) from public.order_status_history where order_id = p_order_id);
  end if;
  perform public.log_admin_action('order_status', 'orders', p_order_id::text,
    jsonb_build_object('from', v_order.status, 'to', p_status, 'note', p_note));
end $$;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;
revoke execute on function public.admin_set_order_status(uuid, public.order_status, text) from anon, public;

create or replace function public.admin_set_delivery_person(p_order_id uuid, p_name text, p_phone text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if nullif(trim(p_phone), '') is not null and trim(p_phone) !~ '^\+?[0-9 ]{6,20}$' then
    raise exception 'Teléfono inválido';
  end if;
  update public.orders
    set delivery_person_name = nullif(left(trim(p_name), 80), ''), delivery_person_phone = nullif(trim(p_phone), '')
    where id = p_order_id and catalog = 'store';
  if not found then raise exception 'Pedido no encontrado'; end if;
  perform public.log_admin_action('delivery_person', 'orders', p_order_id::text,
    jsonb_build_object('name', p_name, 'phone', p_phone));
end $$;
grant execute on function public.admin_set_delivery_person(uuid, text, text) to authenticated;
revoke execute on function public.admin_set_delivery_person(uuid, text, text) from anon, public;

create or replace function public.admin_inventory_move(p_product_id uuid, p_type text, p_quantity int, p_reason text)
returns int language plpgsql security definer set search_path = ''
as $$
declare
  v_prod public.products;
  v_new int;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into v_prod from public.products where id = p_product_id and catalog = 'store' for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_type not in ('in', 'out', 'adjustment') then raise exception 'Tipo de movimiento inválido'; end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 100000 or (p_type <> 'adjustment' and p_quantity = 0) then
    raise exception 'Cantidad inválida';
  end if;
  if p_type in ('out', 'adjustment') and char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Indica el motivo del movimiento' using hint = 'REASON_REQUIRED';
  end if;
  v_new := case p_type
    when 'in' then v_prod.stock + p_quantity
    when 'out' then v_prod.stock - p_quantity
    else p_quantity end;
  if v_new < 0 then
    raise exception 'No hay stock suficiente (disponibles: %)', v_prod.stock using hint = 'OUT_OF_STOCK';
  end if;
  if v_new = v_prod.stock then raise exception 'El stock no cambia'; end if;
  perform set_config('app.stock_type', p_type, true);
  perform set_config('app.stock_reason', coalesce(nullif(left(trim(p_reason), 200), ''),
    case p_type when 'in' then 'Ingreso de mercadería' end), true);
  update public.products set stock = v_new where id = p_product_id;
  perform set_config('app.stock_type', '', true);
  perform set_config('app.stock_reason', '', true);
  return v_new;
end $$;
grant execute on function public.admin_inventory_move(uuid, text, int, text) to authenticated;
revoke execute on function public.admin_inventory_move(uuid, text, int, text) from anon, public;

-- ---------------------------------------------------------------------------
-- Estadísticas y reportes (solo pedidos del minimarket; ventas = pedidos entregados)
-- ---------------------------------------------------------------------------
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
      select coalesce(sum(oi.line_total - coalesce(oi.unit_cost, 0) * oi.quantity), 0)
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
                        count(distinct o.id) n, sum(oi.line_total - coalesce(oi.unit_cost, 0) * oi.quantity) profit
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
      select oi.order_id, sum(oi.quantity) q, sum(coalesce(oi.unit_cost, 0) * oi.quantity) c
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
           coalesce(sum(oi.line_total - coalesce(oi.unit_cost, 0) * oi.quantity), 0)
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

create or replace function public.admin_customers(p_search text default null, p_limit int default 25, p_offset int default 0)
returns table (id uuid, full_name text, email text, phone text, status public.account_status, role public.app_role,
               created_at timestamptz, address text, orders bigint, total_spent numeric, total_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
    select pr.id, pr.full_name, pr.email, pr.phone, pr.status, pr.role, pr.created_at,
           (select a.street || coalesce(', ' || nullif(a.district, ''), '') from public.addresses a
              where a.user_id = pr.id order by a.is_default desc, a.created_at limit 1),
           (select count(*) from public.orders o where o.user_id = pr.id and o.catalog = 'store'),
           (select coalesce(sum(o.total), 0) from public.orders o where o.user_id = pr.id and o.catalog = 'store' and o.status = 'delivered'),
           count(*) over ()
    from public.profiles pr
    where p_search is null or p_search = ''
       or pr.full_name ilike '%' || p_search || '%' or pr.email ilike '%' || p_search || '%' or pr.phone ilike '%' || p_search || '%'
    order by pr.created_at desc
    limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;
grant execute on function public.admin_customers(text, int, int) to authenticated;
revoke execute on function public.admin_customers(text, int, int) from anon, public;

-- Eliminar datos de demostración del minimarket sin tocar los reales
create or replace function public.admin_purge_store_demo()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_products int; v_promos int; v_coupons int;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  delete from public.promotions where is_demo;
  get diagnostics v_promos = row_count;
  delete from public.coupons where is_demo and catalog = 'store'
    and not exists (select 1 from public.coupon_usages cu where cu.coupon_id = coupons.id);
  get diagnostics v_coupons = row_count;
  -- Los pedidos conservan nombre, precio y cantidad (copias en order_items)
  delete from public.products where is_demo and catalog = 'store';
  get diagnostics v_products = row_count;
  perform public.log_admin_action('purge_store_demo', 'system', null,
    jsonb_build_object('products', v_products, 'promotions', v_promos, 'coupons', v_coupons));
  return jsonb_build_object('products', v_products, 'promotions', v_promos, 'coupons', v_coupons);
end $$;
grant execute on function public.admin_purge_store_demo() to authenticated;
revoke execute on function public.admin_purge_store_demo() from anon, public;

-- Auditoría automática de las tablas de gestión nuevas
create trigger audit_store_settings after update on public.store_settings
  for each row execute function public.audit_admin_change();
create trigger audit_payment_methods after update on public.payment_methods
  for each row execute function public.audit_admin_change();
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function public.audit_admin_change();
create trigger audit_delivery_zones after insert or update or delete on public.delivery_zones
  for each row execute function public.audit_admin_change();

-- Funciones internas no invocables desde la API
revoke all on function public.log_stock_movement() from public, anon, authenticated;

-- Tiempo real: el inventario y la configuración no lo necesitan; pedidos y pagos ya están publicados.

-- Más vendidos (público): solo devuelve ids y cantidades agregadas, sin datos de clientes
create or replace function public.store_best_sellers(p_limit int default 8)
returns table (product_id uuid, qty bigint)
language sql stable security definer set search_path = ''
as $$
  select oi.product_id, sum(oi.quantity)::bigint
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.catalog = 'store' and o.status <> 'cancelled' and o.created_at > now() - interval '90 days'
    and p.is_available
  group by oi.product_id
  order by 2 desc
  limit least(greatest(p_limit, 1), 24);
$$;
grant execute on function public.store_best_sellers(int) to anon, authenticated;
