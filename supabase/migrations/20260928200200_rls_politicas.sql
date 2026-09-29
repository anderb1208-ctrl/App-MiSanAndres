-- Row Level Security en todas las tablas.
-- Catálogos (destino, destino_preferencia, preferencia, ocupacion): lectura pública, sin escritura desde el cliente.
-- Datos del usuario (usuario, usuario_preferencia, interaccion): cada usuario solo accede a sus filas.
-- El backend escribe los catálogos con la service role, que no pasa por RLS.

alter table public.usuario enable row level security;
alter table public.destino enable row level security;
alter table public.preferencia enable row level security;
alter table public.destino_preferencia enable row level security;
alter table public.usuario_preferencia enable row level security;
alter table public.interaccion enable row level security;
alter table public.ocupacion enable row level security;

-- ------------------------------------------------------------
-- Catálogos de lectura pública
-- ------------------------------------------------------------
revoke insert, update, delete, truncate on public.destino, public.preferencia,
  public.destino_preferencia, public.ocupacion from anon, authenticated;

create policy "destino: lectura pública" on public.destino
  for select to anon, authenticated using (true);

create policy "preferencia: lectura pública" on public.preferencia
  for select to anon, authenticated using (true);

create policy "destino_preferencia: lectura pública" on public.destino_preferencia
  for select to anon, authenticated using (true);

create policy "ocupacion: lectura pública" on public.ocupacion
  for select to anon, authenticated using (true);

-- ------------------------------------------------------------
-- usuario: ver y actualizar su propio perfil (el INSERT lo hace el trigger)
-- ------------------------------------------------------------
revoke all on public.usuario from anon;
revoke insert, delete, truncate on public.usuario from authenticated;

create policy "usuario: ver su perfil" on public.usuario
  for select to authenticated
  using (id_usuario = (select auth.uid()));

create policy "usuario: actualizar su perfil" on public.usuario
  for update to authenticated
  using (id_usuario = (select auth.uid()))
  with check (id_usuario = (select auth.uid()));

-- ------------------------------------------------------------
-- usuario_preferencia: ver, agregar y quitar sus preferencias
-- ------------------------------------------------------------
revoke all on public.usuario_preferencia from anon;
revoke update, truncate on public.usuario_preferencia from authenticated;

create policy "usuario_preferencia: ver las propias" on public.usuario_preferencia
  for select to authenticated
  using (id_usuario = (select auth.uid()));

create policy "usuario_preferencia: agregar las propias" on public.usuario_preferencia
  for insert to authenticated
  with check (id_usuario = (select auth.uid()));

create policy "usuario_preferencia: quitar las propias" on public.usuario_preferencia
  for delete to authenticated
  using (id_usuario = (select auth.uid()));

-- ------------------------------------------------------------
-- interaccion: ver, registrar y borrar las propias (sin UPDATE: es histórico)
-- ------------------------------------------------------------
revoke all on public.interaccion from anon;
revoke update, truncate on public.interaccion from authenticated;

create policy "interaccion: ver las propias" on public.interaccion
  for select to authenticated
  using (id_usuario = (select auth.uid()));

create policy "interaccion: registrar las propias" on public.interaccion
  for insert to authenticated
  with check (id_usuario = (select auth.uid()));

create policy "interaccion: borrar las propias" on public.interaccion
  for delete to authenticated
  using (id_usuario = (select auth.uid()));
