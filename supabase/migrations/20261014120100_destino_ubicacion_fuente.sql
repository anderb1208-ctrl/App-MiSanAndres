-- Origen y revisión de las coordenadas de cada destino.
-- Aditiva: columnas nuevas con valor por defecto; el backend desplegado no las
-- conoce y sigue funcionando.
--
-- Convención: latitud/longitud son el PUNTO DE ACCESO, siempre en tierra
-- (ver docs/cambios-al-diseno.md, sección "Ubicación de los destinos").

create type public.ubicacion_fuente as enum ('osm', 'manual', 'aproximada');

alter table public.destino
  add column ubicacion_fuente public.ubicacion_fuente not null default 'aproximada',
  add column ubicacion_verificada boolean not null default false;

comment on column public.destino.ubicacion_fuente is
  'osm = calculada con OpenStreetMap (backend/scripts/geolocalizar-destinos.ts); manual = corregida a mano (npm run ubicaciones:corregir); aproximada = estimada, sin fuente.';
comment on column public.destino.ubicacion_verificada is
  'true cuando una persona revisó el punto en docs/revision-ubicaciones.html.';
