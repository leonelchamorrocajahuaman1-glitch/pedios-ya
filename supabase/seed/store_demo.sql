-- =============================================================================
-- MULTIPRODUCTOS HUAYTALLA · DATOS DE DEMOSTRACIÓN (generado por scripts/gen-store-seed.py)
-- Todo lleva is_demo = true y se elimina desde Admin → Configuración → Datos demo.
-- Fotos: Unsplash (licencia Unsplash), verificadas visualmente; sin marcas visibles.
-- =============================================================================

insert into public.categories (catalog, slug, name, icon, image_url, sort_order, description) values
  ('store', 'bebidas', 'Bebidas', 'coffee', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80', 1, ''),
  ('store', 'gaseosas', 'Gaseosas', 'cup-soda', 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&q=80', 2, ''),
  ('store', 'aguas-y-jugos', 'Aguas y jugos', 'glass-water', 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80', 3, ''),
  ('store', 'snacks', 'Snacks', 'popcorn', 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=600&q=80', 4, ''),
  ('store', 'galletas-y-chocolates', 'Galletas y chocolates', 'cookie', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=80', 5, ''),
  ('store', 'golosinas', 'Golosinas', 'candy', 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=600&q=80', 6, ''),
  ('store', 'abarrotes', 'Abarrotes', 'shopping-basket', 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=600&q=80', 7, ''),
  ('store', 'arroz-y-menestras', 'Arroz y menestras', 'wheat', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80', 8, ''),
  ('store', 'aceites-y-condimentos', 'Aceites y condimentos', 'droplet', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80', 9, ''),
  ('store', 'lacteos', 'Lácteos', 'milk', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80', 10, ''),
  ('store', 'panaderia', 'Panadería', 'croissant', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80', 11, ''),
  ('store', 'enlatados-y-conservas', 'Enlatados y conservas', 'package', 'https://images.unsplash.com/photo-1584263347416-85a696b4eda7?w=600&q=80', 12, ''),
  ('store', 'limpieza', 'Limpieza', 'spray-can', 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=600&q=80', 13, ''),
  ('store', 'higiene-personal', 'Higiene personal', 'bath', 'https://images.unsplash.com/photo-1605264964528-06403738d6dc?w=600&q=80', 14, ''),
  ('store', 'hogar', 'Productos para el hogar', 'lamp', 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&q=80', 15, '')
on conflict (catalog, slug) do nothing;

insert into public.categories (catalog, slug, name, icon, parent_id, sort_order)
select 'store', x.slug, x.name, 'tag', p.id, x.ord from (values
  ('cafe-e-infusiones', 'Café e infusiones', 'bebidas', 1),
  ('bebidas-frias', 'Bebidas frías', 'bebidas', 2),
  ('papas-y-chips', 'Papas y chips', 'snacks', 3),
  ('frutos-secos', 'Frutos secos', 'snacks', 4),
  ('panes', 'Panes', 'panaderia', 5),
  ('pasteleria', 'Pastelería', 'panaderia', 6),
  ('superficies', 'Superficies', 'limpieza', 7),
  ('ropa', 'Ropa', 'limpieza', 8),
  ('yogures', 'Yogures', 'lacteos', 9)
) as x(slug, name, parent, ord) join public.categories p on p.catalog = 'store' and p.slug = x.parent
on conflict (catalog, slug) do nothing;

insert into public.products (catalog, restaurant_id, category_id, subcategory_id, section, slug, name, description, image_url, price,
  compare_at_price, cost_price, stock, min_stock, weight, unit, is_featured, sku, barcode, brand, sort_order, is_available, is_demo, image_credit)
select 'store', null, c.id, sc.id, c.name, x.slug, x.name, x.description, x.image_url, x.price, x.before::numeric, x.cost, x.stock, x.min_stock,
  x.weight::numeric, x.unit, x.featured, x.sku, x.barcode, 'Selección Huaytalla', x.ord, true, true, 'Foto: Unsplash'
from (values
  ('gaseosas', null, 'gaseosa-cola-1-5l', 'Gaseosa sabor cola 1.5 L', 'Bebida gasificada sabor cola, ideal para compartir bien helada.', 'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=900&q=80', 7.5, null, 5.2, 48, 12, 1.5, 'l', true, 'HY-0001', '2000000000015', 1),
  ('gaseosas', null, 'gaseosa-fresa-500ml', 'Gaseosa sabor fresa 500 ml', 'Refrescante gaseosa sabor fresa en presentación personal.', 'https://images.unsplash.com/photo-1592483648228-b35146a4330c?w=900&q=80', 2.5, null, 1.6, 60, 12, 500, 'ml', false, 'HY-0002', '2000000000022', 2),
  ('gaseosas', null, 'gaseosa-lima-limon-500ml', 'Gaseosa lima-limón 500 ml', 'Bebida gasificada sabor lima-limón con toque cítrico.', 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=900&q=80', 2.5, 2.9, 1.6, 55, 12, 500, 'ml', false, 'HY-0003', '2000000000039', 3),
  ('aguas-y-jugos', null, 'agua-sin-gas-625ml', 'Agua sin gas 625 ml', 'Agua de mesa purificada, sin gas.', 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=900&q=80', 1.5, null, 0.8, 120, 24, 625, 'ml', false, 'HY-0004', '2000000000046', 4),
  ('aguas-y-jugos', null, 'agua-de-mesa-2-5l', 'Agua de mesa 2.5 L', 'Agua de mesa en presentación familiar.', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=900&q=80', 3.2, null, 2.0, 40, 10, 2.5, 'l', false, 'HY-0005', '2000000000053', 5),
  ('aguas-y-jugos', null, 'agua-con-gas-limon-500ml', 'Agua con gas sabor limón 500 ml', 'Agua mineral con gas y un toque natural de limón.', 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=900&q=80', 2.8, null, 1.7, 36, 10, 500, 'ml', false, 'HY-0006', '2000000000060', 6),
  ('aguas-y-jugos', null, 'nectar-de-naranja-1l', 'Néctar de naranja 1 L', 'Néctar elaborado con pulpa de naranja, sin conservantes añadidos.', 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=900&q=80', 4.9, 5.5, 3.1, 30, 8, 1, 'l', true, 'HY-0007', '2000000000077', 7),
  ('aguas-y-jugos', null, 'jugo-de-naranja-500ml', 'Jugo de naranja natural 500 ml', 'Jugo de naranja exprimido, listo para tomar.', 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=900&q=80', 5.5, null, 3.4, 18, 6, 500, 'ml', false, 'HY-0008', '2000000000084', 8),
  ('aguas-y-jugos', null, 'jugo-frutos-rojos-1l', 'Jugo de frutos rojos 1 L', 'Mezcla de fresa, frambuesa y arándano.', 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=900&q=80', 6.9, null, 4.3, 20, 6, 1, 'l', false, 'HY-0009', '2000000000091', 9),
  ('aguas-y-jugos', null, 'agua-saborizada-sandia-500ml', 'Agua saborizada de sandía 500 ml', 'Agua ligera con sabor a sandía y hierbabuena.', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=900&q=80', 3.5, null, 2.1, 25, 8, 500, 'ml', false, 'HY-0010', '2000000000107', 10),
  ('aguas-y-jugos', null, 'bebida-de-pina-1l', 'Bebida de piña 1 L', 'Bebida refrescante sabor piña.', 'https://images.unsplash.com/photo-1523371054106-bbf80586c38c?w=900&q=80', 4.5, null, 2.8, 22, 8, 1, 'l', false, 'HY-0011', '2000000000114', 11),
  ('bebidas', 'bebidas-frias', 'cafe-helado-300ml', 'Café helado listo para tomar 300 ml', 'Café frío con leche, listo para disfrutar.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=900&q=80', 6.5, null, 4.0, 15, 5, 300, 'ml', true, 'HY-0012', '2000000000121', 12),
  ('bebidas', 'cafe-e-infusiones', 'cafe-tostado-molido-250g', 'Café tostado y molido 250 g', 'Café peruano de altura, tueste medio.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80', 14.9, 16.9, 9.5, 20, 6, 250, 'g', true, 'HY-0013', '2000000000138', 13),
  ('bebidas', 'cafe-e-infusiones', 'te-filtrante-25', 'Té filtrante x 25 unidades', 'Té negro en bolsitas filtrantes.', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900&q=80', 4.2, null, 2.6, 35, 8, null, 'caja', false, 'HY-0014', '2000000000145', 14),
  ('bebidas', 'cafe-e-infusiones', 'manzanilla-filtrante-25', 'Infusión de manzanilla x 25 unidades', 'Manzanilla en bolsitas filtrantes, ideal después de comer.', 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=900&q=80', 3.8, null, 2.3, 30, 8, null, 'caja', false, 'HY-0015', '2000000000152', 15),
  ('bebidas', 'bebidas-frias', 'batido-frutos-300ml', 'Batido de frutas 300 ml', 'Batido de frutas listo para tomar.', 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=900&q=80', 5.9, null, 3.7, 14, 5, 300, 'ml', false, 'HY-0016', '2000000000169', 16),
  ('bebidas', 'bebidas-frias', 'limonada-de-fresa-500ml', 'Limonada de fresa 500 ml', 'Limonada con fresa natural.', 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=900&q=80', 4.5, null, 2.7, 16, 5, 500, 'ml', false, 'HY-0017', '2000000000176', 17),
  ('snacks', 'papas-y-chips', 'papas-fritas-clasicas-150g', 'Papas fritas clásicas 150 g', 'Papas fritas crocantes con sal.', 'https://images.unsplash.com/photo-1613919113640-25732ec5e61f?w=900&q=80', 4.5, null, 2.9, 40, 10, 150, 'g', true, 'HY-0018', '2000000000183', 18),
  ('snacks', 'papas-y-chips', 'tortillas-de-maiz-200g', 'Tortillas de maíz 200 g', 'Chips de maíz horneados, ideales con salsas.', 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=900&q=80', 5.2, null, 3.3, 28, 8, 200, 'g', false, 'HY-0019', '2000000000190', 19),
  ('snacks', 'papas-y-chips', 'papas-apilables-130g', 'Papas apilables 130 g', 'Hojuelas de papa uniformes en tubo.', 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=900&q=80', 6.9, null, 4.4, 24, 6, 130, 'g', false, 'HY-0020', '2000000000206', 20),
  ('snacks', null, 'canchita-mantequilla-90g', 'Canchita sabor mantequilla 90 g', 'Maíz para microondas sabor mantequilla.', 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=900&q=80', 2.8, null, 1.7, 45, 10, 90, 'g', false, 'HY-0021', '2000000000213', 21),
  ('snacks', 'frutos-secos', 'almendras-200g', 'Almendras peladas 200 g', 'Almendras enteras, fuente de energía natural.', 'https://images.unsplash.com/photo-1608797178974-15b35a64ede9?w=900&q=80', 12.9, null, 8.6, 3, 5, 200, 'g', false, 'HY-0022', '2000000000220', 22),
  ('snacks', 'frutos-secos', 'mani-tostado-250g', 'Maní tostado con sal 250 g', 'Maní seleccionado tostado y salado.', 'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=900&q=80', 5.5, null, 3.4, 30, 8, 250, 'g', false, 'HY-0023', '2000000000237', 23),
  ('galletas-y-chocolates', null, 'galletas-chispas-chocolate-200g', 'Galletas con chispas de chocolate 200 g', 'Galletas horneadas con abundantes chispas de chocolate.', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=900&q=80', 5.9, null, 3.6, 34, 8, 200, 'g', true, 'HY-0024', '2000000000244', 24),
  ('galletas-y-chocolates', null, 'galletas-avena-chocolate-250g', 'Galletas de avena y chocolate 250 g', 'Galletas de avena con trozos de chocolate.', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=900&q=80', 6.5, null, 4.0, 26, 8, 250, 'g', false, 'HY-0025', '2000000000251', 25),
  ('galletas-y-chocolates', null, 'chocolate-bitter-70-100g', 'Chocolate bitter 70% 100 g', 'Tableta de chocolate oscuro con cacao peruano.', 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=900&q=80', 7.9, null, 4.9, 22, 6, 100, 'g', true, 'HY-0026', '2000000000268', 26),
  ('galletas-y-chocolates', null, 'bombones-surtidos-200g', 'Bombones surtidos 200 g', 'Caja de bombones de chocolate con rellenos variados.', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=900&q=80', 15.9, 18.9, 10.2, 0, 4, 200, 'g', false, 'HY-0027', '2000000000275', 27),
  ('golosinas', null, 'gomitas-ositos-200g', 'Gomitas de ositos 200 g', 'Gomitas frutales de colores.', 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=900&q=80', 3.9, null, 2.3, 50, 10, 200, 'g', false, 'HY-0028', '2000000000282', 28),
  ('golosinas', null, 'grageas-chocolate-150g', 'Grageas de chocolate 150 g', 'Confites de chocolate recubiertos de colores.', 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=900&q=80', 4.5, null, 2.8, 38, 10, 150, 'g', false, 'HY-0029', '2000000000299', 29),
  ('golosinas', null, 'chupetin-espiral', 'Chupetín espiral', 'Chupetín de caramelo de colores.', 'https://images.unsplash.com/photo-1575224300306-1b8da36134ec?w=900&q=80', 1.5, null, 0.7, 80, 20, null, 'unidad', false, 'HY-0030', '2000000000305', 30),
  ('golosinas', null, 'caramelos-surtidos-500g', 'Caramelos surtidos 500 g', 'Bolsa de caramelos de sabores variados.', 'https://images.unsplash.com/photo-1534119428213-bd2626145164?w=900&q=80', 8.9, null, 5.5, 20, 6, 500, 'g', false, 'HY-0031', '2000000000312', 31),
  ('abarrotes', null, 'harina-sin-preparar-1kg', 'Harina sin preparar 1 kg', 'Harina de trigo para panadería y repostería.', 'https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=900&q=80', 4.8, null, 3.1, 40, 10, 1, 'kg', false, 'HY-0032', '2000000000329', 32),
  ('abarrotes', null, 'fideo-spaghetti-500g', 'Fideo spaghetti 500 g', 'Pasta de sémola de trigo.', 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=900&q=80', 3.6, null, 2.2, 60, 15, 500, 'g', false, 'HY-0033', '2000000000336', 33),
  ('abarrotes', null, 'huevos-15', 'Huevos de granja x 15', 'Huevos frescos de gallina, bandeja de 15 unidades.', 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=900&q=80', 9.9, null, 7.2, 25, 8, null, 'paquete', true, 'HY-0034', '2000000000343', 34),
  ('abarrotes', null, 'avena-en-hojuelas-500g', 'Avena en hojuelas 500 g', 'Avena integral para desayunos nutritivos.', 'https://images.unsplash.com/photo-1571748982800-fa51082c2224?w=900&q=80', 5.2, null, 3.2, 32, 8, 500, 'g', false, 'HY-0035', '2000000000350', 35),
  ('abarrotes', null, 'cereal-de-maiz-400g', 'Cereal de hojuelas de maíz 400 g', 'Hojuelas de maíz crocantes para el desayuno.', 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=900&q=80', 8.9, null, 5.6, 18, 6, 400, 'g', false, 'HY-0036', '2000000000367', 36),
  ('abarrotes', null, 'papa-blanca-1kg', 'Papa blanca 1 kg', 'Papa seleccionada, ideal para freír o sancochar.', 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=900&q=80', 3.2, null, 2.0, 50, 15, 1, 'kg', false, 'HY-0037', '2000000000374', 37),
  ('abarrotes', null, 'miel-de-abeja-500g', 'Miel de abeja 500 g', 'Miel pura de abeja.', 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=900&q=80', 18.9, null, 12.5, 12, 4, 500, 'g', false, 'HY-0038', '2000000000381', 38),
  ('abarrotes', null, 'fideos-instantaneos-5', 'Fideos instantáneos x 5', 'Fideos de preparación rápida, pack de 5.', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=900&q=80', 6.5, null, 4.1, 30, 8, null, 'paquete', false, 'HY-0039', '2000000000398', 39),
  ('arroz-y-menestras', null, 'arroz-extra-5kg', 'Arroz extra 5 kg', 'Arroz de grano largo, graneado perfecto.', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=900&q=80', 22.9, 24.9, 17.8, 30, 8, 5, 'kg', true, 'HY-0040', '2000000000404', 40),
  ('arroz-y-menestras', null, 'garbanzo-500g', 'Garbanzo 500 g', 'Garbanzo seleccionado.', 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=900&q=80', 6.8, null, 4.3, 24, 6, 500, 'g', false, 'HY-0041', '2000000000411', 41),
  ('arroz-y-menestras', null, 'menestras-surtidas-1kg', 'Menestras surtidas 1 kg', 'Mezcla de lentejas, frejoles y pallares.', 'https://images.unsplash.com/photo-1612257416648-ee7a6c533b4f?w=900&q=80', 9.9, null, 6.4, 20, 6, 1, 'kg', false, 'HY-0042', '2000000000428', 42),
  ('aceites-y-condimentos', null, 'aceite-de-oliva-500ml', 'Aceite de oliva extra virgen 500 ml', 'Aceite de oliva de primera prensada en frío.', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=80', 24.9, null, 17.0, 14, 4, 500, 'ml', true, 'HY-0043', '2000000000435', 43),
  ('aceites-y-condimentos', null, 'especias-surtidas', 'Especias surtidas x 6', 'Comino, pimienta, orégano, ají panca, palillo y canela.', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=900&q=80', 7.5, null, 4.5, 18, 5, null, 'paquete', false, 'HY-0044', '2000000000442', 44),
  ('aceites-y-condimentos', null, 'sal-marina-1kg', 'Sal marina 1 kg', 'Sal de mesa yodada.', 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=900&q=80', 2.2, null, 1.2, 40, 10, 1, 'kg', false, 'HY-0045', '2000000000459', 45),
  ('lacteos', null, 'leche-fresca-1l', 'Leche fresca 1 L', 'Leche entera pasteurizada.', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=900&q=80', 4.9, null, 3.5, 36, 10, 1, 'l', true, 'HY-0046', '2000000000466', 46),
  ('lacteos', 'yogures', 'yogur-de-fresa-1l', 'Yogur bebible de fresa 1 L', 'Yogur con trozos de fresa.', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=80', 6.9, null, 4.6, 20, 6, 1, 'l', false, 'HY-0047', '2000000000473', 47),
  ('lacteos', null, 'queso-fresco-500g', 'Queso fresco 500 g', 'Queso fresco artesanal.', 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=900&q=80', 14.5, null, 10.2, 10, 4, 500, 'g', false, 'HY-0048', '2000000000480', 48),
  ('lacteos', null, 'mantequilla-200g', 'Mantequilla con sal 200 g', 'Mantequilla cremosa.', 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=900&q=80', 8.9, null, 6.1, 16, 5, 200, 'g', false, 'HY-0049', '2000000000497', 49),
  ('lacteos', 'yogures', 'yogur-griego-natural-500g', 'Yogur griego natural 500 g', 'Yogur cremoso sin azúcar añadida.', 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=900&q=80', 9.5, null, 6.4, 4, 5, 500, 'g', false, 'HY-0050', '2000000000503', 50),
  ('lacteos', null, 'bebida-lactea-vainilla-300ml', 'Bebida láctea de vainilla 300 ml', 'Bebida a base de leche sabor vainilla.', 'https://images.unsplash.com/photo-1568901839119-631418a3910d?w=900&q=80', 4.2, null, 2.6, 22, 6, 300, 'ml', false, 'HY-0051', '2000000000510', 51),
  ('panaderia', 'panes', 'pan-artesanal-de-masa-madre', 'Pan artesanal de masa madre', 'Pan rústico de fermentación lenta.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80', 8.5, null, 4.8, 10, 3, 600, 'g', true, 'HY-0052', '2000000000527', 52),
  ('panaderia', 'panes', 'pan-de-molde-blanco', 'Pan de molde blanco 600 g', 'Pan de molde suave en tajadas.', 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=900&q=80', 6.9, null, 4.3, 20, 6, 600, 'g', false, 'HY-0053', '2000000000534', 53),
  ('panaderia', 'panes', 'pan-de-molde-integral', 'Pan de molde integral 600 g', 'Pan integral en tajadas, alto en fibra.', 'https://images.unsplash.com/photo-1534620808146-d33bb39128b2?w=900&q=80', 7.9, null, 4.9, 18, 6, 600, 'g', false, 'HY-0054', '2000000000541', 54),
  ('panaderia', 'pasteleria', 'croissants-4', 'Croissants de mantequilla x 4', 'Croissants horneados del día.', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900&q=80', 9.9, null, 5.8, 12, 4, null, 'paquete', false, 'HY-0055', '2000000000558', 55),
  ('panaderia', 'panes', 'canasta-panes-surtidos', 'Canasta de panes surtidos', 'Selección de panes del día.', 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=900&q=80', 10.9, null, 6.5, 8, 3, null, 'bolsa', false, 'HY-0056', '2000000000565', 56),
  ('panaderia', 'pasteleria', 'donas-glaseadas-4', 'Donas glaseadas x 4', 'Donas esponjosas con glaseado.', 'https://images.unsplash.com/photo-1559656914-a30970c1affd?w=900&q=80', 8.9, null, 5.2, 10, 4, null, 'caja', false, 'HY-0057', '2000000000572', 57),
  ('enlatados-y-conservas', null, 'pack-conservas-surtidas-6', 'Pack de conservas surtidas x 6', 'Selección de conservas variadas para tu despensa.', 'https://images.unsplash.com/photo-1584263347416-85a696b4eda7?w=900&q=80', 32.9, 36.9, 23.5, 10, 3, null, 'paquete', false, 'HY-0058', '2000000000589', 58),
  ('limpieza', 'superficies', 'desinfectante-spray-500ml', 'Desinfectante en spray 500 ml', 'Elimina el 99.9% de bacterias en superficies.', 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=900&q=80', 9.9, null, 6.3, 26, 6, 500, 'ml', true, 'HY-0059', '2000000000596', 59),
  ('limpieza', 'superficies', 'limpiador-multiusos-500ml', 'Limpiador multiusos 500 ml', 'Desengrasante para cocina y superficies.', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=900&q=80', 7.5, null, 4.6, 24, 6, 500, 'ml', false, 'HY-0060', '2000000000602', 60),
  ('limpieza', 'superficies', 'limpiavidrios-500ml', 'Limpiavidrios 500 ml', 'Deja vidrios y espejos sin marcas.', 'https://images.unsplash.com/photo-1550963295-019d8a8a61c5?w=900&q=80', 6.9, null, 4.2, 18, 5, 500, 'ml', false, 'HY-0061', '2000000000619', 61),
  ('limpieza', null, 'guantes-de-limpieza', 'Guantes de látex para limpieza', 'Guantes resistentes, talla M.', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=900&q=80', 4.5, null, 2.6, 30, 8, null, 'paquete', false, 'HY-0062', '2000000000626', 62),
  ('limpieza', 'ropa', 'detergente-en-polvo-2kg', 'Detergente en polvo 2 kg', 'Limpieza profunda para ropa blanca y de color.', 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=900&q=80', 19.9, 22.9, 14.1, 15, 5, 2, 'kg', false, 'HY-0063', '2000000000633', 63),
  ('higiene-personal', null, 'jabon-de-avena', 'Jabón artesanal de avena', 'Jabón suave para piel sensible.', 'https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?w=900&q=80', 5.5, null, 3.1, 30, 8, 120, 'g', false, 'HY-0064', '2000000000640', 64),
  ('higiene-personal', null, 'jabones-de-tocador-3', 'Jabones de tocador x 3', 'Pack de jabones con aromas naturales.', 'https://images.unsplash.com/photo-1605264964528-06403738d6dc?w=900&q=80', 9.9, null, 6.0, 22, 6, null, 'paquete', false, 'HY-0065', '2000000000657', 65),
  ('higiene-personal', null, 'cepillos-dentales-bambu-2', 'Cepillos dentales de bambú x 2', 'Cepillos ecológicos de cerdas suaves.', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=900&q=80', 8.9, null, 5.1, 20, 6, null, 'paquete', false, 'HY-0066', '2000000000664', 66),
  ('higiene-personal', null, 'shampoo-y-acondicionador', 'Shampoo y acondicionador 400 ml', 'Dúo para todo tipo de cabello.', 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=900&q=80', 24.9, null, 16.2, 12, 4, 400, 'ml', false, 'HY-0067', '2000000000671', 67),
  ('higiene-personal', null, 'aceite-corporal-100ml', 'Aceite corporal 100 ml', 'Aceite hidratante para el cuidado de la piel.', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=900&q=80', 19.9, null, 12.3, 8, 3, 100, 'ml', false, 'HY-0068', '2000000000688', 68),
  ('hogar', null, 'papel-higienico-4', 'Papel higiénico doble hoja x 4', 'Rollos suaves y resistentes.', 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=900&q=80', 6.9, null, 4.4, 40, 10, null, 'paquete', true, 'HY-0069', '2000000000695', 69),
  ('hogar', null, 'vela-aromatica', 'Vela aromática en vaso', 'Vela de cera de soya con aroma a vainilla.', 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=900&q=80', 14.9, null, 8.7, 12, 4, null, 'unidad', false, 'HY-0070', '2000000000701', 70),
  ('hogar', null, 'foco-led-9w', 'Foco LED 9 W luz blanca', 'Ahorra hasta 80% de energía.', 'https://images.unsplash.com/photo-1532007271951-c487760934ae?w=900&q=80', 7.9, null, 4.6, 30, 8, null, 'unidad', false, 'HY-0071', '2000000000718', 71),
  ('hogar', null, 'pilas-aa-4', 'Pilas alcalinas AA x 4', 'Energía de larga duración.', 'https://images.unsplash.com/photo-1619641805634-b867f535071c?w=900&q=80', 9.9, null, 6.2, 25, 6, null, 'paquete', false, 'HY-0072', '2000000000725', 72),
  ('hogar', null, 'set-tazas-ceramica-4', 'Set de tazas de cerámica x 4', 'Tazas de cerámica artesanal.', 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900&q=80', 29.9, 34.9, 18.5, 6, 2, null, 'caja', false, 'HY-0073', '2000000000732', 73),
  ('hogar', null, 'bolsa-malla-reutilizable', 'Bolsa de malla reutilizable', 'Bolsa resistente para tus compras.', 'https://images.unsplash.com/photo-1584473457406-6240486418e9?w=900&q=80', 6.5, null, 3.4, 20, 5, null, 'unidad', false, 'HY-0074', '2000000000749', 74)
) as x(cat, sub, slug, name, description, image_url, price, before, cost, stock, min_stock, weight, unit, featured, sku, barcode, ord)
join public.categories c on c.catalog = 'store' and c.slug = x.cat
left join public.categories sc on sc.catalog = 'store' and sc.slug = x.sub
where not exists (select 1 from public.products p where p.slug = x.slug);

-- Promociones de ejemplo
insert into public.promotions (name, description, discount_type, discount_value, scope, category_id, min_order_amount, starts_at, ends_at, is_demo)
select 'Semana del snack', '15% de descuento en todos los snacks', 'percentage', 15, 'category', c.id, 0, now() - interval '1 day', now() + interval '30 days', true
from public.categories c where c.catalog = 'store' and c.slug = 'snacks'
  and not exists (select 1 from public.promotions where name = 'Semana del snack');
insert into public.promotions (name, description, discount_type, discount_value, scope, product_id, starts_at, ends_at, is_demo)
select 'Oliva al 20%', 'Aceite de oliva extra virgen con 20% de descuento', 'percentage', 20, 'product', p.id, now() - interval '1 day', now() + interval '30 days', true
from public.products p where p.slug = 'aceite-de-oliva-500ml'
  and not exists (select 1 from public.promotions where name = 'Oliva al 20%');
insert into public.promotions (name, description, discount_type, discount_value, scope, min_order_amount, starts_at, ends_at, is_demo)
select 'S/ 5 menos en compras desde S/ 100', 'Descuento automático en tu carrito', 'fixed', 5, 'order', 100, now() - interval '1 day', now() + interval '60 days', true
where not exists (select 1 from public.promotions where name = 'S/ 5 menos en compras desde S/ 100');

-- Cupones de ejemplo
insert into public.coupons (catalog, code, description, discount_type, discount_value, max_discount, min_order_amount, starts_at, expires_at, usage_limit, per_user_limit, is_active, is_public, is_demo) values
  ('store', 'BIENVENIDA10', '10% en tu primera compra (tope S/ 15)', 'percentage', 10, 15, 30, now() - interval '1 day', now() + interval '180 days', 1000, 1, true, true, true),
  ('store', 'DELIVERYGRATIS', 'Delivery gratis en compras desde S/ 50', 'free_delivery', 0, null, 50, now() - interval '1 day', now() + interval '90 days', 500, 2, true, true, true)
on conflict (code) do nothing;
