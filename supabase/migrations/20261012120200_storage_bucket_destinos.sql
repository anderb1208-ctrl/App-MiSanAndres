-- Bucket público "destinos" para fotos propias de los destinos.
-- Lectura pública; sin políticas de escritura: los clientes (anon y authenticated)
-- no pueden subir, cambiar ni borrar. Se sube desde el dashboard o con la service role key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('destinos', 'destinos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "destinos: lectura publica"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'destinos');
