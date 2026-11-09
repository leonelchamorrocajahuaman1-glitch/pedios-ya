-- Huella (md5) de cada tabla de public: sirve para demostrar que una restauración deja todo idéntico.
-- Uso: \set snap 'nombre'  y luego \i este archivo
create schema if not exists qa;
create table if not exists qa.snap (name text, tbl text, n bigint, h text);
do $$
declare t text; v_n bigint; v_h text;
begin
  for t in select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1 loop
    execute format('select count(*), md5(coalesce(string_agg(x::text, ''|'' order by x::text), '''')) from public.%I x', t) into v_n, v_h;
    insert into qa.snap values (current_setting('qa.snap'), t, v_n, v_h);
  end loop;
end $$;
