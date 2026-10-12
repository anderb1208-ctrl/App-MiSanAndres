-- Contenido del destino para el prototipo: horario, rango de precio, cómo llegar
-- y crédito de la imagen. Todas las columnas son opcionales (aditivo: el backend
-- desplegado no las conoce y sigue funcionando).

create type public.rango_precio as enum ('Gratis', '$', '$$', '$$$');

alter table public.destino
  add column horario_apertura time,
  add column horario_cierre time,
  add column rango_precio public.rango_precio,
  add column como_llegar text,
  add column imagen_autor text,
  add column imagen_licencia text,
  add column imagen_fuente text;

-- El horario va completo o no va, y no cruza la medianoche.
alter table public.destino
  add constraint destino_horario_completo
    check ((horario_apertura is null) = (horario_cierre is null)),
  add constraint destino_horario_orden
    check (horario_apertura is null or horario_apertura < horario_cierre);

comment on column public.destino.horario_apertura is 'Hora local (America/Bogota) de apertura; null = sin horario (siempre accesible).';
comment on column public.destino.horario_cierre is 'Hora local (America/Bogota) de cierre, exclusiva.';
comment on column public.destino.imagen_fuente is 'Enlace a la página de la foto (para el crédito y la licencia).';
