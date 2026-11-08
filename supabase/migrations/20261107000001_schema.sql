-- =============================================================================
-- Mikuy · Esquema base
-- Tablas, tipos, índices, restricciones y triggers de mantenimiento.
-- Las políticas RLS están en 20261107000002_rls.sql y la lógica de negocio
-- (pedidos, cupones, estadísticas) en 20261107000003_functions.sql.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'customer');
create type public.account_status as enum ('active', 'suspended');
create type public.restaurant_status as enum ('pending', 'approved', 'suspended', 'rejected');
create type public.order_status as enum (
  'received',          -- 1. Pedido recibido
  'accepted',          -- 2. Restaurante aceptó
  'preparing',         -- 3. Preparando pedido
  'courier_assigned',  -- 4. Repartidor asignado
  'picked_up',         -- 5. Repartidor recogió el pedido
  'on_the_way',        -- 6. Pedido en camino
  'delivered',         -- 7. Pedido entregado
  'cancelled'
);
create type public.payment_method as enum ('cash', 'yape', 'plin', 'card');
create type public.payment_status as enum (
  'pending',               -- aún no hay confirmación del proveedor
  'pending_verification',  -- el cliente reportó un pago (Yape/Plin) que falta verificar
  'approved',              -- confirmado por el proveedor / administrador
  'rejected',
  'refunded',
  'cancelled'
);
create type public.discount_type as enum ('percentage', 'fixed', 'free_delivery');
create type public.courier_status as enum ('pending', 'active', 'suspended');

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{6,20}$'),
  avatar_url text,
  role public.app_role not null default 'customer',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Configuración de la plataforma (fila única)
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  platform_name text not null default 'Mikuy',
  logo_url text,
  primary_color text not null default '#FF4D2E' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#7C5CFF' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  default_commission_rate numeric(5,4) not null default 0.15 check (default_commission_rate between 0 and 0.5),
  base_delivery_fee numeric(10,2) not null default 4.90 check (base_delivery_fee >= 0),
  fee_per_km numeric(10,2) not null default 1.00 check (fee_per_km >= 0),
  included_km numeric(6,2) not null default 3 check (included_km >= 0),
  max_delivery_km numeric(6,2) not null default 12 check (max_delivery_km > 0),
  free_delivery_threshold numeric(10,2) check (free_delivery_threshold is null or free_delivery_threshold > 0),
  service_fee numeric(10,2) not null default 0 check (service_fee >= 0),
  payment_cash_enabled boolean not null default true,
  payment_yape_enabled boolean not null default true,
  payment_plin_enabled boolean not null default true,
  payment_card_enabled boolean not null default false,
  yape_phone text,
  plin_phone text,
  wallet_holder_name text,
  support_email text,
  support_phone text,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 60),
  icon text not null default 'utensils',
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 2 and 100),
  description text not null default '' check (char_length(description) <= 600),
  logo_url text,
  cover_url text,
  phone text,
  email text,
  address text not null default '',
  district text not null default '',
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  rating_avg numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count int not null default 0 check (rating_count >= 0),
  delivery_time_min int not null default 25 check (delivery_time_min > 0),
  delivery_time_max int not null default 40,
  delivery_fee numeric(10,2) not null default 4.90 check (delivery_fee >= 0),
  min_order_amount numeric(10,2) not null default 0 check (min_order_amount >= 0),
  commission_rate numeric(5,4) not null default 0.15 check (commission_rate between 0 and 0.5),
  opens_at time not null default '10:00',
  closes_at time not null default '23:00',
  open_days smallint[] not null default '{0,1,2,3,4,5,6}', -- 0 = domingo (zona America/Lima)
  is_accepting_orders boolean not null default true,
  is_featured boolean not null default false,
  status public.restaurant_status not null default 'pending',
  owner_id uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_delivery_window check (delivery_time_max >= delivery_time_min)
);
create index restaurants_status_idx on public.restaurants (status);
create index restaurants_featured_idx on public.restaurants (is_featured) where status = 'approved';
create index restaurants_name_trgm_idx on public.restaurants using gin (to_tsvector('spanish', name || ' ' || description));
create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

create table public.restaurant_categories (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (restaurant_id, category_id)
);
create index restaurant_categories_category_idx on public.restaurant_categories (category_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  section text not null default 'Menú' check (char_length(section) between 1 and 60),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  image_url text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  stock int check (stock is null or stock >= 0), -- null = sin control de inventario
  is_available boolean not null default true,
  is_popular boolean not null default false,
  -- Grupos de opciones: [{"name":"Tamaño","required":true,"max":1,"choices":[{"name":"Grande","price":5}]}]
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  sort_order int not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_restaurant_idx on public.products (restaurant_id, sort_order);
create index products_category_idx on public.products (category_id);
create index products_popular_idx on public.products (is_popular) where is_available;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Clientes: direcciones y favoritos
-- ---------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Casa' check (char_length(label) between 1 and 40),
  street text not null check (char_length(street) between 3 and 200),
  district text not null default '' check (char_length(district) <= 80),
  city text not null default 'Lima' check (char_length(city) <= 80),
  reference text check (reference is null or char_length(reference) <= 250),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

-- ---------------------------------------------------------------------------
-- Repartidores
-- ---------------------------------------------------------------------------
create table public.couriers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 3 and 120),
  phone text not null check (phone ~ '^\+?[0-9 ]{6,20}$'),
  document_id text check (document_id is null or document_id ~ '^[0-9A-Za-z]{6,15}$'),
  vehicle_type text not null default 'moto' check (vehicle_type in ('moto', 'bicicleta', 'auto', 'a_pie')),
  vehicle_plate text,
  status public.courier_status not null default 'pending',
  is_available boolean not null default false,
  location_consent boolean not null default false,
  location_consent_at timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_seen_at timestamptz,
  -- Hash SHA-256 del token del enlace personal del repartidor (el token nunca se guarda en claro)
  access_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger couriers_updated_at before update on public.couriers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cupones
-- ---------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description text not null default '',
  discount_type public.discount_type not null,
  discount_value numeric(10,2) not null default 0 check (discount_value >= 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount > 0),
  min_order_amount numeric(10,2) not null default 0 check (min_order_amount >= 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  usage_count int not null default 0 check (usage_count >= 0),
  per_user_limit int not null default 1 check (per_user_limit > 0),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  is_active boolean not null default true,
  is_public boolean not null default false, -- visible en la sección de promociones
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint coupons_percentage_range check (discount_type <> 'percentage' or discount_value between 1 and 100),
  constraint coupons_dates check (expires_at is null or expires_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
create sequence public.order_code_seq start 10001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('MK-' || nextval('public.order_code_seq')::text),
  user_id uuid not null references public.profiles (id) on delete restrict,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  courier_id uuid references public.couriers (id) on delete set null,
  address_id uuid references public.addresses (id) on delete set null,
  -- Copia de la dirección al momento de la compra
  delivery_address text not null,
  delivery_district text not null default '',
  delivery_reference text,
  delivery_lat double precision,
  delivery_lng double precision,
  contact_phone text,
  notes text check (notes is null or char_length(notes) <= 300),
  status public.order_status not null default 'received',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  delivery_fee numeric(10,2) not null check (delivery_fee >= 0),
  service_fee numeric(10,2) not null default 0 check (service_fee >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  total numeric(10,2) not null check (total >= 0),
  commission_rate numeric(5,4) not null,
  commission_amount numeric(10,2) not null default 0,
  coupon_id uuid references public.coupons (id) on delete set null,
  distance_km numeric(6,2),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  constraint orders_idempotency unique (user_id, idempotency_key)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_restaurant_idx on public.orders (restaurant_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_courier_idx on public.orders (courier_id) where courier_id is not null;
create index orders_created_idx on public.orders (created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  options jsonb not null default '[]'::jsonb,
  options_price numeric(10,2) not null default 0 check (options_price >= 0),
  quantity int not null check (quantity between 1 and 50),
  line_total numeric(10,2) not null check (line_total >= 0),
  notes text check (notes is null or char_length(notes) <= 200)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method public.payment_method not null,
  provider text not null, -- 'cash' | 'yape' | 'plin' | 'mercadopago'
  amount numeric(10,2) not null check (amount >= 0),
  currency char(3) not null default 'PEN',
  status public.payment_status not null default 'pending',
  provider_payment_id text,
  provider_preference_id text,
  operation_number text check (operation_number is null or operation_number ~ '^[0-9A-Za-z-]{4,30}$'),
  payer_phone text,
  raw_response jsonb,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payments_provider_payment_idx on public.payments (provider, provider_payment_id)
  where provider_payment_id is not null;
create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create table public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  discount_amount numeric(10,2) not null default 0,
  used_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);
create index coupon_usages_user_idx on public.coupon_usages (coupon_id, user_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now()
);
create index reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc);

create table public.delivery_locations (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  courier_id uuid not null references public.couriers (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  heading double precision,
  speed double precision,
  recorded_at timestamptz not null default now()
);
create index delivery_locations_order_idx on public.delivery_locations (order_id, recorded_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text not null default '',
  order_id uuid references public.orders (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- Registro de auditoría de acciones administrativas
create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
