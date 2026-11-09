-- Revierte supabase/pending/20261110000010 (columnas de costo) desde backup_costs.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
begin;
alter table public.products add column if not exists cost_price numeric(10,2) check (cost_price is null or cost_price >= 0);
update public.products p set cost_price = b.cost_price from backup_costs.products_cost_price b where b.id = p.id;
update public.order_items i set unit_cost = b.unit_cost from backup_costs.order_items_unit_cost b where b.id = i.id;
commit;
