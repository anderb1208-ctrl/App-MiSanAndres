-- La ubicación textual del destino es obligatoria, como define el entregable de diseño.

alter table public.destino
  alter column ubicacion_texto set not null;
