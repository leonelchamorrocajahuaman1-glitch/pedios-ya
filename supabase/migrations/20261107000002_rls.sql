-- =============================================================================
-- Mikuy · Autorización: roles, alta de usuarios y políticas RLS
-- Regla general: los clientes leen sus propios datos; todas las escrituras
-- sensibles (pedidos, pagos, estados) pasan por funciones SECURITY DEFINER
-- que validan permisos en la base de datos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers de rol
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'active'
  );
$$;

-- El registro público SIEMPRE crea clientes: se ignora cualquier "role" en la metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9+ ]', '', 'g'), ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie puede cambiar su propio rol ni estado por la API.
-- El rol solo cambia desde el SQL Editor / service_role (ver promote_to_admin).
create or replace function public.guard_profile_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  privileged boolean := current_user in ('postgres', 'supabase_admin', 'service_role');
begin
  if new.id <> old.id then
    raise exception 'No se puede modificar el identificador del perfil';
  end if;
  if new.role is distinct from old.role and not privileged then
    raise exception 'No autorizado para cambiar roles' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not privileged then
    raise exception 'No autorizado para cambiar el estado de la cuenta' using errcode = '42501';
  end if;
  if new.email is distinct from old.email and not privileged then
    new.email := old.email;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Asignación de administradores: SOLO desde el SQL Editor de Supabase o con service_role.
create or replace function public.promote_to_admin(p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  select id into v_id from public.profiles where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'No existe un usuario con el correo %', p_email;
  end if;
  update public.profiles set role = 'admin' where id = v_id;
  insert into public.admin_audit_logs (actor_id, action, entity, entity_id, details)
  values (null, 'promote_to_admin', 'profiles', v_id::text, jsonb_build_object('email', p_email));
end $$;
revoke all on function public.promote_to_admin(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.platform_settings enable row level security;
alter table public.categories enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_categories enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.favorites enable row level security;
alter table public.couriers enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.coupon_usages enable row level security;
alter table public.reviews enable row level security;
alter table public.delivery_locations enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Privilegios por columna (defensa adicional a RLS)
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

revoke insert, update, delete on public.orders, public.order_items, public.order_status_history,
  public.payments, public.coupon_usages, public.delivery_locations, public.admin_audit_logs,
  public.reviews
  from anon, authenticated;

revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke all on public.couriers from anon;
revoke all on public.coupons from anon;
grant select on public.coupons to anon;
revoke insert, update, delete on public.platform_settings from anon;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: ver el propio" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: editar el propio" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- platform_settings (lectura pública, edición admin)
-- ---------------------------------------------------------------------------
create policy "settings: lectura pública" on public.platform_settings
  for select to anon, authenticated using (true);
create policy "settings: admin edita" on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Catálogo público
-- ---------------------------------------------------------------------------
create policy "categories: lectura" on public.categories
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "categories: admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "restaurants: lectura" on public.restaurants
  for select to anon, authenticated
  using (status = 'approved' or public.is_admin() or owner_id = auth.uid());
create policy "restaurants: admin" on public.restaurants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "restaurant_categories: lectura" on public.restaurant_categories
  for select to anon, authenticated using (true);
create policy "restaurant_categories: admin" on public.restaurant_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "products: lectura" on public.products
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'approved')
  );
create policy "products: admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Datos del cliente
-- ---------------------------------------------------------------------------
create policy "addresses: propias" on public.addresses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_active_user());
create policy "addresses: admin lee" on public.addresses
  for select to authenticated using (public.is_admin());

create policy "favorites: propios" on public.favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications: propias" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: marcar leídas" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: borrar propias" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Pedidos (solo lectura directa; escritura vía funciones)
-- ---------------------------------------------------------------------------
create policy "orders: propios o admin" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "order_items: del pedido propio" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

create policy "order_status_history: del pedido propio" on public.order_status_history
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

create policy "payments: del pedido propio" on public.payments
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );

create policy "coupon_usages: propios" on public.coupon_usages
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- El cliente solo ve la ubicación del repartidor mientras su pedido está en ruta.
create policy "delivery_locations: seguimiento" on public.delivery_locations
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
        and o.status in ('courier_assigned', 'picked_up', 'on_the_way')
    )
  );

-- ---------------------------------------------------------------------------
-- Reseñas (lectura pública, alta vía submit_review)
-- ---------------------------------------------------------------------------
create policy "reviews: lectura" on public.reviews
  for select to anon, authenticated using (true);
create policy "reviews: admin borra" on public.reviews
  for delete to authenticated using (public.is_admin());
grant delete on public.reviews to authenticated;

-- ---------------------------------------------------------------------------
-- Cupones: solo promociones públicas vigentes; gestión admin
-- ---------------------------------------------------------------------------
create policy "coupons: promociones públicas" on public.coupons
  for select to anon, authenticated using (
    (is_public and is_active and starts_at <= now() and (expires_at is null or expires_at > now()))
    or public.is_admin()
  );
create policy "coupons: admin" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Repartidores y auditoría: solo administradores
-- ---------------------------------------------------------------------------
create policy "couriers: admin" on public.couriers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "audit: admin lee" on public.admin_audit_logs
  for select to authenticated using (public.is_admin());
