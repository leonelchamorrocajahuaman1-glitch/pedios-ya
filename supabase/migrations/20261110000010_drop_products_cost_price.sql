-- =============================================================================
-- MULTIPRODUCTOS HUAYTALLA · Elimina los costos expuestos por la API
-- (products.cost_price y order_items.unit_cost; ya copiados a tablas privadas)
-- CAMBIO DESTRUCTIVO: aplicar en producción solo con autorización del dueño.
-- Antes se re-sincroniza product_costs para no perder ningún costo.
-- =============================================================================
insert into public.product_costs (product_id, cost_price)
select id, cost_price from public.products where cost_price is not null
on conflict (product_id) do nothing;

insert into public.order_item_costs (order_item_id, unit_cost)
select id, unit_cost from public.order_items where unit_cost is not null
on conflict (order_item_id) do nothing;

alter table public.products drop column cost_price;
update public.order_items set unit_cost = null where unit_cost is not null;
