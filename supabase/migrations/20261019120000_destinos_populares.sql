-- Destinos más vistos por TODOS los usuarios (filtro "Populares" del historial).
-- Solo devuelve totales por destino: ningún dato personal (ni ids de usuario ni fechas
-- individuales). security definer porque RLS deja ver a cada usuario solo sus interacciones.
-- Migración aditiva: no modifica tablas.

create or replace function public.destinos_populares(p_desde timestamptz, p_limite integer default 50)
returns table (id_destino integer, vistas bigint, usuarios bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id_destino, count(*) as vistas, count(distinct i.id_usuario) as usuarios
  from public.interaccion i
  join public.destino d on d.id_destino = i.id_destino and d.estado <> 'inactivo'
  where i.fecha_hora >= p_desde
  group by i.id_destino
  order by vistas desc, i.id_destino
  limit least(greatest(coalesce(p_limite, 50), 1), 100);
$$;

comment on function public.destinos_populares(timestamptz, integer) is
  'Totales agregados de interacciones por destino desde p_desde (sin datos personales). Lo usa GET /v1/historial?filtro=populares.';

revoke execute on function public.destinos_populares(timestamptz, integer) from public, anon;
grant execute on function public.destinos_populares(timestamptz, integer) to authenticated;
