-- 15 destinos nuevos (total 30) y dos experiencias nuevas en el catálogo.
--
-- Aditiva e idempotente: la base la comparte el backend desplegado en Render.
-- No borra ni cambia filas existentes; los 15 destinos actuales conservan su id.
-- Coordenadas iniciales aproximadas: las reemplaza la geolocalización con
-- OpenStreetMap (migración 20261014120200). Horarios, precios y datos por
-- confirmar: docs/datos-por-verificar.md.

-- ------------------------------------------------------------
-- Catálogo: experiencias nuevas para las actividades bajo el agua y la naturaleza
-- ------------------------------------------------------------
insert into public.preferencia (tipo, codigo, nombre, descripcion) values
  ('experiencia', 'acuatica',  'Bajo el agua', 'Snorkel, buceo y fondo marino'),
  ('experiencia', 'ecologica', 'Ecoturismo',   'Naturaleza, fauna y senderos')
on conflict (tipo, codigo) do nothing;

-- ------------------------------------------------------------
-- Destinos nuevos
-- ------------------------------------------------------------
insert into public.destino (
  nombre, descripcion, categoria, latitud, longitud, ubicacion_texto, capacidad, estado,
  horario_apertura, horario_cierre, rango_precio, como_llegar
) values
  -- Playas
  ('Cocoplum Bay',
   'Playa de arena blanca y agua tranquila y poco profunda en San Luis, frente a Rocky Cay, con palmeras y restaurantes de playa.',
   'playa', 12.542500, -81.705600, 'Costa oriental, sector San Luis, frente a Rocky Cay', 500, 'abierto',
   '06:00', '18:00', 'Gratis',
   'Por la vía circunvalar hacia San Luis, unos 15 minutos desde el centro en taxi, bus o moto.'),

  ('Playa Los Charquitos',
   'Playa pequeña y tranquila a la orilla de la carretera, con pozos de agua (charquitos) que se forman entre las rocas con la marea baja; buena para niños y adultos mayores.',
   'playa', 12.480600, -81.728700, 'Extremo sur de la isla (South End), junto a la vía circunvalar', 200, 'abierto',
   '06:00', '18:00', 'Gratis',
   'Por la vía circunvalar hasta el extremo sur, unos 30 minutos desde el centro; queda cerca del Hoyo Soplador.'),

  ('Bahía Sardina',
   'Playa urbana del sector oriental de North End, frente a los hoteles de la Avenida Colombia, con agua clara y poco profunda y vista hacia Johnny Cay.',
   'playa', 12.583600, -81.690900, 'North End, sector oriental de la Avenida Colombia', 600, 'abierto',
   '06:00', '19:00', 'Gratis',
   'En el centro (North End); se llega caminando por la Avenida Colombia desde la playa de Spratt Bight.'),

  -- Cayos
  ('Cayo Bolívar',
   'Cayos del Este-Sudeste (Courtown Cays): islotes de arena blanca rodeados de arrecife, lejos de la multitud, para un día de playa y snorkel.',
   'cayo', 12.404500, -81.468500, 'Cayos del Este-Sudeste (Courtown Cays), al sureste de la isla', 150, 'abierto',
   '09:00', '16:00', '$$$',
   'Tour de día completo en lancha o catamarán desde el muelle de North End, con reserva; solo sale con buen tiempo.'),

  -- Restaurantes
  ('Fishermen''s Place',
   'Restaurante de pescadores raizales frente al mar, al occidente de Spratt Bight; cocina isleña con pescado y mariscos frescos.',
   'gastronomia', 12.590400, -81.700600, 'North End, extremo occidental de Spratt Bight, cerca del aeropuerto', 120, 'abierto',
   '12:00', '17:00', '$$',
   'En North End, caminando hacia el occidente por la playa de Spratt Bight, en dirección al aeropuerto.'),

  ('Gourmet Shop Assho',
   'Restaurante, tienda gourmet y vinoteca en el centro, con pastas, carnes y mariscos; ambiente tranquilo para cenar.',
   'gastronomia', 12.581500, -81.692700, 'North End, centro comercial de la isla', 80, 'abierto',
   '12:00', '22:00', '$$$',
   'En el centro (North End); se llega caminando desde los hoteles del centro.'),

  ('Capitán Mandy',
   'Restaurante de mariscos conocido por sus platos para compartir de langosta, cangrejo, camarón y pescado.',
   'gastronomia', 12.581000, -81.698600, 'North End, centro de la isla', 100, 'abierto',
   '12:00', '22:00', '$$',
   'En el centro (North End); se llega caminando o en taxi desde los hoteles del centro.'),

  -- Actividades
  ('Paseo en semisubmarino',
   'Recorrido de cerca de hora y media en un barco con casco de vidrio sobre el arrecife frente a North End, con parada para nadar; se ven peces y corales sin mojarse.',
   'actividad', 12.580100, -81.690400, 'Muelle Casa de la Cultura, North End', 60, 'abierto',
   '10:00', '17:00', '$$',
   'Salidas desde el muelle de la Casa de la Cultura (North End), con reserva. Normalmente hay una salida en la mañana y otra en la tarde.'),

  ('Aquanautas (caminata submarina)',
   'Caminata por el fondo del mar a unos 6 m de profundidad con un casco que permite respirar normalmente, acompañado por un instructor; no hace falta saber nadar.',
   'actividad', 12.520700, -81.729100, 'Costa occidental, sector West View (El Cove)', 30, 'abierto',
   '09:00', '16:00', '$$$',
   'Por la vía circunvalar hacia el occidente, unos 20 minutos desde el centro, junto a West View. Con reserva; edad mínima 12 años.'),

  ('Buceo con Karibik Diver',
   'Centro de buceo de North End con inmersiones guiadas en los arrecifes de la isla, bautizos para principiantes y cursos de certificación.',
   'actividad', 12.580300, -81.690100, 'North End, cerca del muelle de la Casa de la Cultura', 40, 'abierto',
   '08:00', '17:00', '$$$',
   'En el centro (North End). Las inmersiones salen en lancha; se reservan con un día de anticipación.'),

  ('Vuelta a la isla',
   'Recorrido por la vía circunvalar (unos 30 km) en carrito de golf alquilado o en chiva, con paradas en West View, la Cueva de Morgan, el Hoyo Soplador y San Luis.',
   'actividad', 12.582200, -81.695500, 'North End, alquiler de carritos sobre la Avenida Colombia', 200, 'abierto',
   '08:00', '18:00', '$$',
   'Los carritos de golf se alquilan por horas en North End; las chivas recogen en los hoteles. Toma medio día con paradas.'),

  -- Naturaleza
  ('Laguna Big Pond',
   'Laguna de agua dulce en el interior de la isla, rodeada de vegetación, donde se ven babillas y tortugas desde la orilla.',
   'naturaleza', 12.548400, -81.721400, 'Sector La Loma, interior de la isla (Vía Big Pond)', 100, 'abierto',
   '08:00', '17:00', '$',
   'Subiendo a La Loma desde el centro o desde San Luis, unos 15 minutos en taxi o moto; está en la Vía Big Pond.'),

  ('Jardín Botánico de San Andrés',
   'Jardín botánico de la Universidad Nacional (sede Caribe) con senderos entre plantas nativas de las islas y un mirador.',
   'naturaleza', 12.537200, -81.711600, 'Sector San Luis, vía a La Loma', 100, 'abierto',
   '08:00', '17:00', '$',
   'Por la vía circunvalar hacia San Luis y luego subiendo hacia La Loma, unos 15 minutos desde el centro.'),

  -- Cultura
  ('Cueva de Morgan',
   'Parque temático en torno a la cueva donde, según la leyenda, el pirata Henry Morgan escondió su tesoro; tiene museo, casa típica isleña y muestras de cultura raizal.',
   'cultura', 12.542400, -81.729400, 'Costa occidental, vía circunvalar', 300, 'abierto',
   '09:00', '17:00', '$$',
   'Por la vía circunvalar hacia el occidente, unos 20 minutos desde el centro. Es parada habitual de la vuelta a la isla.'),

  ('Casa Museo Isleña',
   'Réplica de una casa tradicional isleña de madera donde guías cuentan la historia y las costumbres de la cultura raizal.',
   'cultura', 12.560100, -81.729000, 'Costa occidental, vía circunvalar', 80, 'abierto',
   '09:00', '17:00', '$',
   'Por la vía circunvalar hacia el occidente, unos 15 minutos desde el centro. Es parada habitual de la vuelta a la isla.')
on conflict (nombre) do nothing;

-- ------------------------------------------------------------
-- Etiquetas de experiencia y grupo (nuevos destinos y experiencias nuevas
-- en destinos existentes)
-- ------------------------------------------------------------
insert into public.destino_preferencia (id_destino, id_preferencia)
select d.id_destino, p.id_preferencia
from (values
  ('Cocoplum Bay',                    'experiencia', 'relax'),
  ('Cocoplum Bay',                    'experiencia', 'familiar'),
  ('Cocoplum Bay',                    'grupo',       'familia_ninos'),
  ('Cocoplum Bay',                    'grupo',       'pareja'),
  ('Playa Los Charquitos',            'experiencia', 'relax'),
  ('Playa Los Charquitos',            'experiencia', 'familiar'),
  ('Playa Los Charquitos',            'grupo',       'familia_ninos'),
  ('Playa Los Charquitos',            'grupo',       'adulto_mayor'),
  ('Bahía Sardina',                   'experiencia', 'relax'),
  ('Bahía Sardina',                   'experiencia', 'fotografia'),
  ('Bahía Sardina',                   'grupo',       'amigos'),
  ('Bahía Sardina',                   'grupo',       'familia_ninos'),
  ('Cayo Bolívar',                    'experiencia', 'aventura'),
  ('Cayo Bolívar',                    'experiencia', 'acuatica'),
  ('Cayo Bolívar',                    'experiencia', 'fotografia'),
  ('Cayo Bolívar',                    'grupo',       'amigos'),
  ('Cayo Bolívar',                    'grupo',       'pareja'),
  ('Fishermen''s Place',              'experiencia', 'gastronomica'),
  ('Fishermen''s Place',              'experiencia', 'cultural'),
  ('Fishermen''s Place',              'grupo',       'amigos'),
  ('Fishermen''s Place',              'grupo',       'familia_ninos'),
  ('Gourmet Shop Assho',              'experiencia', 'gastronomica'),
  ('Gourmet Shop Assho',              'experiencia', 'romantica'),
  ('Gourmet Shop Assho',              'grupo',       'pareja'),
  ('Gourmet Shop Assho',              'grupo',       'adulto_mayor'),
  ('Capitán Mandy',                   'experiencia', 'gastronomica'),
  ('Capitán Mandy',                   'experiencia', 'familiar'),
  ('Capitán Mandy',                   'grupo',       'amigos'),
  ('Capitán Mandy',                   'grupo',       'familia_ninos'),
  ('Paseo en semisubmarino',          'experiencia', 'familiar'),
  ('Paseo en semisubmarino',          'experiencia', 'acuatica'),
  ('Paseo en semisubmarino',          'grupo',       'familia_ninos'),
  ('Paseo en semisubmarino',          'grupo',       'adulto_mayor'),
  ('Aquanautas (caminata submarina)', 'experiencia', 'aventura'),
  ('Aquanautas (caminata submarina)', 'experiencia', 'acuatica'),
  ('Aquanautas (caminata submarina)', 'grupo',       'amigos'),
  ('Aquanautas (caminata submarina)', 'grupo',       'pareja'),
  ('Buceo con Karibik Diver',         'experiencia', 'aventura'),
  ('Buceo con Karibik Diver',         'experiencia', 'acuatica'),
  ('Buceo con Karibik Diver',         'grupo',       'solo'),
  ('Buceo con Karibik Diver',         'grupo',       'amigos'),
  ('Vuelta a la isla',                'experiencia', 'aventura'),
  ('Vuelta a la isla',                'experiencia', 'fotografia'),
  ('Vuelta a la isla',                'grupo',       'amigos'),
  ('Vuelta a la isla',                'grupo',       'familia_ninos'),
  ('Laguna Big Pond',                 'experiencia', 'ecologica'),
  ('Laguna Big Pond',                 'experiencia', 'familiar'),
  ('Laguna Big Pond',                 'grupo',       'familia_ninos'),
  ('Laguna Big Pond',                 'grupo',       'adulto_mayor'),
  ('Jardín Botánico de San Andrés',   'experiencia', 'ecologica'),
  ('Jardín Botánico de San Andrés',   'experiencia', 'fotografia'),
  ('Jardín Botánico de San Andrés',   'grupo',       'solo'),
  ('Jardín Botánico de San Andrés',   'grupo',       'adulto_mayor'),
  ('Cueva de Morgan',                 'experiencia', 'cultural'),
  ('Cueva de Morgan',                 'experiencia', 'familiar'),
  ('Cueva de Morgan',                 'grupo',       'familia_ninos'),
  ('Cueva de Morgan',                 'grupo',       'amigos'),
  ('Casa Museo Isleña',               'experiencia', 'cultural'),
  ('Casa Museo Isleña',               'experiencia', 'fotografia'),
  ('Casa Museo Isleña',               'grupo',       'adulto_mayor'),
  ('Casa Museo Isleña',               'grupo',       'familia_ninos'),
  -- Experiencias nuevas en destinos existentes
  ('West View',                       'experiencia', 'acuatica'),
  ('La Piscinita',                    'experiencia', 'acuatica'),
  ('El Acuario (Rose Cay)',           'experiencia', 'acuatica'),
  ('Haynes Cay',                      'experiencia', 'acuatica'),
  ('Kayak en el Manglar de Old Point','experiencia', 'acuatica'),
  ('Kayak en el Manglar de Old Point','experiencia', 'ecologica'),
  ('Hoyo Soplador',                   'experiencia', 'ecologica')
) as e (destino, tipo, codigo)
join public.destino d on d.nombre = e.destino
join public.preferencia p on p.tipo = e.tipo::public.tipo_preferencia and p.codigo = e.codigo
on conflict do nothing;
