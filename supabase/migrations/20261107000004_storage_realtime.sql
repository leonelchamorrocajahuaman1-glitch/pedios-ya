-- =============================================================================
-- Mikuy · Almacenamiento de imágenes y tiempo real
-- =============================================================================

-- Bucket público de imágenes (lectura pública; escritura solo administradores)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "images: lectura pública" on storage.objects
  for select to anon, authenticated using (bucket_id = 'images');
create policy "images: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'images' and public.is_admin());
create policy "images: admin actualiza" on storage.objects
  for update to authenticated using (bucket_id = 'images' and public.is_admin());
create policy "images: admin elimina" on storage.objects
  for delete to authenticated using (bucket_id = 'images' and public.is_admin());

-- Realtime: Supabase aplica RLS a los cambios emitidos, así cada cliente
-- solo recibe eventos de sus propios pedidos y notificaciones.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.delivery_locations;
alter publication supabase_realtime add table public.payments;
