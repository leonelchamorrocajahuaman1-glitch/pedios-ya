-- =============================================================================
-- MULTIPRODUCTOS HUAYTALLA · Limpieza de corte (cutover)
--
-- ⚠️  CAMBIO DESTRUCTIVO: NO APLICAR sin autorización explícita del dueño.
-- ⚠️  Aplicar SOLO DESPUÉS de que la versión nueva esté publicada en producción
--     (main). Antes de eso, la app anterior todavía usa estos datos.
--
-- Qué hace (en una sola transacción; si algo falla, no cambia nada):
--   1. Copia final COMPLETA de los datos del marketplace a backup_cutover
--      (todas las columnas actuales), y verifica que la copia está completa.
--   2. Elimina de las tablas activas SOLO los datos del marketplace anterior
--      (restaurantes, sus productos/categorías/cupones, repartidores y sus
--      2 pedidos de prueba con sus detalles).
--   3. Quita el aislamiento temporal por cabecera x-app (la tienda pasa a ser
--      la única app): is_store_app() devuelve siempre true.
--   4. Bloquea (REVOKE, no borra) las funciones del marketplace en la API.
--
-- Qué NO toca: cuentas (incl. QA), direcciones, auditoría, productos/pedidos/
-- categorías/cupones de la tienda, configuración, Storage, ni backup_marketplace.
-- Tablas y columnas antiguas quedan vacías/sin uso (no se eliminan).
-- Reversión: scripts/restore-marketplace.sql (desde backup_cutover).
-- =============================================================================

-- 0) Requisitos
do $$ begin
  if to_regclass('backup_marketplace._meta') is null then
    raise exception 'No existe el respaldo backup_marketplace: se cancela la limpieza';
  end if;
  if to_regclass('backup_cutover.orders') is not null then
    raise exception 'backup_cutover ya existe: revisa si la limpieza ya se aplicó';
  end if;
end $$;

-- 1) Copia final completa
create schema backup_cutover;
revoke all on schema backup_cutover from public, anon, authenticated;

create table backup_cutover.orders as select * from public.orders where catalog = 'marketplace';
create table backup_cutover.order_items as select * from public.order_items where order_id in (select id from backup_cutover.orders);
create table backup_cutover.order_status_history as select * from public.order_status_history where order_id in (select id from backup_cutover.orders);
create table backup_cutover.payments as select * from public.payments where order_id in (select id from backup_cutover.orders);
create table backup_cutover.coupon_usages as select * from public.coupon_usages where order_id in (select id from backup_cutover.orders);
create table backup_cutover.notifications as select * from public.notifications where order_id in (select id from backup_cutover.orders);
create table backup_cutover.delivery_locations as select * from public.delivery_locations;
create table backup_cutover.reviews as select * from public.reviews;
create table backup_cutover.favorites as select * from public.favorites;
create table backup_cutover.restaurants as select * from public.restaurants;
create table backup_cutover.restaurant_categories as select * from public.restaurant_categories;
create table backup_cutover.couriers as select * from public.couriers;
create table backup_cutover.products as select * from public.products where catalog = 'marketplace';
create table backup_cutover.categories as select * from public.categories where catalog = 'marketplace';
create table backup_cutover.coupons as select * from public.coupons where catalog = 'marketplace';
create table backup_cutover.inventory_movements_refs as
  select id, order_id from public.inventory_movements where order_id in (select id from backup_cutover.orders);
create table backup_cutover._meta as
  select now() as taken_at, current_user as taken_by,
         (select count(*) from backup_cutover.orders) as orders, (select count(*) from backup_cutover.products) as products,
         (select count(*) from backup_cutover.restaurants) as restaurants;

-- Verificación: la copia debe ser idéntica fila por fila a lo que se va a borrar
do $$
declare t text; n_live bigint; n_bak bigint; h_live text; h_bak text;
begin
  foreach t in array array['orders','products','categories','coupons'] loop
    execute format('select count(*), md5(coalesce(string_agg(x::text, ''|'' order by x.id), '''')) from public.%I x where catalog = ''marketplace''', t) into n_live, h_live;
    execute format('select count(*), md5(coalesce(string_agg(x::text, ''|'' order by x.id), '''')) from backup_cutover.%I x', t) into n_bak, h_bak;
    if n_live <> n_bak or h_live <> h_bak then raise exception 'Copia incompleta en %: % vs %', t, n_live, n_bak; end if;
  end loop;
  foreach t in array array['restaurants','couriers','reviews','favorites','delivery_locations'] loop
    execute format('select count(*), md5(coalesce(string_agg(x::text, ''|'' order by x::text), '''')) from public.%I x', t) into n_live, h_live;
    execute format('select count(*), md5(coalesce(string_agg(x::text, ''|'' order by x::text), '''')) from backup_cutover.%I x', t) into n_bak, h_bak;
    if n_live <> n_bak or h_live <> h_bak then raise exception 'Copia incompleta en %', t; end if;
  end loop;
  -- Y todo lo que se borra existe también en el respaldo original (backup_marketplace).
  -- Si la app anterior creó datos nuevos después del respaldo, se detiene para revisarlos.
  foreach t in array array['restaurants','products','orders','categories','coupons','couriers'] loop
    execute format('select count(*) from backup_cutover.%I c where not exists (select 1 from backup_marketplace.%I b where b.id = c.id)', t, t) into n_live;
    if n_live > 0 then raise exception '% registro(s) de % no están en backup_marketplace: revisar antes de limpiar', n_live, t; end if;
  end loop;
end $$;

-- 2) Eliminar los datos del marketplace de las tablas activas
--    (pedidos → en cascada: ítems, historial, pagos, usos de cupón, notificaciones, ubicaciones, reseñas)
delete from public.orders where catalog = 'marketplace';
delete from public.favorites;
delete from public.reviews;
delete from public.delivery_locations;
delete from public.products where catalog = 'marketplace';
delete from public.coupons where catalog = 'marketplace';
delete from public.restaurant_categories;
delete from public.restaurants;
delete from public.couriers;
delete from public.categories where catalog = 'marketplace';

do $$ begin
  if exists (select 1 from public.products where catalog <> 'store')
     or exists (select 1 from public.categories where catalog <> 'store')
     or exists (select 1 from public.orders where catalog <> 'store')
     or exists (select 1 from public.restaurants) then
    raise exception 'Quedaron datos del marketplace: se revierte todo';
  end if;
end $$;

-- 3) Una sola app: ya no se necesita la cabecera x-app
create or replace function public.is_store_app()
returns boolean language sql stable set search_path = ''
as $$ select true $$;

-- 4) Funciones del marketplace: fuera de la API (siguen existiendo; se pueden volver a habilitar).
--    Primero se guarda quién podía ejecutarlas, para restaurar los permisos exactos.
create table backup_cutover.function_grants as
  select p.oid::regprocedure::text as fn, r.rolname as role
  from pg_proc p cross join (values ('anon'), ('authenticated')) r(rolname)
  where p.pronamespace = 'public'::regnamespace and p.proname in (
      'place_order', 'quote_order', 'admin_assign_courier', 'admin_courier_stats', 'admin_dashboard_stats',
      'admin_purge_demo_data', 'admin_restaurant_sales', 'admin_update_order_status', 'apply_card_payment',
      'courier_advance_order', 'courier_report_location', 'get_order_courier', 'report_wallet_payment',
      'submit_restaurant_application', 'submit_review')
    and has_function_privilege(r.rolname, p.oid, 'execute');

do $$
declare f text;
begin
  for f in select distinct fn from backup_cutover.function_grants loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;
