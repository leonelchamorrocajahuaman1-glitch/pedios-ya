-- =============================================================================
-- MULTIPRODUCTOS HUAYTALLA · Elimina los costos que la API todavía expone
--   products.cost_price  → se elimina la columna
--   order_items.unit_cost → se vacía (la columna queda; el cliente lee order_items)
-- Los valores ya viven en las tablas privadas product_costs / order_item_costs
-- (migración 009, aplicada). Aquí se re-sincroniza, se guarda copia y se verifica.
--
-- ⚠️  CAMBIO DESTRUCTIVO: NO APLICAR sin autorización explícita del dueño.
-- ⚠️  Aplicar DESPUÉS de publicar la versión nueva (la app anterior no usa costos,
--     así que tampoco se rompe si se aplicara antes).
-- Reversión: scripts/restore-costs.sql
-- =============================================================================

-- 1) Copia de seguridad de las columnas
create schema if not exists backup_costs;
revoke all on schema backup_costs from public, anon, authenticated;
create table backup_costs.products_cost_price as
  select id, cost_price, now() as taken_at from public.products where cost_price is not null;
create table backup_costs.order_items_unit_cost as
  select id, unit_cost, now() as taken_at from public.order_items where unit_cost is not null;

-- 2) Re-sincronizar con las tablas privadas (no sobrescribe costos editados en el panel)
insert into public.product_costs (product_id, cost_price)
select id, cost_price from public.products where cost_price is not null
on conflict (product_id) do nothing;
insert into public.order_item_costs (order_item_id, unit_cost)
select id, unit_cost from public.order_items where unit_cost is not null
on conflict (order_item_id) do nothing;

-- 3) Verificar que ningún costo se pierde
do $$ begin
  if exists (select 1 from public.products p where p.cost_price is not null
             and not exists (select 1 from public.product_costs c where c.product_id = p.id)) then
    raise exception 'Hay costos de productos sin copiar: se cancela';
  end if;
  if exists (select 1 from public.order_items i where i.unit_cost is not null
             and not exists (select 1 from public.order_item_costs c where c.order_item_id = i.id)) then
    raise exception 'Hay costos de ventas sin copiar: se cancela';
  end if;
end $$;

-- 4) Quitar la exposición
alter table public.products drop column cost_price;
update public.order_items set unit_cost = null where unit_cost is not null;
