-- Roles (turista, tecnico, administrador), tickets de soporte y permisos del administrador.
--
-- ADITIVA: agrega tipos, columnas con valor por defecto, tablas, funciones y políticas.
-- No borra ni modifica datos: todos los usuarios existentes quedan como 'turista'.
--
-- Seguridad (la real; ocultar pantallas en la app es solo comodidad):
-- - El rol vive en public.usuario y NADIE puede cambiar el suyo desde el cliente:
--   el cliente solo puede actualizar las columnas nombre y nivel_ocupacion_preferido,
--   y un trigger rechaza cualquier cambio de rol que no pase por cambiar_rol_usuario().
-- - El rol nunca se elige al registrarse: el trigger de registro solo inserta id y nombre.
-- - Los permisos de técnico y administrador se resuelven en RLS con es_personal() y
--   es_administrador(): el backend sigue usando el JWT del usuario, sin service role.

-- ------------------------------------------------------------
-- Rol del usuario
-- ------------------------------------------------------------
create type public.rol_usuario as enum ('turista', 'tecnico', 'administrador');

alter table public.usuario
  add column rol public.rol_usuario not null default 'turista';

comment on column public.usuario.rol is
  'turista (por defecto), tecnico o administrador. Solo lo cambia un administrador con cambiar_rol_usuario().';

-- Rol del usuario autenticado. security definer: lee public.usuario sin depender de sus
-- políticas (evita recursión cuando una política de usuario la usa).
create function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = ''
as $$
  select rol from public.usuario where id_usuario = (select auth.uid());
$$;

create function public.es_personal()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() in ('tecnico', 'administrador'), false);
$$;

create function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_actual() = 'administrador', false);
$$;

revoke execute on function public.rol_actual(), public.es_personal(), public.es_administrador() from public, anon;
grant execute on function public.rol_actual(), public.es_personal(), public.es_administrador() to authenticated;

-- El cliente solo puede editar estas columnas de su perfil (nunca el rol).
revoke update on public.usuario from authenticated;
grant update (nombre, nivel_ocupacion_preferido) on public.usuario to authenticated;

-- Respaldo: cualquier cambio de rol que no venga de cambiar_rol_usuario() se rechaza.
create function private.proteger_rol()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol
     and coalesce(current_setting('misanandres.cambio_rol', true), '') <> 'autorizado'
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'El rol no se puede cambiar desde el cliente.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger usuario_proteger_rol
  before update of rol on public.usuario
  for each row execute function private.proteger_rol();

-- Técnicos y administradores ven todos los perfiles (nombre y rol; el correo vive en
-- auth.users y solo lo lista listar_usuarios_admin() para administradores).
create policy "usuario: el personal ve todos" on public.usuario
  for select to authenticated
  using (public.es_personal());

-- Lista de usuarios con su correo (de auth.users), solo para administradores.
create function public.listar_usuarios_admin()
returns table (id_usuario uuid, nombre text, correo text, rol public.rol_usuario, fecha_registro timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede ver los usuarios.' using errcode = '42501';
  end if;
  return query
    select u.id_usuario, u.nombre, a.email::text, u.rol, u.fecha_registro
    from public.usuario u
    join auth.users a on a.id = u.id_usuario
    order by u.fecha_registro desc;
end;
$$;

-- Cambio de rol: solo administradores; nadie se quita su propio rol de administrador
-- y el sistema nunca queda sin administradores.
create function public.cambiar_rol_usuario(p_id_usuario uuid, p_rol public.rol_usuario)
returns public.usuario
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actual public.rol_usuario;
  v_fila public.usuario;
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede cambiar roles.' using errcode = '42501';
  end if;

  select rol into v_actual from public.usuario where id_usuario = p_id_usuario for update;
  if not found then
    raise exception 'No existe el usuario.' using errcode = 'P0002';
  end if;

  if p_id_usuario = (select auth.uid()) and p_rol <> 'administrador' then
    raise exception 'No puedes quitarte tu propio rol de administrador.' using errcode = 'P0001';
  end if;

  if v_actual = 'administrador' and p_rol <> 'administrador'
     and (select count(*) from public.usuario where rol = 'administrador') <= 1 then
    raise exception 'El sistema debe tener al menos un administrador.' using errcode = 'P0001';
  end if;

  perform set_config('misanandres.cambio_rol', 'autorizado', true);
  update public.usuario set rol = p_rol where id_usuario = p_id_usuario returning * into v_fila;
  perform set_config('misanandres.cambio_rol', '', true);
  return v_fila;
end;
$$;

revoke execute on function public.listar_usuarios_admin(), public.cambiar_rol_usuario(uuid, public.rol_usuario) from public, anon;
grant execute on function public.listar_usuarios_admin(), public.cambiar_rol_usuario(uuid, public.rol_usuario) to authenticated;

-- ------------------------------------------------------------
-- Destinos: el administrador los crea, edita, oculta (estado = 'inactivo') y cambia su
-- estado operativo. El resto sigue con lectura pública.
-- ------------------------------------------------------------
grant insert, update on public.destino to authenticated;

create policy "destino: el administrador crea" on public.destino
  for insert to authenticated
  with check (public.es_administrador());

create policy "destino: el administrador edita" on public.destino
  for update to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- ------------------------------------------------------------
-- Tickets de soporte
-- ------------------------------------------------------------
create type public.categoria_ticket as enum ('informacion_incorrecta', 'destino', 'app', 'sugerencia', 'otro');
create type public.prioridad_ticket as enum ('baja', 'media', 'alta');
create type public.estado_ticket as enum ('abierto', 'en_revision', 'resuelto', 'cerrado');

create table public.ticket (
  id_ticket bigint generated always as identity primary key,
  id_usuario uuid not null references public.usuario (id_usuario) on delete cascade,
  id_destino integer references public.destino (id_destino) on delete set null,
  categoria public.categoria_ticket not null,
  asunto text not null check (char_length(asunto) between 3 and 120),
  descripcion text not null check (char_length(descripcion) between 5 and 2000),
  prioridad public.prioridad_ticket not null default 'media',
  estado public.estado_ticket not null default 'abierto',
  id_tecnico uuid references public.usuario (id_usuario) on delete set null,
  fecha_creacion timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now(),
  fecha_cierre timestamptz
);

create index ticket_id_usuario_idx on public.ticket (id_usuario);
create index ticket_estado_idx on public.ticket (estado);
create index ticket_id_tecnico_idx on public.ticket (id_tecnico);
create index ticket_id_destino_idx on public.ticket (id_destino);

create table public.ticket_comentario (
  id_comentario bigint generated always as identity primary key,
  id_ticket bigint not null references public.ticket (id_ticket) on delete cascade,
  id_usuario uuid not null references public.usuario (id_usuario) on delete cascade,
  comentario text not null check (char_length(comentario) between 1 and 2000),
  fecha timestamptz not null default now()
);

create index ticket_comentario_id_ticket_idx on public.ticket_comentario (id_ticket);
create index ticket_comentario_id_usuario_idx on public.ticket_comentario (id_usuario);

-- Fechas automáticas y técnico asignado válido (técnico o administrador).
create function private.antes_de_guardar_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id_tecnico is not null and not exists (
    select 1 from public.usuario where id_usuario = new.id_tecnico and rol in ('tecnico', 'administrador')
  ) then
    raise exception 'Solo se puede asignar a un técnico o administrador.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    new.fecha_actualizacion := now();
    if new.estado in ('resuelto', 'cerrado') and old.estado not in ('resuelto', 'cerrado') then
      new.fecha_cierre := now();
    elsif new.estado in ('abierto', 'en_revision') then
      new.fecha_cierre := null;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.antes_de_guardar_ticket() from public, anon, authenticated;

create trigger ticket_antes_de_guardar
  before insert or update on public.ticket
  for each row execute function private.antes_de_guardar_ticket();

alter table public.ticket enable row level security;
alter table public.ticket_comentario enable row level security;

revoke all on public.ticket, public.ticket_comentario from anon;
revoke delete, truncate on public.ticket, public.ticket_comentario from authenticated;
revoke update on public.ticket_comentario from authenticated;
-- El personal solo cambia estado, prioridad y asignación.
revoke update on public.ticket from authenticated;
grant update (estado, prioridad, id_tecnico) on public.ticket to authenticated;

-- El turista ve solo los suyos; técnico y administrador ven todos.
create policy "ticket: ver los propios o todos si es personal" on public.ticket
  for select to authenticated
  using (id_usuario = (select auth.uid()) or public.es_personal());

-- Cualquier usuario crea tickets a su nombre, abiertos y sin asignar.
create policy "ticket: crear los propios" on public.ticket
  for insert to authenticated
  with check (id_usuario = (select auth.uid()) and estado = 'abierto' and id_tecnico is null);

create policy "ticket: el personal actualiza" on public.ticket
  for update to authenticated
  using (public.es_personal())
  with check (public.es_personal());

-- Comentarios: visibles si el ticket es visible; cualquiera que vea el ticket comenta.
create policy "ticket_comentario: ver los de tickets visibles" on public.ticket_comentario
  for select to authenticated
  using (exists (select 1 from public.ticket t where t.id_ticket = ticket_comentario.id_ticket));

create policy "ticket_comentario: comentar tickets visibles" on public.ticket_comentario
  for insert to authenticated
  with check (
    id_usuario = (select auth.uid())
    and exists (select 1 from public.ticket t where t.id_ticket = ticket_comentario.id_ticket)
  );

-- ------------------------------------------------------------
-- Métricas del administrador (agregadas en la base, una sola llamada)
-- ------------------------------------------------------------
create function public.metricas_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede ver las métricas.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'usuarios', jsonb_build_object(
      'total', (select count(*) from public.usuario),
      'porRol', coalesce((select jsonb_object_agg(rol, n) from (select rol, count(*) n from public.usuario group by rol) r), '{}'::jsonb),
      'ultimos30Dias', (select count(*) from public.usuario where fecha_registro >= now() - interval '30 days')
    ),
    'interacciones', jsonb_build_object(
      'total', (select count(*) from public.interaccion),
      'ultimos7Dias', (select count(*) from public.interaccion where fecha_hora >= now() - interval '7 days'),
      'porTipo', coalesce((select jsonb_object_agg(tipo_interaccion, n) from (select tipo_interaccion, count(*) n from public.interaccion group by tipo_interaccion) t), '{}'::jsonb)
    ),
    'ticketsPorEstado', coalesce((select jsonb_object_agg(estado, n) from (select estado, count(*) n from public.ticket group by estado) e), '{}'::jsonb),
    'destinosMasVistos', coalesce((
      select jsonb_agg(jsonb_build_object('idDestino', id_destino, 'nombre', nombre, 'vistas', vistas) order by vistas desc, nombre)
      from (
        select d.id_destino, d.nombre, count(*) vistas
        from public.interaccion i
        join public.destino d using (id_destino)
        where i.tipo_interaccion = 'vista'
        group by d.id_destino, d.nombre
        order by vistas desc, d.nombre
        limit 10
      ) m
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.metricas_admin() from public, anon;
grant execute on function public.metricas_admin() to authenticated;
