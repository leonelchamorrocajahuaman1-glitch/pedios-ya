-- Pruebas del minimarket MULTIPRODUCTOS HUAYTALLA (se ejecutan después de 01_*)
\set ON_ERROR_STOP 1

-- Preparación como superusuario
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'rosa@test.pe', '{"full_name":"Rosa Quispe","phone":"987 111 222"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'jorge@test.pe', '{"full_name":"Jorge Huamán"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'jefa@test.pe', '{"full_name":"Jefa Huaytalla"}');
select public.promote_to_admin('jefa@test.pe');
insert into public.addresses (id, user_id, label, street, district, reference, is_default) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'Casa', 'Jr. Las Flores 123', 'San Juan de Lurigancho', 'Puerta verde', true),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d2', 'Casa', 'Av. Lima 456', 'Ate', null, true);

-- ===================== Aislamiento entre apps =====================
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.products where catalog = 'store') = 0, 'La app anterior no debe ver productos del minimarket';
  assert (select count(*) from public.categories where catalog = 'store') = 0, 'La app anterior no debe ver categorías del minimarket';
  assert (select count(*) from public.categories) = 9, 'La app anterior sigue viendo sus 9 categorías';
end $$;
set local request.headers = '{"x-app":"huaytalla"}';
do $$
declare v jsonb; v_snack uuid; v_oliva public.products;
begin
  assert (select count(*) from public.categories where parent_id is null) = 15, 'La tienda ve sus 15 categorías';
  assert (select count(*) from public.categories where catalog = 'marketplace') = 0, 'La tienda no ve categorías antiguas';
  assert (select count(*) from public.products where catalog = 'store') = 74, 'La tienda ve los 74 productos activos';
  select * into v_oliva from public.products where slug = 'aceite-de-oliva-500ml';
  assert public.final_price(v_oliva) = 19.92, 'Promoción 20% oliva: ' || public.final_price(v_oliva);
  assert public.discount_percent(v_oliva) = 20;
  assert (select count(*) from public.promotions) = 3, 'Anónimo ve promociones vigentes';
  assert (select count(*) from public.coupons) = 2, 'Anónimo ve los 2 cupones públicos de la tienda';
  assert (select count(*) from public.payment_methods) = 3, 'La tarjeta no se muestra';
  assert (select count(*) from public.inventory_movements) = 0, 'Anónimo no ve inventario';
  -- Cotización sin sesión: papas (15% snacks) x2 + agua x10
  select id into v_snack from public.products where slug = 'papas-fritas-clasicas-150g';
  v := public.store_quote(jsonb_build_array(
         jsonb_build_object('product_id', v_snack, 'quantity', 2, 'price', 0.01),
         jsonb_build_object('product_id', (select id from public.products where slug = 'agua-sin-gas-625ml'), 'quantity', 10)));
  assert (v ->> 'subtotal')::numeric = 22.64, 'Subtotal con promo de categoría e ignorando el precio enviado: ' || (v ->> 'subtotal');
  assert (v ->> 'delivery_fee')::numeric = 5.00, 'Delivery general S/5';
  assert (v ->> 'total')::numeric = 27.64;
  -- Compra mínima
  begin
    perform public.store_quote(jsonb_build_array(jsonb_build_object('product_id', v_snack, 'quantity', 1)));
    raise exception 'FALLO: aceptó compra bajo el mínimo';
  exception when raise_exception then if sqlerrm like 'FALLO%' then raise; end if; end;
  -- Agotado
  begin
    perform public.store_quote(jsonb_build_array(jsonb_build_object('product_id',
      (select id from public.products where slug = 'arroz-extra-5kg'), 'quantity', 1),
      jsonb_build_object('product_id', (select id from public.products where slug = 'bombones-surtidos-200g'), 'quantity', 1)));
    raise exception 'FALLO: cotizó un producto agotado';
  exception when raise_exception then if sqlerrm like 'FALLO%' then raise; end if; end;
  -- Pedido sin sesión
  begin
    perform public.store_place_order('[]', 'pickup', 'cash', gen_random_uuid(), 'X', '999999999');
    raise exception 'FALLO: anónimo creó pedido';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- ===================== El precio de compra es privado =====================
begin;
set local role anon;
set local request.headers = '{"x-app":"huaytalla"}';
do $$ begin
  begin
    perform count(*) from public.product_costs;
    raise exception 'FALLO';
  exception when others then if sqlerrm = 'FALLO' then raise exception 'FALLO: anónimo leyó costos'; end if; end;
end $$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1"}';
do $$ begin
  assert (select count(*) from public.product_costs) = 0, 'Un cliente no ve costos';
end $$;
rollback;
begin;
set local role postgres;
do $$ begin
  assert (select count(*) from public.product_costs) = 74, 'Los 74 productos demo conservan su costo';
  assert (select count(*) from public.order_item_costs) = 0, 'Sin ventas todavía';
end $$;
rollback;

-- ===================== Cliente Rosa: compra =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1"}';
set local request.headers = '{"x-app":"huaytalla"}';
do $$
declare v_arroz uuid; v_alm uuid; v_o1 uuid; v_o2 uuid; v_o3 uuid; v_stock int; v jsonb;
begin
  select id, stock into v_arroz, v_stock from public.products where slug = 'arroz-extra-5kg';
  -- Delivery + efectivo + cupón 10% (tope 15)
  v_o1 := public.store_place_order(jsonb_build_array(jsonb_build_object('product_id', v_arroz, 'quantity', 2)),
            'delivery', 'cash', '50000000-0000-0000-0000-000000000001', 'Rosa Quispe', '987 111 222',
            '40000000-0000-0000-0000-000000000001', 'Frente al parque', 'bienvenida10', 'Tocar el timbre');
  v_o2 := public.store_place_order(jsonb_build_array(jsonb_build_object('product_id', v_arroz, 'quantity', 2)),
            'delivery', 'cash', '50000000-0000-0000-0000-000000000001', 'Rosa Quispe', '987 111 222',
            '40000000-0000-0000-0000-000000000001', null, 'BIENVENIDA10');
  assert v_o1 = v_o2, 'Idempotencia: misma clave, mismo pedido';
  assert (select count(*) from public.orders) = 1, 'Pedido duplicado';
  select to_jsonb(o) into v from public.orders o where id = v_o1;
  assert v ->> 'code' like 'HU-%', 'Código HU-';
  assert (v ->> 'subtotal')::numeric = 45.80 and (v ->> 'coupon_discount')::numeric = 4.58 and (v ->> 'delivery_fee')::numeric = 5.00
     and (v ->> 'total')::numeric = 46.22, 'Totales: ' || v::text;
  assert v ->> 'payment_status' = 'pending' and v ->> 'status' = 'received', 'Nace pendiente';
  assert (select stock from public.products where id = v_arroz) = v_stock - 2, 'Stock descontado';
  assert (select unit_cost from public.order_items where order_id = v_o1) is null, 'El costo no queda en order_items (visible al cliente)';
  assert (select count(*) from public.order_item_costs) = 0, 'El cliente no ve los costos de venta';
  -- Reusar cupón (1 por cliente)
  begin
    perform public.store_place_order(jsonb_build_array(jsonb_build_object('product_id', v_arroz, 'quantity', 1)),
      'pickup', 'cash', gen_random_uuid(), 'Rosa', '987111222', null, null, 'BIENVENIDA10');
    raise exception 'FALLO: reutilizó cupón';
  exception when raise_exception then if sqlerrm like 'FALLO%' then raise; end if; end;
  -- Última unidad: almendras tiene 3
  select id into v_alm from public.products where slug = 'almendras-200g';
  begin
    perform public.store_place_order(jsonb_build_array(jsonb_build_object('product_id', v_alm, 'quantity', 4),
      jsonb_build_object('product_id', v_arroz, 'quantity', 1)), 'pickup', 'cash', gen_random_uuid(), 'Rosa', '987111222');
    raise exception 'FALLO: vendió más stock del disponible';
  exception when raise_exception then if sqlerrm like 'FALLO%' then raise; end if; end;
  -- Recojo en tienda: sin dirección ni delivery; promoción automática ≥ S/100
  v_o3 := public.store_place_order(jsonb_build_array(jsonb_build_object('product_id', v_alm, 'quantity', 3),
            jsonb_build_object('product_id', v_arroz, 'quantity', 3)), 'pickup', 'cash', gen_random_uuid(), 'Rosa', '987111222');
  select to_jsonb(o) into v from public.orders o where id = v_o3;
  assert (v ->> 'delivery_fee')::numeric = 0 and v ->> 'delivery_address' = 'Recojo en tienda', 'Recojo sin delivery';
  assert (v ->> 'promotion_discount')::numeric = 5, 'Promo automática S/5 desde S/100: ' || v::text;
  assert (select stock from public.products where id = v_alm) = 0, 'Última unidad vendida';
  -- Yape sin número configurado
  begin
    perform public.store_place_order(jsonb_build_array(jsonb_build_object('product_id', v_arroz, 'quantity', 1)),
      'pickup', 'yape', gen_random_uuid(), 'Rosa', '987111222');
    raise exception 'FALLO: aceptó Yape sin datos del negocio';
  exception when raise_exception then if sqlerrm like 'FALLO%' then raise; end if; end;
  -- No ve inventario ni puede moverlo
  assert (select count(*) from public.inventory_movements) = 0, 'Cliente ve inventario';
  begin
    perform public.admin_inventory_move(v_arroz, 'in', 10, 'x');
    raise exception 'FALLO';
  exception when insufficient_privilege then null; end;
  begin
    update public.products set price = 0.10 where id = v_arroz;
    assert (select price from public.products where id = v_arroz) <> 0.10, 'FALLO: cliente cambió precios';
  end;
end $$;
commit;

-- ===================== Admin configura Yape =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3"}';
do $$ begin
  update public.payment_methods set phone_number = '987 654 321', account_holder = 'Multiproductos Huaytalla' where code in ('yape', 'plin');
  assert (select count(*) from public.payment_methods where phone_number is not null) = 2, 'Admin configuró Yape/Plin';
end $$;
commit;

-- ===================== Rosa paga con Yape y sube comprobante =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1"}';
set local request.headers = '{"x-app":"huaytalla"}';
do $$
declare v_o uuid;
begin
  v_o := public.store_place_order(jsonb_build_array(jsonb_build_object('product_id',
           (select id from public.products where slug = 'aceite-de-oliva-500ml'), 'quantity', 2)),
         'delivery', 'yape', '50000000-0000-0000-0000-000000000099', 'Rosa Quispe', '987111222', '40000000-0000-0000-0000-000000000001');
  -- Subida al bucket privado: solo en su carpeta
  insert into storage.objects (bucket_id, name) values ('payment-proofs', '00000000-0000-0000-0000-0000000000d1/voucher.jpg');
  begin
    insert into storage.objects (bucket_id, name) values ('payment-proofs', '00000000-0000-0000-0000-0000000000d2/voucher.jpg');
    raise exception 'FALLO: subió comprobante en carpeta ajena';
  exception when insufficient_privilege then null; end;
  begin
    perform public.store_report_payment(v_o, '12345678', '00000000-0000-0000-0000-0000000000d2/voucher.jpg');
    raise exception 'FALLO: aceptó comprobante ajeno';
  exception when raise_exception then if sqlerrm like 'FALLO%' then raise; end if; end;
  perform public.store_report_payment(v_o, '12345678', '00000000-0000-0000-0000-0000000000d1/voucher.jpg');
  assert (select payment_status from public.orders where id = v_o) = 'pending_verification', 'Yape por verificar, nunca pagado';
  assert (select proof_path from public.payments where order_id = v_o) like '00000000-0000-0000-0000-0000000000d1/%';
end $$;
commit;

-- ===================== Jorge no ve nada de Rosa =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2"}';
set local request.headers = '{"x-app":"huaytalla"}';
do $$ begin
  assert (select count(*) from public.orders) + (select count(*) from public.order_items) + (select count(*) from public.payments) = 0,
    'Jorge ve pedidos de Rosa';
  assert (select count(*) from storage.objects where bucket_id = 'payment-proofs') = 0, 'Jorge ve comprobantes ajenos';
  begin
    perform public.store_report_payment((select id from public.orders limit 1), '99999999');
    raise exception 'FALLO';
  exception when others then if sqlerrm = 'FALLO' then raise exception 'FALLO: Jorge reportó pago ajeno'; end if; end;
  begin
    perform public.admin_store_dashboard();
    raise exception 'FALLO';
  exception when insufficient_privilege then null; end;
end $$;
commit;

-- ===================== Administradora =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3"}';
do $$
declare v_yape uuid; v_cash uuid; v_pick uuid; v_pay uuid; v_ok boolean; v_arroz uuid; v_s jsonb; v_stock int;
begin
  select id into v_yape from public.orders where catalog = 'store' and payment_method = 'yape';
  select id into v_cash from public.orders where catalog = 'store' and fulfillment = 'delivery' and payment_method = 'cash';
  select id into v_pick from public.orders where catalog = 'store' and fulfillment = 'pickup';
  assert (select count(*) from storage.objects where bucket_id = 'payment-proofs') = 1, 'Admin ve comprobantes';
  -- No confirma Yape sin verificar el pago
  begin perform public.admin_set_order_status(v_yape, 'accepted'); v_ok := false;
  exception when raise_exception then v_ok := true; end;
  assert v_ok, 'Confirmó Yape sin verificar';
  select id into v_pay from public.payments where order_id = v_yape;
  perform public.admin_review_payment(v_pay, true, 'Operación verificada en la app');
  perform public.admin_set_order_status(v_yape, 'accepted');
  -- Flujo delivery completo con repartidor
  perform public.admin_set_order_status(v_cash, 'accepted');
  begin perform public.admin_set_order_status(v_cash, 'on_the_way'); v_ok := false;
  exception when raise_exception then v_ok := true; end;
  assert v_ok, 'Saltó estados';
  perform public.admin_set_order_status(v_cash, 'preparing');
  perform public.admin_set_order_status(v_cash, 'ready');
  perform public.admin_set_delivery_person(v_cash, 'Luis Mamani', '912 345 678');
  perform public.admin_set_order_status(v_cash, 'on_the_way');
  perform public.admin_set_order_status(v_cash, 'delivered');
  assert (select delivered_at is not null and delivery_person_name = 'Luis Mamani' from public.orders where id = v_cash);
  assert (select string_agg(status::text, ',' order by id) from public.order_status_history where order_id = v_cash)
    = 'received,accepted,preparing,ready,on_the_way,delivered', 'Historial completo';
  -- Recojo: listo → entregado (sin "en camino")
  perform public.admin_set_order_status(v_pick, 'accepted');
  perform public.admin_set_order_status(v_pick, 'preparing');
  perform public.admin_set_order_status(v_pick, 'ready');
  begin perform public.admin_set_order_status(v_pick, 'on_the_way'); v_ok := false;
  exception when raise_exception then v_ok := true; end;
  assert v_ok, 'Recojo no debe pasar por "en camino"';
  perform public.admin_set_order_status(v_pick, 'delivered');
  -- Cancelar repone stock y lo registra
  select id, stock into v_arroz, v_stock from public.products where slug = 'aceite-de-oliva-500ml';
  perform public.admin_set_order_status(v_yape, 'cancelled', 'Cliente desistió');
  assert (select stock from public.products where id = v_arroz) = v_stock + 2, 'Stock repuesto al cancelar';
  assert exists (select 1 from public.inventory_movements where order_id = v_yape and type = 'sale_cancel' and quantity = 2);
  -- Inventario
  select id, stock into v_arroz, v_stock from public.products where slug = 'arroz-extra-5kg';
  assert public.admin_inventory_move(v_arroz, 'in', 20, 'Compra a proveedor') = v_stock + 20;
  begin perform public.admin_inventory_move(v_arroz, 'out', 5, ''); v_ok := false;
  exception when raise_exception then v_ok := true; end;
  assert v_ok, 'Salida sin motivo';
  begin perform public.admin_inventory_move(v_arroz, 'out', 100000, 'Merma'); v_ok := false;
  exception when raise_exception then v_ok := true; end;
  assert v_ok, 'Stock negativo';
  assert public.admin_inventory_move(v_arroz, 'adjustment', 10, 'Conteo físico') = 10;
  assert (select string_agg(type, ',' order by id) from public.inventory_movements where product_id = v_arroz)
    = 'in,sale,sale,in,adjustment', 'Historial de inventario: ' ||
      (select string_agg(type, ',' order by id) from public.inventory_movements where product_id = v_arroz);
  assert (select created_by from public.inventory_movements where product_id = v_arroz order by id desc limit 1)
    = '00000000-0000-0000-0000-0000000000d3', 'Usuario responsable';
  -- Estadísticas y reportes
  v_s := public.admin_store_dashboard();
  assert (v_s ->> 'orders_delivered')::int = 2 and (v_s ->> 'orders_cancelled')::int = 1, 'Dashboard: ' || v_s::text;
  assert (v_s ->> 'sales_today')::numeric = (select sum(total) from public.orders where catalog = 'store' and status = 'delivered');
  assert (v_s ->> 'products_out_of_stock')::int = 2, 'Agotados: bombones y almendras: ' || (v_s ->> 'products_out_of_stock');
  assert jsonb_array_length(v_s -> 'top_products') >= 2;
  assert (select sum(revenue) from public.admin_sales_report(current_date - 1, current_date + 1, 'day'))
       = (select sum(total) from public.orders where catalog = 'store' and status = 'delivered'), 'Reporte de ventas cuadra';
  assert (select count(*) from public.admin_product_sales(current_date - 30, current_date + 1)) = 74, 'Reporte por producto incluye los no vendidos';
  assert (select orders from public.admin_customers('rosa')) = 3, 'Ficha de cliente';
  -- Roles: ni la admin asigna roles por la API
  begin update public.profiles set role = 'admin' where email = 'jorge@test.pe'; v_ok := false;
  exception when insufficient_privilege then v_ok := true; end;
  assert v_ok, 'Asignó rol por API';
end $$;
commit;

-- ===================== Pedidos de prueba no alteran reportes =====================
begin;
set local role authenticated;
set local request.headers = '{"x-app":"huaytalla"}';
do $$
declare v_before jsonb; v_after jsonb; v_o uuid; v_ok boolean; v_rep numeric; v_bs int;
begin
  -- Un cliente no puede marcarse como cuenta de prueba
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2"}', true);
  begin update public.profiles set is_test = true where id = auth.uid(); v_ok := false;
  exception when insufficient_privilege then v_ok := true; end;
  assert v_ok, 'Cliente se marcó como prueba';
  begin perform public.admin_set_test_account(auth.uid(), true); v_ok := false;
  exception when insufficient_privilege then v_ok := true; end;
  assert v_ok, 'Cliente usó función de admin';

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3"}', true);
  v_before := public.admin_store_dashboard();
  select sum(revenue) into v_rep from public.admin_sales_report(current_date - 1, current_date + 1, 'day');
  select count(*) into v_bs from public.store_best_sellers(24);
  perform public.admin_set_test_account('00000000-0000-0000-0000-0000000000d2', true);

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2"}', true);
  v_o := public.store_place_order(
    (select jsonb_agg(jsonb_build_object('product_id', id, 'quantity', 8)) from public.products where slug = 'agua-de-mesa-2-5l'),
    'pickup', 'cash', gen_random_uuid(), 'Jorge Prueba', '987654321');
  assert (select is_test from public.orders where id = v_o), 'El pedido hereda la marca de prueba';

  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3"}', true);
  perform public.admin_set_order_status(v_o, 'accepted');
  perform public.admin_set_order_status(v_o, 'preparing');
  perform public.admin_set_order_status(v_o, 'ready');
  perform public.admin_set_order_status(v_o, 'delivered');
  v_after := public.admin_store_dashboard();
  assert v_after ->> 'revenue_total' = v_before ->> 'revenue_total', 'Ingresos sin cambio: ' || (v_after ->> 'revenue_total');
  assert v_after ->> 'orders_delivered' = v_before ->> 'orders_delivered', 'Entregados sin cambio';
  assert v_after -> 'top_products' = v_before -> 'top_products', 'Top productos sin cambio';
  assert (v_after ->> 'customers')::int = (v_before ->> 'customers')::int - 1, 'La cuenta de prueba no cuenta como cliente';
  assert (select sum(revenue) from public.admin_sales_report(current_date - 1, current_date + 1, 'day')) = v_rep, 'Reporte sin cambio';
  assert (select count(*) from public.store_best_sellers(24)) = v_bs, 'Más vendidos sin cambio';
  assert (select qty from public.admin_product_sales(current_date - 1, current_date + 1) where sku is not null
          and product_id = (select id from public.products where slug = 'agua-de-mesa-2-5l')) = 0, 'Producto sin ventas reales';
  -- El stock real sí se descuenta (es inventario físico)
  assert exists (select 1 from public.inventory_movements where order_id = v_o and type = 'sale');
end $$;
rollback;

-- ===================== Limpieza de demo controlada =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3"}';
do $$
declare v jsonb;
begin
  insert into public.products (catalog, category_id, slug, name, price, stock, sku)
    select 'store', id, 'producto-real-1', 'Producto real', 10, 5, 'REAL-1' from public.categories where catalog = 'store' and slug = 'abarrotes';
  v := public.admin_purge_store_demo();
  assert (v ->> 'products')::int = 74, 'Eliminó los 74 demo: ' || v::text;
  assert (select count(*) from public.products where catalog = 'store') = 1, 'Conservó el producto real';
  assert (select count(*) from public.products where catalog = 'marketplace') = 37, 'No tocó el catálogo anterior';
  assert (select count(*) from public.order_items oi join public.orders o on o.id = oi.order_id where o.catalog = 'store') >= 4,
    'Los pedidos conservan sus productos';
end $$;
rollback;

begin;
set local role postgres;
do $$ begin
  assert (select count(*) from public.order_item_costs c join public.order_items oi on oi.id = c.order_item_id where c.unit_cost = 17.80) >= 1,
    'El costo de venta se guarda en la tabla privada';
end $$;
rollback;
begin;
set local role anon;
set local request.headers = '{"x-app":"huaytalla"}';
do $$ declare v jsonb; begin
  v := public.store_quote((select jsonb_agg(jsonb_build_object('product_id', id, 'quantity', 5)) from public.products where slug = 'arroz-extra-5kg'), null, 'pickup', null);
  assert not (v -> 'lines' -> 0 ? 'unit_cost'), 'La cotización pública no expone costos';
end $$;
rollback;

\echo 'TODAS LAS PRUEBAS DEL MINIMARKET PASARON'
