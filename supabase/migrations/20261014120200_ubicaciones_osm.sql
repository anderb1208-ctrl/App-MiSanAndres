-- Punto de acceso (en tierra) de los destinos, calculado con OpenStreetMap.
-- Generado por backend/scripts/geolocalizar-destinos.ts el 2026-10-13T01:49:47.124Z.
-- Datos © colaboradores de OpenStreetMap (ODbL). Detalle por destino: docs/datos-por-verificar.md.
-- Solo actualiza filas existentes (por nombre): no borra nada.

update public.destino as d
set latitud = v.latitud,
    longitud = v.longitud,
    ubicacion_fuente = v.fuente::public.ubicacion_fuente,
    ubicacion_verificada = v.verificada
from (values
  ('Playa de Spratt Bight', 12.585246, -81.693270, 'osm', false),
  ('Playa de San Luis', 12.530005, -81.707701, 'aproximada', false),
  ('Rocky Cay', 12.543624, -81.703992, 'osm', false),
  ('Playa de Sound Bay', 12.516862, -81.714277, 'osm', false),
  ('Cocoplum Bay', 12.542496, -81.707070, 'osm', false),
  ('Playa Los Charquitos', 12.480600, -81.728700, 'aproximada', false),
  ('Bahía Sardina', 12.583335, -81.691070, 'osm', false),
  ('Johnny Cay', 12.599784, -81.690421, 'osm', false),
  ('El Acuario (Rose Cay)', 12.553161, -81.689049, 'osm', false),
  ('Haynes Cay', 12.550556, -81.689238, 'osm', false),
  ('Cayo Bolívar', 12.399145, -81.475497, 'osm', false),
  ('La Regatta', 12.580267, -81.691796, 'osm', false),
  ('Miss Celia', 12.581208, -81.691748, 'osm', false),
  ('Donde Francesca', 12.519852, -81.713905, 'osm', false),
  ('Fishermen''s Place', 12.590403, -81.700637, 'osm', false),
  ('Gourmet Shop Assho', 12.581517, -81.692729, 'osm', false),
  ('Capitán Mandy', 12.580954, -81.698561, 'osm', false),
  ('West View', 12.520718, -81.729171, 'osm', false),
  ('La Piscinita', 12.508634, -81.729559, 'osm', false),
  ('Kayak en el Manglar de Old Point', 12.566000, -81.704000, 'aproximada', false),
  ('Paseo en semisubmarino', 12.580118, -81.690372, 'osm', false),
  ('Aquanautas (caminata submarina)', 12.520692, -81.729055, 'osm', false),
  ('Buceo con Karibik Diver', 12.580288, -81.690093, 'osm', false),
  ('Vuelta a la isla', 12.582200, -81.695500, 'aproximada', false),
  ('Hoyo Soplador', 12.481358, -81.731107, 'osm', false),
  ('Laguna Big Pond', 12.548054, -81.719180, 'osm', false),
  ('Jardín Botánico de San Andrés', 12.537151, -81.711551, 'osm', false),
  ('Primera Iglesia Bautista', 12.561879, -81.716904, 'osm', false),
  ('Cueva de Morgan', 12.542459, -81.729628, 'osm', false),
  ('Casa Museo Isleña', 12.560124, -81.729008, 'osm', false)
) as v (nombre, latitud, longitud, fuente, verificada)
where d.nombre = v.nombre;
