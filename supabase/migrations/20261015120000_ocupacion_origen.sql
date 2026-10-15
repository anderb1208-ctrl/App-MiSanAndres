-- Distingue la ocupación simulada de la real.
--
-- Aditiva: agrega una columna con valor por defecto 'sintetico'. No borra ni modifica
-- datos: las filas que ya existen (todas generadas por supabase/seed.sql) quedan como
-- 'sintetico', que es lo que son. El backend desplegado no conoce la columna y sigue
-- funcionando. Las filas reales las carga ml/cargar_datos_reales.py --subir-a-supabase
-- con origen = 'real'.

create type public.origen_ocupacion as enum ('sintetico', 'real');

alter table public.ocupacion
  add column origen public.origen_ocupacion not null default 'sintetico';

comment on column public.ocupacion.origen is
  'sintetico = generada por supabase/seed.sql (no es una medición); real = medición cargada con ml/cargar_datos_reales.py.';

create index ocupacion_origen_idx on public.ocupacion (origen);
