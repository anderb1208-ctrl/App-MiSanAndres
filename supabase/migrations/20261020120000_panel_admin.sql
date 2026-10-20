-- Panel del administrador: desde cuándo está cerrado un destino y métricas con tendencia.
--
-- 1. destino.cierre_desde: lo llena un trigger al pasar a cerrado_temporal (y lo limpia al
--    salir de ese estado). El backend no lo escribe, así que el cambio es compatible con
--    versiones anteriores del backend. Los cierres anteriores a esta migración quedan sin fecha.
-- 2. metricas_admin(): conserva todos los campos anteriores y agrega el periodo anterior
--    (variación), los usuarios activos y los favoritos más guardados.

alter table public.destino add column if not exists cierre_desde timestamptz;

comment on column public.destino.cierre_desde is
  'Inicio del cierre temporal vigente (lo pone el trigger destino_cierre_desde). Null si no está cerrado o si se cerró antes de esta columna.';

create or replace function public.marcar_cierre_desde()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'cerrado_temporal' and (tg_op = 'INSERT' or old.estado is distinct from 'cerrado_temporal') then
    new.cierre_desde := now();
  elsif new.estado is distinct from 'cerrado_temporal' then
    new.cierre_desde := null;
  end if;
  return new;
end;
$$;

drop trigger if exists destino_cierre_desde on public.destino;
create trigger destino_cierre_desde
  before insert or update of estado on public.destino
  for each row execute function public.marcar_cierre_desde();

create or replace function public.metricas_admin()
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
      'ultimos30Dias', (select count(*) from public.usuario where fecha_registro >= now() - interval '30 days'),
      'anteriores30Dias', (select count(*) from public.usuario
                           where fecha_registro >= now() - interval '60 days' and fecha_registro < now() - interval '30 days')
    ),
    'interacciones', jsonb_build_object(
      'total', (select count(*) from public.interaccion),
      'ultimos7Dias', (select count(*) from public.interaccion where fecha_hora >= now() - interval '7 days'),
      'anteriores7Dias', (select count(*) from public.interaccion
                          where fecha_hora >= now() - interval '14 days' and fecha_hora < now() - interval '7 days'),
      'porTipo', coalesce((select jsonb_object_agg(tipo_interaccion, n) from (select tipo_interaccion, count(*) n from public.interaccion group by tipo_interaccion) t), '{}'::jsonb)
    ),
    -- Usuarios con al menos una interacción en el periodo.
    'usuariosActivos', jsonb_build_object(
      'ultimos7Dias', (select count(distinct id_usuario) from public.interaccion where fecha_hora >= now() - interval '7 days'),
      'anteriores7Dias', (select count(distinct id_usuario) from public.interaccion
                          where fecha_hora >= now() - interval '14 days' and fecha_hora < now() - interval '7 days')
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
    ), '[]'::jsonb),
    'favoritosMasGuardados', coalesce((
      select jsonb_agg(jsonb_build_object('idDestino', id_destino, 'nombre', nombre, 'favoritos', favoritos) order by favoritos desc, nombre)
      from (
        select d.id_destino, d.nombre, count(*) favoritos
        from public.favorito f
        join public.destino d using (id_destino)
        group by d.id_destino, d.nombre
        order by favoritos desc, d.nombre
        limit 5
      ) f
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.metricas_admin() from public, anon;
grant execute on function public.metricas_admin() to authenticated;
