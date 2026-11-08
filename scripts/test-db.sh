#!/usr/bin/env bash
# Prueba migraciones + datos demo + reglas RLS en un PostgreSQL local (sin Supabase).
# Requiere psql y permisos para crear bases. Uso: DB_SUPERUSER=postgres ./scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-huaytalla_test}
RUN="psql -v ON_ERROR_STOP=1 -q"
if [ -n "${DB_SUPERUSER:-}" ]; then RUN="sudo -u $DB_SUPERUSER $RUN"; fi
$RUN -d postgres -c "drop database if exists $DB" -c "create database $DB"
cat supabase/tests/00_supabase_shim.sql supabase/migrations/*.sql supabase/seed/demo_data.sql \
  supabase/seed/store_demo.sql supabase/tests/01_business_and_rls_tests.sql supabase/tests/02_store_tests.sql | $RUN -d "$DB" 2>&1 | grep -v "wal_level\|logical"
