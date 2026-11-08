-- Pruebas de reglas de negocio y seguridad (RLS) contra PostgreSQL local.
-- Uso: ver scripts/test-db.sh. Cada bloque falla con una excepción si algo no cumple.
\set ON_ERROR_STOP 1

-- Usuarios de prueba (el trigger crea sus perfiles como 'customer')
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.pe', '{"full_name":"Admin","role":"admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ana@test.pe', '{"full_name":"Ana","role":"admin"}'),
  ('00000000-0000-0000-0000-00000000000c', 'luis@test.pe', '{"full_name":"Luis"}');

do $$ begin
  assert (select count(*) from public.profiles where role = 'customer') = 3,
    'El registro debe crear SIEMPRE clientes aunque la metadata pida admin';
end $$;

select public.promote_to_admin('admin@test.pe');
-- abrir todos los restaurantes demo para que las pruebas no dependan de la hora
update public.restaurants set opens_at = '00:00', closes_at = '00:00', is_accepting_orders = true;
update public.platform_settings set payment_card_enabled = true;

insert into public.addresses (id, user_id, label, street, district, lat, lng, is_default) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Casa', 'Av. Pardo 500', 'Miraflores', -12.1180, -77.0350, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 'Casa', 'Av. Arequipa 2000', 'Lince', -12.0850, -77.0340, true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b', 'Lejos', 'Km 60 Panamericana Sur', 'Chilca', -12.5200, -76.7400, false);

insert into public.couriers (id, full_name, phone, status, location_consent)
  values ('20000000-0000-0000-0000-000000000001', 'Pedro Repartidor', '+51 999 888 777', 'active', true);

-- ===================== Como cliente Ana =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';

do $$
declare v_err text;
begin
  -- No puede auto-promoverse
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FALLO: un cliente pudo cambiar su rol';
  exception when insufficient_privilege then null;
  end;
  -- Puede editar su nombre
  update public.profiles set full_name = 'Ana Pérez' where id = auth.uid();
  assert (select full_name from public.profiles where id = auth.uid()) = 'Ana Pérez';
  -- No ve otros perfiles
  assert (select count(*) from public.profiles) = 1, 'Un cliente ve perfiles ajenos';
  -- No puede llamar funciones de admin
  begin
    perform public.admin_dashboard_stats();
    raise exception 'FALLO: cliente accedió a estadísticas';
  exception when insufficient_privilege then null;
  end;
  -- No puede insertar pedidos directamente
  begin
    insert into public.orders (user_id, restaurant_id, delivery_address, payment_method, subtotal, delivery_fee, total, commission_rate, idempotency_key)
      select auth.uid(), id, 'x', 'cash', 1, 0, 1, 0, gen_random_uuid() from public.restaurants limit 1;
    raise exception 'FALLO: insert directo en orders permitido';
  exception when insufficient_privilege then null;
  end;
  -- No ve repartidores ni auditoría
  assert (select count(*) from public.couriers) = 0, 'Cliente ve repartidores';
  assert (select count(*) from public.admin_audit_logs) = 0, 'Cliente ve auditoría';
  -- No puede modificar productos
  update public.products set price = 0.01;
  assert (select count(*) from public.products where price = 0.01) = 0, 'Cliente modificó precios';
end $$;

-- Cotización: precios desde la BD, opciones validadas
do $$
declare v jsonb; v_rest uuid; v_prod uuid;
begin
  select id into v_rest from public.restaurants where slug = 'smash-lab';
  select id into v_prod from public.products where restaurant_id = v_rest and name = 'Doble Smash Clásica';
  v := public.quote_order(v_rest, jsonb_build_array(jsonb_build_object(
        'product_id', v_prod, 'quantity', 2,
        'options', jsonb_build_array(jsonb_build_object('group','Punto','choice','Jugosa'),
                                     jsonb_build_object('group','Extras','choice','Tocino')))),
       null, '10000000-0000-0000-0000-000000000001');
  assert (v ->> 'subtotal')::numeric = 67.80, 'Subtotal esperado 67.80, obtenido ' || (v ->> 'subtotal');
  assert (v ->> 'delivery_fee')::numeric >= 5.90, 'Envío mínimo del local';
  -- opción obligatoria faltante
  begin
    perform public.quote_order(v_rest, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 1)));
    raise exception 'FALLO: aceptó sin opción obligatoria';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- opción inventada con precio negativo
  begin
    perform public.quote_order(v_rest, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 1,
      'options', jsonb_build_array(jsonb_build_object('group','Punto','choice','Jugosa'), jsonb_build_object('group','Hack','choice','x')))));
    raise exception 'FALLO: aceptó opción inexistente';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- cupón con mínimo
  v := public.quote_order(v_rest, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 2,
        'options', jsonb_build_array(jsonb_build_object('group','Punto','choice','Jugosa')))), 'bienvenido20');
  assert (v ->> 'discount')::numeric = 11.96, 'Descuento 20% esperado 11.96, obtenido ' || (v ->> 'discount');
  -- fuera de zona de reparto
  begin
    perform public.quote_order(v_rest, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 1,
      'options', jsonb_build_array(jsonb_build_object('group','Punto','choice','Jugosa')))), null, '10000000-0000-0000-0000-000000000003');
    raise exception 'FALLO: aceptó dirección fuera de zona';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
end $$;

-- Pedido idempotente + stock + cupón
do $$
declare v_rest uuid; v_prod uuid; v_o1 uuid; v_o2 uuid; v_stock int; v_items jsonb;
begin
  select id into v_rest from public.restaurants where slug = 'brasa-norte';
  select id, stock into v_prod, v_stock from public.products where restaurant_id = v_rest and name = 'Pollo entero familiar';
  v_items := jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 2));
  v_o1 := public.place_order(v_rest, v_items, '10000000-0000-0000-0000-000000000001', 'cash',
    '30000000-0000-0000-0000-000000000001', 'BIENVENIDO20', 'Sin cebolla', 'Puerta verde');
  v_o2 := public.place_order(v_rest, v_items, '10000000-0000-0000-0000-000000000001', 'cash',
    '30000000-0000-0000-0000-000000000001', 'BIENVENIDO20');
  assert v_o1 = v_o2, 'La misma clave de idempotencia debe devolver el mismo pedido';
  assert (select count(*) from public.orders) = 1, 'Se duplicó el pedido';
  assert (select stock from public.products where id = v_prod) = v_stock - 2, 'No se descontó stock';
  assert (select discount from public.orders where id = v_o1) = 15, 'Tope del cupón (S/15) no aplicado';
  assert (select payment_status from public.orders where id = v_o1) = 'pending', 'El pago no debe nacer aprobado';
  assert (select count(*) from public.notifications) = 1, 'Falta notificación de pedido recibido';
  assert (select count(*) from public.order_status_history where order_id = v_o1) = 1;
  -- Reusar cupón (límite 1 por usuario)
  begin
    perform public.place_order(v_rest, v_items, '10000000-0000-0000-0000-000000000001', 'cash',
      gen_random_uuid(), 'BIENVENIDO20');
    raise exception 'FALLO: cupón reutilizado';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- Stock insuficiente
  begin
    perform public.place_order(v_rest, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 50)),
      '10000000-0000-0000-0000-000000000001', 'cash', gen_random_uuid());
    raise exception 'FALLO: vendió sin stock';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- Dirección ajena
  begin
    perform public.place_order(v_rest, v_items, '10000000-0000-0000-0000-000000000002', 'cash', gen_random_uuid());
    raise exception 'FALLO: usó dirección ajena';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- Pago con tarjeta: queda pendiente
  v_o2 := public.place_order(v_rest, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 1)),
    '10000000-0000-0000-0000-000000000001', 'card', '30000000-0000-0000-0000-000000000002');
  assert (select status from public.payments where order_id = v_o2) = 'pending';
end $$;
commit;

-- Producto agotado (stock 0)
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
do $$
declare v_prod uuid; v_rest uuid;
begin
  select p.id, p.restaurant_id into v_prod, v_rest from public.products p where p.name = 'Pan al ajo con burrata';
  begin
    perform public.place_order(v_rest, jsonb_build_array(jsonb_build_object('product_id', v_prod, 'quantity', 1)),
      '10000000-0000-0000-0000-000000000001', 'cash', gen_random_uuid());
    raise exception 'FALLO: vendió producto agotado';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
end $$;
commit;

-- ===================== Como cliente Luis (no debe ver datos de Ana) =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
do $$
declare v_any uuid;
begin
  assert (select count(*) from public.orders) = 0, 'Luis ve pedidos de Ana';
  assert (select count(*) from public.order_items) = 0, 'Luis ve items de Ana';
  assert (select count(*) from public.payments) = 0, 'Luis ve pagos de Ana';
  assert (select count(*) from public.addresses) = 1, 'Luis ve direcciones ajenas';
  assert (select count(*) from public.notifications) = 0, 'Luis ve notificaciones ajenas';
  select id into v_any from public.orders limit 1;
  -- Intentar cancelar el pedido de Ana
  select id into v_any from public.addresses limit 1;
  begin
    perform public.cancel_my_order((select o.id from public.orders o limit 1));
    raise exception 'FALLO';
  exception when others then
    if sqlerrm = 'FALLO' then raise exception 'FALLO: Luis canceló pedido ajeno'; end if;
  end;
  -- Intentar insertar dirección para otro usuario
  begin
    insert into public.addresses (user_id, street) values ('00000000-0000-0000-0000-00000000000b', 'Calle falsa 123');
    raise exception 'FALLO: dirección para otro usuario';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- ===================== Anónimo =====================
begin;
set local role anon;
do $$ begin
  assert (select count(*) from public.restaurants) >= 9, 'Anónimo debe ver catálogo aprobado';
  assert (select count(*) from public.orders) = 0;
  assert (select count(*) from public.coupons) = 3, 'Anónimo ve solo promociones públicas';
  begin
    perform public.place_order(null, '[]', null, 'cash', gen_random_uuid());
    raise exception 'FALLO: anónimo pudo llamar place_order';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- ===================== Admin =====================
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
do $$
declare v_o uuid; v_card uuid; v_stats jsonb; v_pay uuid;
begin
  assert public.is_admin(), 'admin@test.pe debe ser admin';
  select id into v_o from public.orders where payment_method = 'cash';
  select id into v_card from public.orders where payment_method = 'card';
  -- Transición inválida
  begin
    perform public.admin_update_order_status(v_o, 'delivered');
    raise exception 'FALLO: saltó estados';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- Tarjeta sin confirmar no puede aceptarse
  begin
    perform public.admin_update_order_status(v_card, 'accepted');
    raise exception 'FALLO: aceptó pedido con tarjeta no pagado';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- Admin no puede confirmar pagos con tarjeta manualmente
  select id into v_pay from public.payments where order_id = v_card;
  begin
    perform public.admin_review_payment(v_pay, true);
    raise exception 'FALLO: admin aprobó tarjeta a mano';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  perform public.admin_update_order_status(v_o, 'accepted');
  perform public.admin_update_order_status(v_o, 'preparing');
  perform public.admin_assign_courier(v_o, '20000000-0000-0000-0000-000000000001');
  assert (select status from public.orders where id = v_o) = 'courier_assigned';
  v_stats := public.admin_dashboard_stats();
  assert (v_stats ->> 'orders_total')::int = 2, 'Stats: total de pedidos';
  assert jsonb_array_length(v_stats -> 'daily') = 30, 'Stats: serie diaria';
  assert (select count(*) from public.admin_audit_logs) >= 3, 'Faltan registros de auditoría';
  -- No puede auto-cambiar el rol de otros por la API
  begin
    update public.profiles set role = 'admin' where email = 'luis@test.pe';
    raise exception 'FALLO: admin asignó rol por API';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

-- ===================== Repartidor (service_role vía API) =====================
begin;
set local role service_role;
do $$
declare v_o uuid;
begin
  select id into v_o from public.orders where status = 'courier_assigned';
  assert public.courier_report_location('20000000-0000-0000-0000-000000000001', -12.12, -77.03) = 1;
  perform public.courier_advance_order('20000000-0000-0000-0000-000000000001', v_o, 'picked_up');
  perform public.courier_advance_order('20000000-0000-0000-0000-000000000001', v_o, 'on_the_way');
  perform public.courier_advance_order('20000000-0000-0000-0000-000000000001', v_o, 'delivered');
  assert (select delivered_at is not null from public.orders where id = v_o);
end $$;
commit;

-- Ana ve la ubicación solo mientras el pedido está en ruta; ahora ya fue entregado
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b"}';
do $$
declare v_o uuid; v_card uuid; v_rating numeric;
begin
  select id into v_o from public.orders where status = 'delivered';
  assert (select count(*) from public.delivery_locations) = 0, 'Ubicación visible tras la entrega';
  perform public.submit_review(v_o, 5::smallint, 'Excelente');
  select rating_avg into v_rating from public.restaurants r join public.orders o on o.restaurant_id = r.id where o.id = v_o;
  assert v_rating > 0, 'La calificación no se actualizó';
  begin
    perform public.submit_review(v_o, 1::smallint, 'otra');
    raise exception 'FALLO: reseña duplicada';
  exception when raise_exception then
    if sqlerrm like 'FALLO%' then raise; end if;
  end;
  -- Cancelar pedido con tarjeta pendiente: repone stock
  select id into v_card from public.orders where payment_method = 'card';
  perform public.cancel_my_order(v_card);
  assert (select status from public.orders where id = v_card) = 'cancelled';
  assert (select status from public.payments where order_id = v_card) = 'cancelled';
end $$;
commit;

-- Webhook: importe incorrecto nunca se marca aprobado
begin;
set local role service_role;
do $$
declare v_o uuid; v_r text;
begin
  select id into v_o from public.orders where payment_method = 'card';
  v_r := public.apply_card_payment(v_o, 'mp-123', 'approved', 1.00, '{}');
  assert v_r <> 'approved', 'Importe distinto marcado como aprobado';
end $$;
commit;

-- Las funciones internas no son invocables por clientes
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c"}';
do $$ begin
  begin
    perform public.apply_card_payment(gen_random_uuid(), 'x', 'approved', 1, '{}');
    raise exception 'FALLO: cliente invocó apply_card_payment';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.courier_advance_order(gen_random_uuid(), gen_random_uuid(), 'delivered');
    raise exception 'FALLO: cliente invocó courier_advance_order';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public._price_order(gen_random_uuid(), '[]', null, null, null, null, true);
    raise exception 'FALLO: cliente invocó _price_order';
  exception when insufficient_privilege then null;
  end;
end $$;
commit;

\echo 'TODAS LAS PRUEBAS DE BASE DE DATOS PASARON'
