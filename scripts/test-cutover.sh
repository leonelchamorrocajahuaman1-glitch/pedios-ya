#!/usr/bin/env bash
# Ensayo completo del corte en un PostgreSQL local: aplica las migraciones pendientes
# (010 y 012), prueba la tienda, RESTAURA desde los respaldos y demuestra con md5
# que cada tabla vuelve a quedar idéntica. Uso: DB_SUPERUSER=postgres ./scripts/test-cutover.sh
set -euo pipefail
cd "$(dirname "$0")/.."
RUN="psql -v ON_ERROR_STOP=1 -q -X"
if [ -n "${DB_SUPERUSER:-}" ]; then RUN="sudo -u $DB_SUPERUSER $RUN"; fi
base() {
  $RUN -d postgres -c "drop database if exists $1" -c "create database $1" >/dev/null
  # Como en producción: el respaldo backup_marketplace se tomó con los datos del marketplace ya cargados
  { cat supabase/tests/00_supabase_shim.sql supabase/migrations/*.sql supabase/seed/demo_data.sql supabase/seed/store_demo.sql
    cat supabase/tests/01_business_and_rls_tests.sql supabase/tests/02_store_tests.sql
    echo "drop schema backup_marketplace cascade;"; cat supabase/migrations/20261109000006_backup_marketplace.sql; } | $RUN -d "$1" 2>&1 | grep -E "PASARON|ERROR" || true
}
snap() { (echo "set qa.snap = '$2';"; cat supabase/tests/snapshot.sql) | $RUN -d "$1"; }
diffsnap() {
  $RUN -At -d "$1" -c "select coalesce(string_agg(a.tbl || ' (' || a.n || ' vs ' || coalesce(b.n::text,'-') || ')', ', '), 'NINGUNA')
    from qa.snap a left join qa.snap b on b.tbl = a.tbl and b.name = '$3' where a.name = '$2' and (b.h is distinct from a.h)"
}

echo "== Ensayo 1: migración 010 (costos) y su reversión"
base hy_cut1
snap hy_cut1 antes
$RUN -d hy_cut1 -c "create table qa.costs as select (select md5(string_agg(id::text||':'||coalesce(cost_price::text,''), '|' order by id)) from public.products) p, (select md5(string_agg(id::text||':'||coalesce(unit_cost::text,''), '|' order by id)) from public.order_items) i"
$RUN -d hy_cut1 -f supabase/pending/20261110000010_drop_products_cost_price.sql
$RUN -At -d hy_cut1 -c "select 'cost_price existe: ' || exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='cost_price') || ' · costos privados: ' || (select count(*) from public.product_costs)"
$RUN -d hy_cut1 -f scripts/restore-costs.sql
# La columna restaurada queda al final de la tabla: se compara por id + cost_price y el resto de tablas completo
$RUN -At -d hy_cut1 -c "select 'costos restaurados idénticos (productos, ventas): ' || ((select md5(string_agg(id::text||':'||coalesce(cost_price::text,''), '|' order by id)) from public.products) = (select p from qa.costs)) || ', ' || ((select md5(string_agg(id::text||':'||coalesce(unit_cost::text,''), '|' order by id)) from public.order_items) = (select i from qa.costs))"
snap hy_cut1 despues
echo "Tablas distintas tras restaurar (sin contar products, que cambia el orden de columnas): $(diffsnap hy_cut1 antes despues | sed 's/products ([^)]*)//; s/^, //; s/, $//')"

echo "== Ensayo 2: limpieza de corte 012, tienda sin cabecera y restauración completa"
base hy_cut2
$RUN -d hy_cut2 -f supabase/pending/20261110000010_drop_products_cost_price.sql
snap hy_cut2 antes
$RUN -d hy_cut2 -f supabase/pending/20261112000012_cutover_cleanup.sql
$RUN -d hy_cut2 -f supabase/tests/03_cutover_tests.sql
$RUN -d hy_cut2 -f scripts/restore-marketplace.sql
snap hy_cut2 restaurado
echo "Tablas distintas tras restaurar: $(diffsnap hy_cut2 antes restaurado)"
