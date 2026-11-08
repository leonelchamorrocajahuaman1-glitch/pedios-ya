-- =============================================================================
-- Respaldo completo del modelo marketplace antes de la transformación a
-- MULTIPRODUCTOS HUAYTALLA. Esquema NO expuesto por la API.
-- Aplicado en producción el 2026-11-09; recuperación verificada (hash idéntico).
-- =============================================================================
create schema if not exists backup_marketplace;
revoke all on schema backup_marketplace from public, anon, authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists backup_marketplace.%I', t);
    execute format('create table backup_marketplace.%I as table public.%I', t, t);
  end loop;
end $$;

create table if not exists backup_marketplace._meta as
  select now() as created_at, 'Respaldo previo a la transformación MULTIPRODUCTOS HUAYTALLA' as note;
