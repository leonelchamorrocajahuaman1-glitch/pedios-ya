-- =============================================================================
-- Mikuy · DATOS DE DEMOSTRACIÓN
-- Todo lo insertado aquí lleva is_demo = true y puede eliminarse desde
-- /admin/configuracion → "Eliminar datos de demostración" (admin_purge_demo_data).
-- Las categorías son parte del catálogo base y no se marcan como demo.
-- Imágenes: fotografías de Unsplash (licencia Unsplash, uso comercial permitido).
-- =============================================================================

insert into public.categories (slug, name, icon, image_url, sort_order) values
  ('hamburguesas', 'Hamburguesas', 'beef', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80', 1),
  ('pizzas', 'Pizzas', 'pizza', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80', 2),
  ('pollo-a-la-brasa', 'Pollo a la brasa', 'drumstick', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&q=80', 3),
  ('comida-peruana', 'Comida peruana', 'chef-hat', 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600&q=80', 4),
  ('sushi', 'Sushi', 'fish', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80', 5),
  ('postres', 'Postres', 'cake-slice', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80', 6),
  ('bebidas', 'Bebidas', 'cup-soda', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80', 7),
  ('supermercados', 'Supermercados', 'shopping-basket', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80', 8),
  ('farmacias', 'Farmacias', 'pill', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&q=80', 9)
on conflict (slug) do nothing;

insert into public.restaurants (slug, name, description, logo_url, cover_url, phone, address, district, lat, lng,
  rating_avg, rating_count, delivery_time_min, delivery_time_max, delivery_fee, min_order_amount, commission_rate,
  opens_at, closes_at, is_accepting_orders, is_featured, status, is_demo) values
  ('brasa-norte', 'Brasa Norte', 'Pollo a la brasa al carbón de algarrobo, papas nativas y cremas de la casa desde 1998.',
   'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&q=80', 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=1400&q=80',
   '+51 01 444 1200', 'Av. Benavides 1450', 'Miraflores', -12.1265, -77.0225, 4.8, 1240, 25, 40, 4.90, 20, 0.15, '11:00', '01:00', true, true, 'approved', true),
  ('smash-lab', 'Smash Lab', 'Hamburguesas smash con carne madurada, pan brioche artesanal y salsas fermentadas.',
   'https://images.unsplash.com/photo-1550547660-d9450f859349?w=200&q=80', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1400&q=80',
   '+51 01 555 2300', 'Calle Berlín 320', 'Miraflores', -12.1211, -77.0307, 4.7, 860, 20, 35, 5.90, 25, 0.16, '12:00', '02:00', true, true, 'approved', true),
  ('forno-limeno', 'Forno Limeño', 'Pizzas napolitanas en horno de leña con insumos peruanos: rocoto, ají amarillo y quesos andinos.',
   'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=200&q=80', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1400&q=80',
   '+51 01 610 3344', 'Av. Grau 680', 'Barranco', -12.1463, -77.0204, 4.6, 540, 30, 45, 5.50, 30, 0.15, '12:00', '23:30', true, true, 'approved', true),
  ('mar-de-barranco', 'Mar de Barranco', 'Cevichería criolla: ceviches, tiraditos, causas y chicharrón de pescado.',
   'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=200&q=80', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=1400&q=80',
   '+51 01 247 9900', 'Jr. Pedro de Osma 112', 'Barranco', -12.1503, -77.0215, 4.9, 2100, 30, 50, 6.50, 35, 0.18, '10:00', '18:00', true, true, 'approved', true),
  ('nikkei-kaze', 'Nikkei Kaze', 'Cocina nikkei contemporánea: makis acevichados, nigiris y tiraditos.',
   'https://images.unsplash.com/photo-1553621042-f6e147245754?w=200&q=80', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1400&q=80',
   '+51 01 421 7788', 'Av. Conquistadores 999', 'San Isidro', -12.1027, -77.0365, 4.8, 980, 35, 50, 6.90, 40, 0.18, '12:30', '23:00', true, true, 'approved', true),
  ('dulce-tentacion', 'Dulce Tentación', 'Pastelería de autor: tortas, alfajores, suspiro limeño y helados artesanales.',
   'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&q=80', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1400&q=80',
   '+51 01 345 6789', 'Av. Primavera 1230', 'Surco', -12.1105, -76.9935, 4.7, 610, 20, 35, 4.50, 15, 0.15, '09:00', '22:00', true, false, 'approved', true),
  ('jugueria-sol', 'Juguería del Sol', 'Jugos naturales, frappés, limonadas y cafés de especialidad de Villa Rica.',
   'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=200&q=80', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=1400&q=80',
   '+51 01 222 1100', 'Av. Larco 455', 'Miraflores', -12.1225, -77.0300, 4.5, 330, 15, 25, 3.90, 10, 0.14, '07:00', '21:00', true, false, 'approved', true),
  ('mercado-fresco', 'Mercado Fresco', 'Supermercado de barrio: frutas, verduras, abarrotes y lácteos con entrega en minutos.',
   'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&q=80', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80',
   '+51 01 700 8080', 'Av. Javier Prado Este 2200', 'San Borja', -12.0889, -77.0031, 4.6, 1500, 25, 45, 5.90, 30, 0.10, '07:00', '23:00', true, true, 'approved', true),
  ('botica-vital', 'Botica Vital 24h', 'Medicamentos de venta libre, cuidado personal y bebés. Atención las 24 horas.',
   'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=200&q=80', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1400&q=80',
   '+51 01 600 2424', 'Av. Arequipa 3100', 'San Isidro', -12.0975, -77.0340, 4.7, 720, 20, 35, 4.90, 0, 0.10, '00:00', '00:00', true, false, 'approved', true),
  ('anticucheria-tia-rosa', 'Anticuchería Tía Rosa', 'Anticuchos, rachi y picarones al estilo tradicional limeño.',
   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&q=80', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1400&q=80',
   '+51 01 330 4411', 'Av. Angamos Oeste 820', 'Miraflores', -12.1132, -77.0368, 4.6, 450, 25, 40, 4.90, 20, 0.15, '18:00', '23:59', false, false, 'approved', true)
on conflict (slug) do nothing;

-- Relación restaurante ↔ categoría
insert into public.restaurant_categories (restaurant_id, category_id)
select r.id, c.id from (values
  ('brasa-norte', 'pollo-a-la-brasa'), ('brasa-norte', 'comida-peruana'),
  ('smash-lab', 'hamburguesas'), ('smash-lab', 'bebidas'),
  ('forno-limeno', 'pizzas'),
  ('mar-de-barranco', 'comida-peruana'),
  ('nikkei-kaze', 'sushi'), ('nikkei-kaze', 'comida-peruana'),
  ('dulce-tentacion', 'postres'),
  ('jugueria-sol', 'bebidas'), ('jugueria-sol', 'postres'),
  ('mercado-fresco', 'supermercados'), ('mercado-fresco', 'bebidas'),
  ('botica-vital', 'farmacias'),
  ('anticucheria-tia-rosa', 'comida-peruana')
) as x(r_slug, c_slug)
join public.restaurants r on r.slug = x.r_slug
join public.categories c on c.slug = x.c_slug
on conflict do nothing;

-- Productos
insert into public.products (restaurant_id, category_id, section, name, description, image_url, price, compare_at_price,
  stock, is_available, is_popular, options, sort_order, is_demo)
select r.id, c.id, x.section, x.name, x.description, 'https://images.unsplash.com/' || x.img || '?w=800&q=80',
  x.price, x.compare_at, x.stock, x.available, x.popular, x.options::jsonb, x.sort_order, true
from (values
  -- Brasa Norte
  ('brasa-norte', 'pollo-a-la-brasa', 'Pollos', '1/4 Pollo a la brasa', 'Pierna o pecho, papas fritas, ensalada fresca y cremas.', 'photo-1598103442097-8b74394b95c6', 21.90, null::numeric, null::int, true, true,
   '[{"name":"Presa","required":true,"max":1,"choices":[{"name":"Pierna","price":0},{"name":"Pecho","price":1.5}]},{"name":"Acompañamiento","required":true,"max":1,"choices":[{"name":"Papas fritas","price":0},{"name":"Papas nativas","price":3},{"name":"Ensalada extra","price":0}]}]', 1),
  ('brasa-norte', 'pollo-a-la-brasa', 'Pollos', '1/2 Pollo a la brasa', 'Medio pollo al carbón, papas familiares y ensalada.', 'photo-1532550907401-a500c9a57435', 38.90, 42.90, null, true, true,
   '[{"name":"Bebida","required":false,"max":1,"choices":[{"name":"Chicha morada 1L","price":8},{"name":"Inca Kola 1L","price":7}]}]', 2),
  ('brasa-norte', 'pollo-a-la-brasa', 'Pollos', 'Pollo entero familiar', 'Pollo entero, papas familiares, ensalada y gaseosa 1.5L.', 'photo-1626082927389-6cd097cdc6ec', 72.90, 79.90, 40, true, true, '[]', 3),
  ('brasa-norte', 'comida-peruana', 'Para picar', 'Mollejitas a la parrilla', 'Mollejas marinadas con papas doradas y chimichurri.', 'photo-1555939594-58d7cb561ad1', 24.50, null, null, true, false, '[]', 4),
  ('brasa-norte', 'bebidas', 'Bebidas', 'Chicha morada 1L', 'Preparada en casa con maíz morado, piña y canela.', 'photo-1622483767028-3f66f32aef97', 9.90, null, 60, true, false, '[]', 5),
  -- Smash Lab
  ('smash-lab', 'hamburguesas', 'Smash burgers', 'Doble Smash Clásica', 'Doble carne smash, cheddar, cebolla caramelizada, pepinillos y salsa Lab.', 'photo-1568901346375-23c9450c58cd', 29.90, null, null, true, true,
   '[{"name":"Punto","required":true,"max":1,"choices":[{"name":"Smash crocante","price":0},{"name":"Jugosa","price":0}]},{"name":"Extras","required":false,"max":3,"choices":[{"name":"Tocino","price":4},{"name":"Huevo frito","price":2.5},{"name":"Queso extra","price":3}]}]', 1),
  ('smash-lab', 'hamburguesas', 'Smash burgers', 'Burger Andina', 'Carne madurada, queso paria, salsa de rocoto y papas al hilo.', 'photo-1553979459-d2229ba7433b', 32.90, null, null, true, true,
   '[{"name":"Extras","required":false,"max":2,"choices":[{"name":"Tocino","price":4},{"name":"Palta","price":3.5}]}]', 2),
  ('smash-lab', 'hamburguesas', 'Smash burgers', 'Crispy Chicken', 'Pollo crocante, coleslaw y mayo de ají amarillo.', 'photo-1606755962773-d324e0a13086', 27.90, null, null, true, false, '[]', 3),
  ('smash-lab', 'hamburguesas', 'Combos', 'Combo Lab', 'Doble Smash + papas rústicas + bebida.', 'photo-1571091718767-18b5b1457add', 39.90, 46.80, 25, true, true,
   '[{"name":"Bebida","required":true,"max":1,"choices":[{"name":"Limonada","price":0},{"name":"Gaseosa","price":0},{"name":"Cerveza artesanal","price":6}]}]', 4),
  ('smash-lab', 'bebidas', 'Bebidas', 'Limonada frozen', 'Limón sutil, hierbabuena y hielo frappé.', 'photo-1523371054106-bbf80586c38c', 9.50, null, null, true, false, '[]', 5),
  -- Forno Limeño
  ('forno-limeno', 'pizzas', 'Pizzas', 'Margherita napolitana', 'San Marzano, fior di latte, albahaca y aceite de oliva.', 'photo-1574071318508-1cdbab80d002', 34.00, null, null, true, true,
   '[{"name":"Tamaño","required":true,"max":1,"choices":[{"name":"Personal","price":0},{"name":"Mediana","price":12},{"name":"Familiar","price":22}]}]', 1),
  ('forno-limeno', 'pizzas', 'Pizzas', 'Pepperoni al rocoto', 'Pepperoni artesanal, mozzarella y miel de rocoto.', 'photo-1628840042765-356cda07504e', 38.00, null, null, true, true,
   '[{"name":"Tamaño","required":true,"max":1,"choices":[{"name":"Personal","price":0},{"name":"Mediana","price":12},{"name":"Familiar","price":22}]}]', 2),
  ('forno-limeno', 'pizzas', 'Pizzas', 'Cuatro quesos andinos', 'Queso paria, andino, mozzarella y parmesano.', 'photo-1513104890138-7c749659a591', 39.00, null, null, true, false,
   '[{"name":"Tamaño","required":true,"max":1,"choices":[{"name":"Personal","price":0},{"name":"Mediana","price":12},{"name":"Familiar","price":22}]}]', 3),
  ('forno-limeno', 'pizzas', 'Entradas', 'Pan al ajo con burrata', 'Masa madre horneada con ajo confitado y burrata.', 'photo-1565299624946-b28f40a0ae38', 22.00, null, 0, true, false, '[]', 4),
  -- Mar de Barranco
  ('mar-de-barranco', 'comida-peruana', 'Ceviches', 'Ceviche clásico', 'Pesca del día, leche de tigre, camote glaseado y choclo.', 'photo-1535399831218-d5bd36d1a6b3', 39.90, null, null, true, true,
   '[{"name":"Picante","required":true,"max":1,"choices":[{"name":"Sin ají","price":0},{"name":"Normal","price":0},{"name":"Bien picante","price":0}]}]', 1),
  ('mar-de-barranco', 'comida-peruana', 'Ceviches', 'Ceviche mixto', 'Pescado, pulpo, langostinos y calamar en leche de tigre.', 'photo-1604908176997-125f25cc6f3d', 46.90, null, null, true, true, '[]', 2),
  ('mar-de-barranco', 'comida-peruana', 'Fondos', 'Arroz con mariscos', 'Arroz norteño con mariscos frescos y salsa criolla.', 'photo-1534080564583-6be75777b70a', 42.90, null, null, true, false, '[]', 3),
  ('mar-de-barranco', 'comida-peruana', 'Fondos', 'Chicharrón de pescado', 'Pescado crocante con yuca frita y salsa tártara.', 'photo-1504674900247-0877df9cc836', 36.90, null, null, true, false, '[]', 4),
  -- Nikkei Kaze
  ('nikkei-kaze', 'sushi', 'Makis', 'Acevichado roll', 'Langostino empanizado, palta y salsa acevichada. 10 piezas.', 'photo-1579871494447-9811cf80d66c', 36.00, null, null, true, true, '[]', 1),
  ('nikkei-kaze', 'sushi', 'Makis', 'Furai roll', 'Salmón, queso crema y palta en tempura. 10 piezas.', 'photo-1617196034796-73dfa7b1fd56', 34.00, null, null, true, false, '[]', 2),
  ('nikkei-kaze', 'sushi', 'Nigiris', 'Nigiri sake (4 und.)', 'Salmón fresco sobre arroz shari.', 'photo-1611143669185-af224c5e3252', 28.00, null, 30, true, false, '[]', 3),
  ('nikkei-kaze', 'sushi', 'Combos', 'Bento Kaze', '20 piezas variadas + gyozas + bebida.', 'photo-1553621042-f6e147245754', 79.00, 92.00, 15, true, true, '[]', 4),
  -- Dulce Tentación
  ('dulce-tentacion', 'postres', 'Tortas', 'Torta de chocolate 70%', 'Bizcocho húmedo, ganache de cacao peruano. Porción.', 'photo-1578985545062-69928b1d9587', 14.90, null, 20, true, true, '[]', 1),
  ('dulce-tentacion', 'postres', 'Clásicos', 'Suspiro limeño', 'Manjar blanco con merengue al oporto.', 'photo-1488477181946-6428a0291777', 12.50, null, null, true, false, '[]', 2),
  ('dulce-tentacion', 'postres', 'Helados', 'Helado artesanal 1/2 L', 'Lúcuma, chirimoya o chocolate.', 'photo-1563805042-7684c019e1cb', 22.00, null, null, true, true,
   '[{"name":"Sabor","required":true,"max":2,"choices":[{"name":"Lúcuma","price":0},{"name":"Chirimoya","price":0},{"name":"Chocolate","price":0}]}]', 3),
  -- Juguería del Sol
  ('jugueria-sol', 'bebidas', 'Jugos', 'Jugo de naranja 500 ml', 'Naranja de Huando recién exprimida.', 'photo-1497534446932-c925b458314e', 9.00, null, null, true, true, '[]', 1),
  ('jugueria-sol', 'bebidas', 'Cafés', 'Latte Villa Rica', 'Espresso de origen con leche texturizada.', 'photo-1461023058943-07fcbe16d735', 11.00, null, null, true, false,
   '[{"name":"Leche","required":true,"max":1,"choices":[{"name":"Entera","price":0},{"name":"Almendras","price":2.5},{"name":"Avena","price":2.5}]}]', 2),
  ('jugueria-sol', 'bebidas', 'Jugos', 'Limonada de maracuyá', 'Limonada con pulpa de maracuyá y hierbabuena.', 'photo-1523371054106-bbf80586c38c', 10.50, null, null, true, false, '[]', 3),
  -- Mercado Fresco
  ('mercado-fresco', 'supermercados', 'Frutas y verduras', 'Palta fuerte (1 kg)', 'Paltas seleccionadas listas para consumir.', 'photo-1523049673857-eb18f1d7b578', 11.90, null, 80, true, true, '[]', 1),
  ('mercado-fresco', 'supermercados', 'Frutas y verduras', 'Canasta de frutas de estación', 'Mango, plátano, granadilla y mandarina (3 kg).', 'photo-1610832958506-aa56368176cf', 24.90, 29.90, 25, true, false, '[]', 2),
  ('mercado-fresco', 'supermercados', 'Abarrotes', 'Arroz extra 5 kg', 'Arroz grano largo extra.', 'photo-1586201375761-83865001e31c', 23.50, null, 50, true, false, '[]', 3),
  ('mercado-fresco', 'bebidas', 'Bebidas', 'Agua mineral 2.5 L (pack x6)', 'Agua de manantial sin gas.', 'photo-1548839140-29a749e1cf4d', 18.90, null, 40, true, false, '[]', 4),
  -- Botica Vital
  ('botica-vital', 'farmacias', 'Venta libre', 'Paracetamol 500 mg (x10)', 'Analgésico y antipirético. Lea las indicaciones.', 'photo-1584308666744-24d5c474f2ae', 3.50, null, 200, true, true, '[]', 1),
  ('botica-vital', 'farmacias', 'Cuidado personal', 'Protector solar FPS 50', 'Textura ligera, resistente al agua. 120 ml.', 'photo-1556228578-8c89e6adf883', 49.90, 59.90, 30, true, false, '[]', 2),
  ('botica-vital', 'farmacias', 'Bebés', 'Pañales talla M (x40)', 'Ultra absorbentes, hipoalergénicos.', 'photo-1631549916768-4119b2e5f926', 39.90, null, 25, true, false, '[]', 3),
  -- Tía Rosa
  ('anticucheria-tia-rosa', 'comida-peruana', 'Parrilla', 'Anticuchos de corazón', '3 palitos con papa dorada, choclo y ají de la casa.', 'photo-1555939594-58d7cb561ad1', 22.00, null, null, true, true, '[]', 1),
  ('anticucheria-tia-rosa', 'postres', 'Postres', 'Picarones con miel', '6 picarones de zapallo y camote con miel de chancaca.', 'photo-1551024601-bf4e48b7b3b2', 12.00, null, null, true, false, '[]', 2)
) as x(r_slug, c_slug, section, name, description, img, price, compare_at, stock, available, popular, options, sort_order)
join public.restaurants r on r.slug = x.r_slug
left join public.categories c on c.slug = x.c_slug;

-- Promociones de ejemplo
insert into public.coupons (code, description, discount_type, discount_value, max_discount, min_order_amount,
  starts_at, expires_at, usage_limit, per_user_limit, is_active, is_public, is_demo) values
  ('BIENVENIDO20', '20% en tu primer pedido (tope S/ 15)', 'percentage', 20, 15, 30, now() - interval '1 day', now() + interval '180 days', 1000, 1, true, true, true),
  ('ENVIOGRATIS', 'Delivery gratis en pedidos desde S/ 40', 'free_delivery', 0, null, 40, now() - interval '1 day', now() + interval '90 days', 500, 3, true, true, true),
  ('MIKUY10', 'S/ 10 de descuento en pedidos desde S/ 60', 'fixed', 10, null, 60, now() - interval '1 day', now() + interval '60 days', 300, 2, true, true, true)
on conflict (code) do nothing;
