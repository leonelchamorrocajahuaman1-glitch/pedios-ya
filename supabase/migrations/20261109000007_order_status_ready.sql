-- Nuevo estado "Listo para entregar". Va en su propia migración porque un valor
-- de enum nuevo no puede usarse en la misma transacción en que se crea.
alter type public.order_status add value if not exists 'ready' after 'preparing';
