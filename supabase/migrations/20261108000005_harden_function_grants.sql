-- =============================================================================
-- Mikuy · Endurecimiento de permisos de funciones
-- Supabase concede EXECUTE a "anon" por defecto en funciones nuevas. Aunque cada
-- función valida la sesión internamente, se revoca el acceso anónimo como
-- defensa adicional. Se mantienen para anon:
--   - quote_order: cotizar el carrito sin sesión
--   - is_admin / is_active_user / is_open: las usan las políticas RLS y el catálogo público
-- =============================================================================

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.admin_assign_courier(uuid, uuid) from anon, public;
revoke execute on function public.admin_courier_stats() from anon, public;
revoke execute on function public.admin_dashboard_stats() from anon, public;
revoke execute on function public.admin_purge_demo_data() from anon, public;
revoke execute on function public.admin_restaurant_sales() from anon, public;
revoke execute on function public.admin_review_payment(uuid, boolean, text) from anon, public;
revoke execute on function public.admin_set_customer_status(uuid, public.account_status) from anon, public;
revoke execute on function public.admin_update_customer(uuid, text, text) from anon, public;
revoke execute on function public.admin_update_order_status(uuid, public.order_status, text) from anon, public;
revoke execute on function public.cancel_my_order(uuid, text) from anon, public;
revoke execute on function public.get_order_courier(uuid) from anon, public;
revoke execute on function public.log_admin_action(text, text, text, jsonb) from anon, public;
revoke execute on function public.report_wallet_payment(uuid, text, text) from anon, public;
revoke execute on function public.submit_restaurant_application(text, text, text, text, text, text, uuid[]) from anon, public;
revoke execute on function public.submit_review(uuid, smallint, text) from anon, public;

-- Usuarios autenticados conservan el acceso (cada función valida rol/propiedad)
grant execute on function public.admin_assign_courier(uuid, uuid) to authenticated;
grant execute on function public.admin_courier_stats() to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_purge_demo_data() to authenticated;
grant execute on function public.admin_restaurant_sales() to authenticated;
grant execute on function public.admin_review_payment(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_customer_status(uuid, public.account_status) to authenticated;
grant execute on function public.admin_update_customer(uuid, text, text) to authenticated;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.cancel_my_order(uuid, text) to authenticated;
grant execute on function public.get_order_courier(uuid) to authenticated;
grant execute on function public.log_admin_action(text, text, text, jsonb) to authenticated;
grant execute on function public.report_wallet_payment(uuid, text, text) to authenticated;
grant execute on function public.submit_restaurant_application(text, text, text, text, text, text, uuid[]) to authenticated;
grant execute on function public.submit_review(uuid, smallint, text) to authenticated;
