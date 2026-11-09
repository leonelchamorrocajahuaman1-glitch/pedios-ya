-- Se ejecuta DESPUÉS de supabase/pending/010 y 012: la tienda funciona sola, sin cabecera x-app.
do $$ begin
  assert not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'cost_price'), 'products sin cost_price';
  assert (select count(*) from public.order_items where unit_cost is not null) = 0, 'order_items sin costos visibles';
  assert (select count(*) from public.product_costs) = 74, 'Costos conservados en tabla privada';
  assert (select count(*) from public.restaurants) = 0 and (select count(*) from public.couriers) = 0, 'Sin restaurantes ni repartidores';
  assert (select count(*) from public.products where catalog = 'marketplace') = 0, 'Sin productos del marketplace';
  assert (select count(*) from public.orders where catalog = 'marketplace') = 0, 'Sin pedidos del marketplace';
  assert (select count(*) from backup_cutover.restaurants) = 10 and (select count(*) from backup_cutover.products) = 37, 'Copia final completa';
  assert (select count(*) from public.profiles) >= 3, 'Cuentas intactas';
  assert (select count(*) from public.products where catalog = 'store') = 74, 'Catálogo de la tienda intacto';
end $$;

-- Visitante SIN cabecera x-app: ve la tienda
begin;
set local role anon;
do $$ declare v jsonb; begin
  assert (select count(*) from public.products) = 74, 'Anónimo ve los 74 productos de la tienda (y ninguno del marketplace): ' || (select count(*) from public.products);
  assert (select count(*) from public.categories where parent_id is null) = 15, 'Ve las 15 categorías';
  assert (select count(*) from public.coupons) = 2, 'Ve los 2 cupones públicos';
  v := public.store_quote((select jsonb_agg(jsonb_build_object('product_id', id, 'quantity', 5)) from public.products where slug = 'arroz-extra-5kg'), null, 'pickup', null);
  assert (v ->> 'total')::numeric > 0, 'Cotiza sin cabecera';
  begin perform public.quote_order(null, '[]'::jsonb, null, null); raise exception 'FALLO';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

-- Cliente compra sin cabecera; funciones antiguas bloqueadas
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1"}';
do $$ declare v_o uuid; begin
  v_o := public.store_place_order(
    (select jsonb_agg(jsonb_build_object('product_id', id, 'quantity', 3)) from public.products where slug = 'arroz-extra-5kg'),
    'pickup', 'cash', gen_random_uuid(), 'Rosa', '987654321');
  assert (select catalog from public.orders where id = v_o) = 'store';
  begin perform public.place_order(null, '[]'::jsonb, null, 'cash', gen_random_uuid(), null, null, null, null); raise exception 'FALLO';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
\echo 'PRUEBAS POST-CORTE PASARON'
