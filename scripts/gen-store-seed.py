"""Genera supabase/seed/store_demo.sql (catálogo DEMO de MULTIPRODUCTOS HUAYTALLA).
Fotos: Unsplash (licencia Unsplash), verificadas visualmente una por una; sin marcas registradas visibles."""
import json, sys

IDS = {}
for f in sys.argv[1:]:
    for line in open(f):
        line = line.strip()
        if line:
            IDS[line[:13]] = line
def img(prefix):
    full = IDS[prefix[:13]]
    return f"https://images.unsplash.com/photo-{full}"

CATS = [  # slug, nombre, icono, orden, foto de portada
    ("bebidas", "Bebidas", "coffee", 1, "1461023058943"),
    ("gaseosas", "Gaseosas", "cup-soda", 2, "1581636625402"),
    ("aguas-y-jugos", "Aguas y jugos", "glass-water", 3, "1621506289937"),
    ("snacks", "Snacks", "popcorn", 4, "1613919113640"),
    ("galletas-y-chocolates", "Galletas y chocolates", "cookie", 5, "1558961363-fa"),
    ("golosinas", "Golosinas", "candy", 6, "1582058091505"),
    ("abarrotes", "Abarrotes", "shopping-basket", 7, "1610725664285"),
    ("arroz-y-menestras", "Arroz y menestras", "wheat", 8, "1586201375761"),
    ("aceites-y-condimentos", "Aceites y condimentos", "droplet", 9, "1474979266404"),
    ("lacteos", "Lácteos", "milk", 10, "1550583724-b2"),
    ("panaderia", "Panadería", "croissant", 11, "1509440159596"),
    ("enlatados-y-conservas", "Enlatados y conservas", "package", 12, "1584263347416"),
    ("limpieza", "Limpieza", "spray-can", 13, "1585421514284"),
    ("higiene-personal", "Higiene personal", "bath", 14, "1605264964528"),
    ("hogar", "Productos para el hogar", "lamp", 15, "1603006905003"),
]
SUBS = [  # slug, nombre, padre
    ("cafe-e-infusiones", "Café e infusiones", "bebidas"),
    ("bebidas-frias", "Bebidas frías", "bebidas"),
    ("papas-y-chips", "Papas y chips", "snacks"),
    ("frutos-secos", "Frutos secos", "snacks"),
    ("panes", "Panes", "panaderia"),
    ("pasteleria", "Pastelería", "panaderia"),
    ("superficies", "Superficies", "limpieza"),
    ("ropa", "Ropa", "limpieza"),
    ("yogures", "Yogures", "lacteos"),
]
B = "Selección Huaytalla"
# cat, sub, slug, nombre, descripción, foto, precio, antes, costo, stock, mín, peso, unidad, destacado
P = [
 ("gaseosas", None, "gaseosa-cola-1-5l", "Gaseosa sabor cola 1.5 L", "Bebida gasificada sabor cola, ideal para compartir bien helada.", "1581636625402", 7.50, None, 5.20, 48, 12, 1.5, "l", True),
 ("gaseosas", None, "gaseosa-fresa-500ml", "Gaseosa sabor fresa 500 ml", "Refrescante gaseosa sabor fresa en presentación personal.", "1592483648228", 2.50, None, 1.60, 60, 12, 500, "ml", False),
 ("gaseosas", None, "gaseosa-lima-limon-500ml", "Gaseosa lima-limón 500 ml", "Bebida gasificada sabor lima-limón con toque cítrico.", "1556881286-fc", 2.50, 2.90, 1.60, 55, 12, 500, "ml", False),
 ("aguas-y-jugos", None, "agua-sin-gas-625ml", "Agua sin gas 625 ml", "Agua de mesa purificada, sin gas.", "1523362628745", 1.50, None, 0.80, 120, 24, 625, "ml", False),
 ("aguas-y-jugos", None, "agua-de-mesa-2-5l", "Agua de mesa 2.5 L", "Agua de mesa en presentación familiar.", "1548839140-29", 3.20, None, 2.00, 40, 10, 2.5, "l", False),
 ("aguas-y-jugos", None, "agua-con-gas-limon-500ml", "Agua con gas sabor limón 500 ml", "Agua mineral con gas y un toque natural de limón.", "1551538827-9c", 2.80, None, 1.70, 36, 10, 500, "ml", False),
 ("aguas-y-jugos", None, "nectar-de-naranja-1l", "Néctar de naranja 1 L", "Néctar elaborado con pulpa de naranja, sin conservantes añadidos.", "1621506289937", 4.90, 5.50, 3.10, 30, 8, 1, "l", True),
 ("aguas-y-jugos", None, "jugo-de-naranja-500ml", "Jugo de naranja natural 500 ml", "Jugo de naranja exprimido, listo para tomar.", "1600271886742", 5.50, None, 3.40, 18, 6, 500, "ml", False),
 ("aguas-y-jugos", None, "jugo-frutos-rojos-1l", "Jugo de frutos rojos 1 L", "Mezcla de fresa, frambuesa y arándano.", "1595981267035", 6.90, None, 4.30, 20, 6, 1, "l", False),
 ("aguas-y-jugos", None, "agua-saborizada-sandia-500ml", "Agua saborizada de sandía 500 ml", "Agua ligera con sabor a sandía y hierbabuena.", "1527661591475", 3.50, None, 2.10, 25, 8, 500, "ml", False),
 ("aguas-y-jugos", None, "bebida-de-pina-1l", "Bebida de piña 1 L", "Bebida refrescante sabor piña.", "1523371054106", 4.50, None, 2.80, 22, 8, 1, "l", False),
 ("bebidas", "bebidas-frias", "cafe-helado-300ml", "Café helado listo para tomar 300 ml", "Café frío con leche, listo para disfrutar.", "1461023058943", 6.50, None, 4.00, 15, 5, 300, "ml", True),
 ("bebidas", "cafe-e-infusiones", "cafe-tostado-molido-250g", "Café tostado y molido 250 g", "Café peruano de altura, tueste medio.", "1495474472287", 14.90, 16.90, 9.50, 20, 6, 250, "g", True),
 ("bebidas", "cafe-e-infusiones", "te-filtrante-25", "Té filtrante x 25 unidades", "Té negro en bolsitas filtrantes.", "1576092768241", 4.20, None, 2.60, 35, 8, None, "caja", False),
 ("bebidas", "cafe-e-infusiones", "manzanilla-filtrante-25", "Infusión de manzanilla x 25 unidades", "Manzanilla en bolsitas filtrantes, ideal después de comer.", "1564890369478", 3.80, None, 2.30, 30, 8, None, "caja", False),
 ("bebidas", "bebidas-frias", "batido-frutos-300ml", "Batido de frutas 300 ml", "Batido de frutas listo para tomar.", "1622597467836", 5.90, None, 3.70, 14, 5, 300, "ml", False),
 ("bebidas", "bebidas-frias", "limonada-de-fresa-500ml", "Limonada de fresa 500 ml", "Limonada con fresa natural.", "1497534446932", 4.50, None, 2.70, 16, 5, 500, "ml", False),
 ("snacks", "papas-y-chips", "papas-fritas-clasicas-150g", "Papas fritas clásicas 150 g", "Papas fritas crocantes con sal.", "1613919113640", 4.50, None, 2.90, 40, 10, 150, "g", True),
 ("snacks", "papas-y-chips", "tortillas-de-maiz-200g", "Tortillas de maíz 200 g", "Chips de maíz horneados, ideales con salsas.", "1621447504864", 5.20, None, 3.30, 28, 8, 200, "g", False),
 ("snacks", "papas-y-chips", "papas-apilables-130g", "Papas apilables 130 g", "Hojuelas de papa uniformes en tubo.", "1599490659213", 6.90, None, 4.40, 24, 6, 130, "g", False),
 ("snacks", None, "canchita-mantequilla-90g", "Canchita sabor mantequilla 90 g", "Maíz para microondas sabor mantequilla.", "1578849278619", 2.80, None, 1.70, 45, 10, 90, "g", False),
 ("snacks", "frutos-secos", "almendras-200g", "Almendras peladas 200 g", "Almendras enteras, fuente de energía natural.", "1608797178974", 12.90, None, 8.60, 3, 5, 200, "g", False),
 ("snacks", "frutos-secos", "mani-tostado-250g", "Maní tostado con sal 250 g", "Maní seleccionado tostado y salado.", "1567892737950", 5.50, None, 3.40, 30, 8, 250, "g", False),
 ("galletas-y-chocolates", None, "galletas-chispas-chocolate-200g", "Galletas con chispas de chocolate 200 g", "Galletas horneadas con abundantes chispas de chocolate.", "1558961363-fa", 5.90, None, 3.60, 34, 8, 200, "g", True),
 ("galletas-y-chocolates", None, "galletas-avena-chocolate-250g", "Galletas de avena y chocolate 250 g", "Galletas de avena con trozos de chocolate.", "1499636136210", 6.50, None, 4.00, 26, 8, 250, "g", False),
 ("galletas-y-chocolates", None, "chocolate-bitter-70-100g", "Chocolate bitter 70% 100 g", "Tableta de chocolate oscuro con cacao peruano.", "1606312619070", 7.90, None, 4.90, 22, 6, 100, "g", True),
 ("galletas-y-chocolates", None, "bombones-surtidos-200g", "Bombones surtidos 200 g", "Caja de bombones de chocolate con rellenos variados.", "1599599810769", 15.90, 18.90, 10.20, 0, 4, 200, "g", False),
 ("golosinas", None, "gomitas-ositos-200g", "Gomitas de ositos 200 g", "Gomitas frutales de colores.", "1582058091505", 3.90, None, 2.30, 50, 10, 200, "g", False),
 ("golosinas", None, "grageas-chocolate-150g", "Grageas de chocolate 150 g", "Confites de chocolate recubiertos de colores.", "1581798459219", 4.50, None, 2.80, 38, 10, 150, "g", False),
 ("golosinas", None, "chupetin-espiral", "Chupetín espiral", "Chupetín de caramelo de colores.", "1575224300306", 1.50, None, 0.70, 80, 20, None, "unidad", False),
 ("golosinas", None, "caramelos-surtidos-500g", "Caramelos surtidos 500 g", "Bolsa de caramelos de sabores variados.", "1534119428213", 8.90, None, 5.50, 20, 6, 500, "g", False),
 ("abarrotes", None, "harina-sin-preparar-1kg", "Harina sin preparar 1 kg", "Harina de trigo para panadería y repostería.", "1610725664285", 4.80, None, 3.10, 40, 10, 1, "kg", False),
 ("abarrotes", None, "fideo-spaghetti-500g", "Fideo spaghetti 500 g", "Pasta de sémola de trigo.", "1551462147-ff", 3.60, None, 2.20, 60, 15, 500, "g", False),
 ("abarrotes", None, "huevos-15", "Huevos de granja x 15", "Huevos frescos de gallina, bandeja de 15 unidades.", "1506976785307", 9.90, None, 7.20, 25, 8, None, "paquete", True),
 ("abarrotes", None, "avena-en-hojuelas-500g", "Avena en hojuelas 500 g", "Avena integral para desayunos nutritivos.", "1571748982800", 5.20, None, 3.20, 32, 8, 500, "g", False),
 ("abarrotes", None, "cereal-de-maiz-400g", "Cereal de hojuelas de maíz 400 g", "Hojuelas de maíz crocantes para el desayuno.", "1521483451569", 8.90, None, 5.60, 18, 6, 400, "g", False),
 ("abarrotes", None, "papa-blanca-1kg", "Papa blanca 1 kg", "Papa seleccionada, ideal para freír o sancochar.", "1518977676601", 3.20, None, 2.00, 50, 15, 1, "kg", False),
 ("abarrotes", None, "miel-de-abeja-500g", "Miel de abeja 500 g", "Miel pura de abeja.", "1558642452-9d", 18.90, None, 12.50, 12, 4, 500, "g", False),
 ("abarrotes", None, "fideos-instantaneos-5", "Fideos instantáneos x 5", "Fideos de preparación rápida, pack de 5.", "1612929633738", 6.50, None, 4.10, 30, 8, None, "paquete", False),
 ("arroz-y-menestras", None, "arroz-extra-5kg", "Arroz extra 5 kg", "Arroz de grano largo, graneado perfecto.", "1586201375761", 22.90, 24.90, 17.80, 30, 8, 5, "kg", True),
 ("arroz-y-menestras", None, "garbanzo-500g", "Garbanzo 500 g", "Garbanzo seleccionado.", "1515543904379", 6.80, None, 4.30, 24, 6, 500, "g", False),
 ("arroz-y-menestras", None, "menestras-surtidas-1kg", "Menestras surtidas 1 kg", "Mezcla de lentejas, frejoles y pallares.", "1612257416648", 9.90, None, 6.40, 20, 6, 1, "kg", False),
 ("aceites-y-condimentos", None, "aceite-de-oliva-500ml", "Aceite de oliva extra virgen 500 ml", "Aceite de oliva de primera prensada en frío.", "1474979266404", 24.90, None, 17.00, 14, 4, 500, "ml", True),
 ("aceites-y-condimentos", None, "especias-surtidas", "Especias surtidas x 6", "Comino, pimienta, orégano, ají panca, palillo y canela.", "1596040033229", 7.50, None, 4.50, 18, 5, None, "paquete", False),
 ("aceites-y-condimentos", None, "sal-marina-1kg", "Sal marina 1 kg", "Sal de mesa yodada.", "1518110925495", 2.20, None, 1.20, 40, 10, 1, "kg", False),
 ("lacteos", None, "leche-fresca-1l", "Leche fresca 1 L", "Leche entera pasteurizada.", "1550583724-b2", 4.90, None, 3.50, 36, 10, 1, "l", True),
 ("lacteos", "yogures", "yogur-de-fresa-1l", "Yogur bebible de fresa 1 L", "Yogur con trozos de fresa.", "1488477181946", 6.90, None, 4.60, 20, 6, 1, "l", False),
 ("lacteos", None, "queso-fresco-500g", "Queso fresco 500 g", "Queso fresco artesanal.", "1486297678162", 14.50, None, 10.20, 10, 4, 500, "g", False),
 ("lacteos", None, "mantequilla-200g", "Mantequilla con sal 200 g", "Mantequilla cremosa.", "1589985270826", 8.90, None, 6.10, 16, 5, 200, "g", False),
 ("lacteos", "yogures", "yogur-griego-natural-500g", "Yogur griego natural 500 g", "Yogur cremoso sin azúcar añadida.", "1571212515416", 9.50, None, 6.40, 4, 5, 500, "g", False),
 ("lacteos", None, "bebida-lactea-vainilla-300ml", "Bebida láctea de vainilla 300 ml", "Bebida a base de leche sabor vainilla.", "1568901839119", 4.20, None, 2.60, 22, 6, 300, "ml", False),
 ("panaderia", "panes", "pan-artesanal-de-masa-madre", "Pan artesanal de masa madre", "Pan rústico de fermentación lenta.", "1509440159596", 8.50, None, 4.80, 10, 3, 600, "g", True),
 ("panaderia", "panes", "pan-de-molde-blanco", "Pan de molde blanco 600 g", "Pan de molde suave en tajadas.", "1549931319-a5", 6.90, None, 4.30, 20, 6, 600, "g", False),
 ("panaderia", "panes", "pan-de-molde-integral", "Pan de molde integral 600 g", "Pan integral en tajadas, alto en fibra.", "1534620808146", 7.90, None, 4.90, 18, 6, 600, "g", False),
 ("panaderia", "pasteleria", "croissants-4", "Croissants de mantequilla x 4", "Croissants horneados del día.", "1555507036-ab", 9.90, None, 5.80, 12, 4, None, "paquete", False),
 ("panaderia", "panes", "canasta-panes-surtidos", "Canasta de panes surtidos", "Selección de panes del día.", "1608198093002", 10.90, None, 6.50, 8, 3, None, "bolsa", False),
 ("panaderia", "pasteleria", "donas-glaseadas-4", "Donas glaseadas x 4", "Donas esponjosas con glaseado.", "1559656914-a3", 8.90, None, 5.20, 10, 4, None, "caja", False),
 ("enlatados-y-conservas", None, "pack-conservas-surtidas-6", "Pack de conservas surtidas x 6", "Selección de conservas variadas para tu despensa.", "1584263347416", 32.90, 36.90, 23.50, 10, 3, None, "paquete", False),
 ("limpieza", "superficies", "desinfectante-spray-500ml", "Desinfectante en spray 500 ml", "Elimina el 99.9% de bacterias en superficies.", "1585421514284", 9.90, None, 6.30, 26, 6, 500, "ml", True),
 ("limpieza", "superficies", "limpiador-multiusos-500ml", "Limpiador multiusos 500 ml", "Desengrasante para cocina y superficies.", "1563453392212", 7.50, None, 4.60, 24, 6, 500, "ml", False),
 ("limpieza", "superficies", "limpiavidrios-500ml", "Limpiavidrios 500 ml", "Deja vidrios y espejos sin marcas.", "1550963295-01", 6.90, None, 4.20, 18, 5, 500, "ml", False),
 ("limpieza", None, "guantes-de-limpieza", "Guantes de látex para limpieza", "Guantes resistentes, talla M.", "1585421514738", 4.50, None, 2.60, 30, 8, None, "paquete", False),
 ("limpieza", "ropa", "detergente-en-polvo-2kg", "Detergente en polvo 2 kg", "Limpieza profunda para ropa blanca y de color.", "1582735689369", 19.90, 22.90, 14.10, 15, 5, 2, "kg", False),
 ("higiene-personal", None, "jabon-de-avena", "Jabón artesanal de avena", "Jabón suave para piel sensible.", "1584305574647", 5.50, None, 3.10, 30, 8, 120, "g", False),
 ("higiene-personal", None, "jabones-de-tocador-3", "Jabones de tocador x 3", "Pack de jabones con aromas naturales.", "1605264964528", 9.90, None, 6.00, 22, 6, None, "paquete", False),
 ("higiene-personal", None, "cepillos-dentales-bambu-2", "Cepillos dentales de bambú x 2", "Cepillos ecológicos de cerdas suaves.", "1607613009820", 8.90, None, 5.10, 20, 6, None, "paquete", False),
 ("higiene-personal", None, "shampoo-y-acondicionador", "Shampoo y acondicionador 400 ml", "Dúo para todo tipo de cabello.", "1631729371254", 24.90, None, 16.20, 12, 4, 400, "ml", False),
 ("higiene-personal", None, "aceite-corporal-100ml", "Aceite corporal 100 ml", "Aceite hidratante para el cuidado de la piel.", "1608571423902", 19.90, None, 12.30, 8, 3, 100, "ml", False),
 ("hogar", None, "papel-higienico-4", "Papel higiénico doble hoja x 4", "Rollos suaves y resistentes.", "1584556812952", 6.90, None, 4.40, 40, 10, None, "paquete", True),
 ("hogar", None, "vela-aromatica", "Vela aromática en vaso", "Vela de cera de soya con aroma a vainilla.", "1603006905003", 14.90, None, 8.70, 12, 4, None, "unidad", False),
 ("hogar", None, "foco-led-9w", "Foco LED 9 W luz blanca", "Ahorra hasta 80% de energía.", "1532007271951", 7.90, None, 4.60, 30, 8, None, "unidad", False),
 ("hogar", None, "pilas-aa-4", "Pilas alcalinas AA x 4", "Energía de larga duración.", "1619641805634", 9.90, None, 6.20, 25, 6, None, "paquete", False),
 ("hogar", None, "set-tazas-ceramica-4", "Set de tazas de cerámica x 4", "Tazas de cerámica artesanal.", "1610701596007", 29.90, 34.90, 18.50, 6, 2, None, "caja", False),
 ("hogar", None, "bolsa-malla-reutilizable", "Bolsa de malla reutilizable", "Bolsa resistente para tus compras.", "1584473457406", 6.50, None, 3.40, 20, 5, None, "unidad", False),
]

def q(v):
    if v is None: return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

used = [p[5][:13] for p in P]
assert len(used) == len(set(used)), "fotos repetidas"
out = ["-- =============================================================================",
"-- MULTIPRODUCTOS HUAYTALLA · DATOS DE DEMOSTRACIÓN (generado por scripts/gen-store-seed.py)",
"-- Todo lleva is_demo = true y se elimina desde Admin → Configuración → Datos demo.",
"-- Fotos: Unsplash (licencia Unsplash), verificadas visualmente; sin marcas visibles.",
"-- =============================================================================", ""]
out.append("insert into public.categories (catalog, slug, name, icon, image_url, sort_order, description) values")
out.append(",\n".join(f"  ('store', {q(s)}, {q(n)}, {q(i)}, {q(img(ph) + '?w=600&q=80')}, {o}, '')" for s, n, i, o, ph in CATS))
out.append("on conflict (catalog, slug) do nothing;\n")
out.append("insert into public.categories (catalog, slug, name, icon, parent_id, sort_order)")
out.append("select 'store', x.slug, x.name, 'tag', p.id, x.ord from (values")
out.append(",\n".join(f"  ({q(s)}, {q(n)}, {q(par)}, {i+1})" for i, (s, n, par) in enumerate(SUBS)))
out.append(") as x(slug, name, parent, ord) join public.categories p on p.catalog = 'store' and p.slug = x.parent")
out.append("on conflict (catalog, slug) do nothing;\n")
rows = []
for i, (cat, sub, slug, name, desc, ph, price, before, cost, stock, mn, w, unit, feat) in enumerate(P, start=1):
    sku = f"HY-{i:04d}"
    barcode = f"200{i:09d}"
    check = sum(int(d) * (3 if k % 2 else 1) for k, d in enumerate(barcode))
    barcode += str((10 - check % 10) % 10)
    rows.append(f"  ({q(cat)}, {q(sub)}, {q(slug)}, {q(name)}, {q(desc)}, {q(img(ph) + '?w=900&q=80')}, {price}, {q(before)}, {cost}, {stock}, {mn}, {q(w)}, {q(unit)}, {q(feat)}, {q(sku)}, {q(barcode)}, {i})")
out.append("insert into public.products (catalog, restaurant_id, category_id, subcategory_id, section, slug, name, description, image_url, price,")
out.append("  compare_at_price, stock, min_stock, weight, unit, is_featured, sku, barcode, brand, sort_order, is_available, is_demo, image_credit)")
out.append("select 'store', null, c.id, sc.id, c.name, x.slug, x.name, x.description, x.image_url, x.price, x.before::numeric, x.stock, x.min_stock,")
out.append(f"  x.weight::numeric, x.unit, x.featured, x.sku, x.barcode, {q(B)}, x.ord, true, true, 'Foto: Unsplash'")
out.append("from (values")
out.append(",\n".join(rows))
out.append(") as x(cat, sub, slug, name, description, image_url, price, before, cost, stock, min_stock, weight, unit, featured, sku, barcode, ord)")
out.append("join public.categories c on c.catalog = 'store' and c.slug = x.cat")
out.append("left join public.categories sc on sc.catalog = 'store' and sc.slug = x.sub")
out.append("where not exists (select 1 from public.products p where p.slug = x.slug);\n")
out.append("-- Precio de compra: tabla aparte, solo visible para administradores")
out.append("insert into public.product_costs (product_id, cost_price)")
out.append("select p.id, x.cost from (values")
out.append(",\n".join(f"  ({q(r[2])}, {r[8]})" for r in P))
out.append(") as x(slug, cost) join public.products p on p.catalog = 'store' and p.slug = x.slug")
out.append("on conflict (product_id) do nothing;\n")
out.append("""-- Promociones de ejemplo
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
""")
open("supabase/seed/store_demo.sql", "w").write("\n".join(out))
print("productos:", len(P), "categorías:", len(CATS), "subcategorías:", len(SUBS))
