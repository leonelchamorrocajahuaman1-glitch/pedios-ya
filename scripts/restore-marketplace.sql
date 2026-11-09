-- Revierte supabase/pending/20261112000012 (limpieza de corte) desde backup_cutover.
-- Devuelve TODOS los datos del marketplace a las tablas activas, tal como estaban,
-- reactiva el aislamiento por cabecera x-app y los permisos de las funciones antiguas.
-- Ejecutar en el SQL Editor de Supabase (rol postgres). Todo o nada.
begin;
-- Sin triggers durante la restauración: así no se duplican historial, notificaciones ni auditoría.
set local session_replication_role = replica;

insert into public.categories overriding system value select * from backup_cutover.categories;
insert into public.restaurants overriding system value select * from backup_cutover.restaurants;
insert into public.restaurant_categories overriding system value select * from backup_cutover.restaurant_categories;
insert into public.couriers overriding system value select * from backup_cutover.couriers;
insert into public.products overriding system value select * from backup_cutover.products;
insert into public.coupons overriding system value select * from backup_cutover.coupons;
insert into public.orders overriding system value select * from backup_cutover.orders;
insert into public.order_items overriding system value select * from backup_cutover.order_items;
insert into public.order_status_history overriding system value select * from backup_cutover.order_status_history;
insert into public.payments overriding system value select * from backup_cutover.payments;
insert into public.coupon_usages overriding system value select * from backup_cutover.coupon_usages;
insert into public.notifications overriding system value select * from backup_cutover.notifications;
insert into public.delivery_locations overriding system value select * from backup_cutover.delivery_locations;
insert into public.reviews overriding system value select * from backup_cutover.reviews;
insert into public.favorites overriding system value select * from backup_cutover.favorites;
update public.inventory_movements m set order_id = r.order_id from backup_cutover.inventory_movements_refs r where r.id = m.id;

create or replace function public.is_store_app()
returns boolean language sql stable set search_path = ''
as $$
  select coalesce((nullif(current_setting('request.headers', true), '')::json ->> 'x-app'), '') = 'huaytalla';
$$;

do $$
declare g record;
begin
  for g in select fn, role from backup_cutover.function_grants loop
    execute format('grant execute on function %s to %I', g.fn, g.role);
  end loop;
end $$;
commit;
