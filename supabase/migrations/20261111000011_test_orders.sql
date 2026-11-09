-- =============================================================================
-- MULTIPRODUCTOS HUAYTALLA · Pedidos de prueba (migración ADITIVA)
--
-- Las cuentas marcadas como "de prueba" generan pedidos marcados is_test.
-- Dashboard, reportes, más vendidos y conteo de clientes los excluyen, así se
-- puede probar el recorrido completo (hasta Entregado) sin alterar las cifras.
-- Solo un administrador puede marcar/desmarcar una cuenta (función segura).
-- =============================================================================

alter table public.profiles add column if not exists is_test boolean not null default false;
alter table public.orders add column if not exists is_test boolean not null default false;
create index if not exists orders_store_real_idx on public.orders (created_at desc) where catalog = 'store' and not is_test;

-- El pedido hereda la marca de la cuenta en el momento de crearse (no se puede elegir desde la API)
create or replace function public.set_order_test_flag()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.is_test := coalesce((select p.is_test from public.profiles p where p.id = new.user_id), false);
  return new;
end $$;
revoke all on function public.set_order_test_flag() from public, anon, authenticated;
drop trigger if exists orders_set_test_flag on public.orders;
create trigger orders_set_test_flag before insert on public.orders
  for each row execute function public.set_order_test_flag();

create or replace function public.admin_set_test_account(p_user_id uuid, p_is_test boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  update public.profiles set is_test = p_is_test where id = p_user_id;
  if not found then raise exception 'Cliente no encontrado'; end if;
  perform public.log_admin_action(case when p_is_test then 'mark_test_account' else 'unmark_test_account' end,
    'profiles', p_user_id::text, jsonb_build_object('is_test', p_is_test));
end $$;
revoke all on function public.admin_set_test_account(uuid, boolean) from public, anon;
grant execute on function public.admin_set_test_account(uuid, boolean) to authenticated;

-- Cuentas QA existentes y sus pedidos (solo se MARCAN; no se borra nada)
update public.profiles set is_test = true
  where email in ('qa.cliente@example.com', 'qa.admin@example.com') or email like 'qa.huaytalla.%@mailinator.com';
update public.orders o set is_test = true from public.profiles p
  where p.id = o.user_id and p.is_test and not o.is_test;

-- Estadísticas y reportes sin pedidos de prueba
create or replace function public.admin_store_dashboard()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v jsonb;
  v_today date := (now() at time zone 'America/Lima')::date;
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;

  -- Contadores operativos: TODOS los pedidos (no se debe perder ninguno pendiente).
  -- Cifras de ventas: solo pedidos reales (sin cuentas de prueba).
  with o as (
    select *, (coalesce(delivered_at, created_at) at time zone 'America/Lima')::date as day
    from public.orders where catalog = 'store'
  )
  select jsonb_build_object(
    'sales_today', coalesce(sum(total) filter (where not is_test and status = 'delivered' and day = v_today), 0),
    'sales_yesterday', coalesce(sum(total) filter (where not is_test and status = 'delivered' and day = v_today - 1), 0),
    'sales_week', coalesce(sum(total) filter (where not is_test and status = 'delivered' and day >= date_trunc('week', v_today)::date), 0),
    'sales_month', coalesce(sum(total) filter (where not is_test and status = 'delivered' and day >= date_trunc('month', v_today)::date), 0),
    'revenue_total', coalesce(sum(total) filter (where not is_test and status = 'delivered'), 0),
    'orders_today', count(*) filter (where (created_at at time zone 'America/Lima')::date = v_today),
    'orders_pending', count(*) filter (where status = 'received'),
    'orders_confirmed', count(*) filter (where status = 'accepted'),
    'orders_preparing', count(*) filter (where status = 'preparing'),
    'orders_ready', count(*) filter (where status = 'ready'),
    'orders_on_the_way', count(*) filter (where status = 'on_the_way'),
    'orders_delivered', count(*) filter (where not is_test and status = 'delivered'),
    'orders_cancelled', count(*) filter (where not is_test and status = 'cancelled'),
    'orders_test_open', count(*) filter (where is_test and status not in ('delivered', 'cancelled')),
    'avg_ticket', coalesce(round(avg(total) filter (where not is_test and status = 'delivered'), 2), 0)
  ) into v from o;

  v := v || jsonb_build_object(
    'gross_profit_total', (
      select coalesce(sum(oi.line_total - coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity), 0)
      from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.catalog = 'store' and not o.is_test and o.status = 'delivered'),
    'products_available', (select count(*) from public.products where catalog = 'store' and is_available and stock > 0),
    'products_out_of_stock', (select count(*) from public.products where catalog = 'store' and is_available and stock = 0),
    'products_low_stock', (select count(*) from public.products where catalog = 'store' and is_available and stock > 0 and stock <= min_stock),
    'products_inactive', (select count(*) from public.products where catalog = 'store' and not is_available),
    'customers', (select count(*) from public.profiles where role = 'customer' and not is_test),
    'payments_to_verify', (select count(*) from public.payments p join public.orders o on o.id = p.order_id
                           where o.catalog = 'store' and p.status = 'pending_verification'),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(d, 'DD/MM'), 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.n, 0)) order by d), '[]')
      from generate_series(v_today - 29, v_today, interval '1 day') d
      left join (select (delivered_at at time zone 'America/Lima')::date dd, sum(total) sales, count(*) n
                 from public.orders where catalog = 'store' and not is_test and status = 'delivered' group by 1) x on x.dd = d::date),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', 'Sem ' || to_char(w, 'DD/MM'), 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.n, 0)) order by w), '[]')
      from generate_series(date_trunc('week', v_today::timestamp) - interval '11 weeks', date_trunc('week', v_today::timestamp), interval '1 week') w
      left join (select date_trunc('week', delivered_at at time zone 'America/Lima') wk, sum(total) sales, count(*) n
                 from public.orders where catalog = 'store' and not is_test and status = 'delivered' group by 1) x on x.wk = w),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object('label', to_char(m, 'MM/YYYY'), 'sales', coalesce(x.sales, 0), 'orders', coalesce(x.n, 0),
                                                   'profit', coalesce(x.profit, 0)) order by m), '[]')
      from generate_series(date_trunc('month', v_today::timestamp) - interval '11 months', date_trunc('month', v_today::timestamp), interval '1 month') m
      left join (select date_trunc('month', o.delivered_at at time zone 'America/Lima') mo, sum(oi.line_total) sales,
                        count(distinct o.id) n, sum(oi.line_total - coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity) profit
                 from public.orders o join public.order_items oi on oi.order_id = o.id
                 where o.catalog = 'store' and not o.is_test and o.status = 'delivered' group by 1) x on x.mo = m),
    'top_products', (
      select coalesce(jsonb_agg(t order by t.qty desc), '[]') from (
        select oi.product_name as name, sum(oi.quantity) qty, sum(oi.line_total) revenue
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where o.catalog = 'store' and not o.is_test and o.status = 'delivered'
        group by oi.product_name order by 2 desc limit 8) t),
    'top_categories', (
      select coalesce(jsonb_agg(t order by t.revenue desc), '[]') from (
        select c.name, sum(oi.quantity) qty, sum(oi.line_total) revenue
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
        join public.products p on p.id = oi.product_id
        join public.categories c on c.id = p.category_id
        where o.catalog = 'store' and not o.is_test and o.status = 'delivered'
        group by c.name order by 3 desc limit 8) t)
  );
  return v;
end $$;
grant execute on function public.admin_store_dashboard() to authenticated;
revoke execute on function public.admin_store_dashboard() from anon, public;

create or replace function public.admin_sales_report(p_from date, p_to date, p_group text default 'day')
returns table (period text, period_start date, orders bigint, items bigint, subtotal numeric, discounts numeric,
               delivery numeric, revenue numeric, cost numeric, profit numeric, cancelled bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  if p_group not in ('day', 'week', 'month') then raise exception 'Agrupación inválida'; end if;
  if p_to < p_from or p_to - p_from > 800 then raise exception 'Rango de fechas inválido'; end if;
  return query
    with o as (
      select o.*, date_trunc(p_group, (coalesce(o.delivered_at, o.created_at) at time zone 'America/Lima'))::date as ps
      from public.orders o
      where o.catalog = 'store' and not o.is_test
        and (coalesce(o.delivered_at, o.created_at) at time zone 'America/Lima')::date between p_from and p_to
    ), items as (
      select oi.order_id, sum(oi.quantity) q, sum(coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity) c
      from public.order_items oi join o on o.id = oi.order_id group by oi.order_id
    )
    select case p_group when 'day' then to_char(o.ps, 'DD/MM/YYYY') when 'week' then 'Semana del ' || to_char(o.ps, 'DD/MM/YYYY')
                else to_char(o.ps, 'MM/YYYY') end,
           o.ps,
           count(*) filter (where o.status = 'delivered'),
           coalesce(sum(i.q) filter (where o.status = 'delivered'), 0)::bigint,
           coalesce(sum(o.subtotal) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.discount) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.delivery_fee) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.total) filter (where o.status = 'delivered'), 0),
           coalesce(sum(i.c) filter (where o.status = 'delivered'), 0),
           coalesce(sum(o.subtotal - o.discount - i.c) filter (where o.status = 'delivered'), 0),
           count(*) filter (where o.status = 'cancelled')
    from o left join items i on i.order_id = o.id
    group by o.ps order by o.ps;
end $$;
grant execute on function public.admin_sales_report(date, date, text) to authenticated;
revoke execute on function public.admin_sales_report(date, date, text) from anon, public;

create or replace function public.admin_product_sales(p_from date, p_to date)
returns table (product_id uuid, name text, sku text, category text, stock int, qty bigint, revenue numeric, profit numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  return query
    select p.id, p.name, p.sku, c.name, p.stock,
           coalesce(sum(oi.quantity), 0)::bigint,
           coalesce(sum(oi.line_total), 0),
           coalesce(sum(oi.line_total - coalesce((select c.unit_cost from public.order_item_costs c where c.order_item_id = oi.id), oi.unit_cost, 0) * oi.quantity), 0)
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join public.order_items oi on oi.product_id = p.id
      and exists (select 1 from public.orders o where o.id = oi.order_id and o.catalog = 'store' and not o.is_test and o.status = 'delivered'
                  and (o.delivered_at at time zone 'America/Lima')::date between p_from and p_to)
    where p.catalog = 'store'
    group by p.id, p.name, p.sku, c.name, p.stock
    order by 6 desc, 2;
end $$;
grant execute on function public.admin_product_sales(date, date) to authenticated;
revoke execute on function public.admin_product_sales(date, date) from anon, public;

create or replace function public.store_best_sellers(p_limit int default 8)
returns table (product_id uuid, qty bigint)
language sql stable security definer set search_path = ''
as $$
  select oi.product_id, sum(oi.quantity)::bigint
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.catalog = 'store' and not o.is_test and o.status <> 'cancelled' and o.created_at > now() - interval '90 days'
    and p.is_available
  group by oi.product_id
  order by 2 desc
  limit least(greatest(p_limit, 1), 24);
$$;
grant execute on function public.store_best_sellers(int) to anon, authenticated;
