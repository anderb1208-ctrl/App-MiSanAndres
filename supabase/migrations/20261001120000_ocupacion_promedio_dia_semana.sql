-- Amplía ocupacion_promedio_hora con un filtro opcional por día de la semana,
-- para calcular la "ocupación típica" de cada hora de, por ejemplo, un martes.
--
-- p_fin_de_semana: true = sábado y domingo; false = lunes a viernes; null = sin filtro.
-- p_dia_semana:    día ISO (1 = lunes … 7 = domingo); null = sin filtro.
-- p_hora:          0–23; null = todas las horas.
-- p_id_destino:    null = todos los destinos.
--
-- Cambia la firma, por eso se elimina y se vuelve a crear (PostgREST no resuelve
-- bien sobrecargas con parámetros por defecto).

drop function public.ocupacion_promedio_hora(boolean, integer, integer);

create function public.ocupacion_promedio_hora(
  p_fin_de_semana boolean default null,
  p_dia_semana integer default null,
  p_hora integer default null,
  p_id_destino integer default null
)
returns table (
  id_destino integer,
  hora integer,
  promedio numeric,
  muestras integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    o.id_destino,
    extract(hour from o.fecha_hora at time zone 'America/Bogota')::integer as hora,
    round(avg(o.porcentaje_ocupacion), 2) as promedio,
    count(*)::integer as muestras
  from public.ocupacion o
  where (p_id_destino is null or o.id_destino = p_id_destino)
    and (p_hora is null
         or extract(hour from o.fecha_hora at time zone 'America/Bogota')::integer = p_hora)
    and (p_fin_de_semana is null
         or (extract(isodow from o.fecha_hora at time zone 'America/Bogota') in (6, 7)) = p_fin_de_semana)
    and (p_dia_semana is null
         or extract(isodow from o.fecha_hora at time zone 'America/Bogota')::integer = p_dia_semana)
  group by o.id_destino, 2
  order by o.id_destino, 2;
$$;

-- Solo la usan las peticiones del backend, que llegan como anon (endpoints públicos)
-- o authenticated (con el JWT del usuario).
revoke execute on function public.ocupacion_promedio_hora(boolean, integer, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.ocupacion_promedio_hora(boolean, integer, integer, integer)
  to anon, authenticated;
