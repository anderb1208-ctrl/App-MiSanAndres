-- Favoritos con alertas, dispositivos para notificaciones push y cierre temporal manual.
--
-- ADITIVA: tablas y columnas nuevas (opcionales o con valor por defecto). No modifica datos.
--
-- Cierre temporal: destino.estado YA tiene el valor 'cerrado_temporal' (migración inicial).
-- En vez de duplicarlo con otra columna booleana, el cierre temporal ES estado =
-- 'cerrado_temporal', y se agregan su motivo y su fecha de fin opcional. Si cierre_hasta ya
-- pasó, el backend considera el destino abierto en las consultas (sin tareas programadas).

alter table public.destino
  add column motivo_cierre text check (motivo_cierre is null or char_length(motivo_cierre) between 3 and 200),
  add column cierre_hasta timestamptz;

comment on column public.destino.motivo_cierre is 'Motivo del cierre temporal (se muestra en el aviso y en el detalle).';
comment on column public.destino.cierre_hasta is 'Fin previsto del cierre temporal; al pasar, el destino se considera abierto.';

-- ------------------------------------------------------------
-- Favoritos
-- ------------------------------------------------------------
create table public.favorito (
  id_usuario uuid not null references public.usuario (id_usuario) on delete cascade,
  id_destino integer not null references public.destino (id_destino) on delete cascade,
  avisar_apertura boolean not null default true,
  avisar_cierre boolean not null default true,
  fecha_creacion timestamptz not null default now(),
  primary key (id_usuario, id_destino)
);

create index favorito_id_destino_idx on public.favorito (id_destino);

alter table public.favorito enable row level security;
revoke all on public.favorito from anon;

create policy "favorito: ver los propios" on public.favorito
  for select to authenticated using (id_usuario = (select auth.uid()));
create policy "favorito: agregar los propios" on public.favorito
  for insert to authenticated with check (id_usuario = (select auth.uid()));
create policy "favorito: cambiar los propios" on public.favorito
  for update to authenticated using (id_usuario = (select auth.uid())) with check (id_usuario = (select auth.uid()));
create policy "favorito: quitar los propios" on public.favorito
  for delete to authenticated using (id_usuario = (select auth.uid()));

-- ------------------------------------------------------------
-- Dispositivos para notificaciones push (token de Expo)
-- ------------------------------------------------------------
create type public.plataforma_dispositivo as enum ('ios', 'android', 'web');

create table public.dispositivo_push (
  id_dispositivo bigint generated always as identity primary key,
  id_usuario uuid not null references public.usuario (id_usuario) on delete cascade,
  token text not null unique check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  plataforma public.plataforma_dispositivo not null,
  activo boolean not null default true,
  fecha_registro timestamptz not null default now(),
  fecha_actualizacion timestamptz not null default now()
);

create index dispositivo_push_id_usuario_idx on public.dispositivo_push (id_usuario);

alter table public.dispositivo_push enable row level security;
revoke all on public.dispositivo_push from anon;
-- El cliente solo lee sus dispositivos; registrar y quitar va por las funciones de abajo.
revoke insert, update, delete, truncate on public.dispositivo_push from authenticated;

create policy "dispositivo_push: ver los propios" on public.dispositivo_push
  for select to authenticated using (id_usuario = (select auth.uid()));

-- Registra el token para el usuario actual. Si el teléfono lo tenía otra cuenta (cambió de
-- usuario), el token pasa a la cuenta actual: un dispositivo recibe los avisos de quien
-- tiene la sesión abierta.
create function public.registrar_dispositivo_push(p_token text, p_plataforma public.plataforma_dispositivo)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere iniciar sesión.' using errcode = '42501';
  end if;
  insert into public.dispositivo_push (id_usuario, token, plataforma)
  values ((select auth.uid()), p_token, p_plataforma)
  on conflict (token) do update
    set id_usuario = excluded.id_usuario,
        plataforma = excluded.plataforma,
        activo = true,
        fecha_actualizacion = now();
end;
$$;

-- Quita el token del usuario actual (al cerrar sesión).
create function public.quitar_dispositivo_push(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.dispositivo_push where token = p_token and id_usuario = (select auth.uid());
$$;

-- Tokens activos de quienes tienen el destino en favoritos con el aviso indicado
-- ('cierre' o 'apertura'). Solo administradores (los usa el backend al cambiar el estado).
create function public.tokens_para_aviso(p_id_destino integer, p_tipo text)
returns table (token text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede enviar avisos.' using errcode = '42501';
  end if;
  if p_tipo not in ('cierre', 'apertura') then
    raise exception 'Tipo de aviso inválido.' using errcode = 'P0001';
  end if;
  return query
    select distinct d.token
    from public.favorito f
    join public.dispositivo_push d on d.id_usuario = f.id_usuario and d.activo
    where f.id_destino = p_id_destino
      and ((p_tipo = 'cierre' and f.avisar_cierre) or (p_tipo = 'apertura' and f.avisar_apertura));
end;
$$;

-- Desactiva tokens que Expo reportó como inválidos (DeviceNotRegistered).
create function public.desactivar_tokens_push(p_tokens text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not public.es_administrador() then
    raise exception 'Solo un administrador puede desactivar tokens.' using errcode = '42501';
  end if;
  update public.dispositivo_push set activo = false, fecha_actualizacion = now()
  where token = any (p_tokens) and activo;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke execute on function
  public.registrar_dispositivo_push(text, public.plataforma_dispositivo),
  public.quitar_dispositivo_push(text),
  public.tokens_para_aviso(integer, text),
  public.desactivar_tokens_push(text[])
from public, anon;
grant execute on function
  public.registrar_dispositivo_push(text, public.plataforma_dispositivo),
  public.quitar_dispositivo_push(text),
  public.tokens_para_aviso(integer, text),
  public.desactivar_tokens_push(text[])
to authenticated;
