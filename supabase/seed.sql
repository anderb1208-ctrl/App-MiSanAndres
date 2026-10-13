-- ============================================================================
-- ⚠️  ADVERTENCIA: ESTE SCRIPT BORRA DATOS. USAR SOLO EN DESARROLLO.
--
-- Hace TRUNCATE ... CASCADE sobre destino, preferencia, destino_preferencia y
-- ocupacion. Por la cascada también vacía interaccion y usuario_preferencia
-- (las interacciones y preferencias de TODOS los usuarios).
-- Nunca ejecutarlo contra la base de producción.
-- ============================================================================
--
-- La ocupación es SINTÉTICA (ver docs/datos-sinteticos.md). El clima real
-- (clima_hora, cargado con supabase/clima_hora.sql) se conserva: se respalda por
-- nombre de destino antes del TRUNCATE y se restaura después, y la ocupación
-- generada responde a él (menos gente al aire libre cuando llovió).
--
-- Datos de prueba del prototipo (base de desarrollo).
-- No crea usuarios: se crean al registrarse con Supabase Auth.
-- Es re-ejecutable: limpia los catálogos y la ocupación antes de insertar.
--
-- Horarios, precios y coordenadas son aproximados: la lista de lo que falta
-- confirmar está en docs/datos-por-verificar.md. Créditos de las fotos en
-- docs/creditos-imagenes.md.

-- Respaldo del clima real (la cascada desde destino vaciaría clima_hora).
drop table if exists pg_temp.clima_respaldo;
create temp table clima_respaldo as
  select d.nombre, c.fecha_hora, c.temperatura, c.prob_lluvia, c.precipitacion, c.codigo_clima, c.viento
  from public.clima_hora c
  join public.destino d using (id_destino);

truncate public.ocupacion, public.clima_hora, public.destino_preferencia, public.destino, public.preferencia
  restart identity cascade;

-- ------------------------------------------------------------
-- Catálogo de preferencias
-- (el valor 'buceo_snorkel' sigue en el enum pero ya no tiene destinos:
--  las actividades acuáticas usan 'actividad')
-- ------------------------------------------------------------
insert into public.preferencia (tipo, codigo, nombre, descripcion) values
  ('categoria',   'playa',          'Playas',               'Playas de arena blanca y mar de siete colores'),
  ('categoria',   'cayo',           'Cayos',                'Islotes cercanos a los que se llega en lancha'),
  ('categoria',   'gastronomia',    'Restaurantes',         'Cocina isleña, mariscos y restaurantes reconocidos'),
  ('categoria',   'actividad',      'Actividades',          'Snorkel, buceo, kayak y paseos en el mar'),
  ('categoria',   'naturaleza',     'Naturaleza',           'Formaciones naturales, manglares y fauna'),
  ('categoria',   'cultura',        'Cultura',              'Historia y tradición raizal'),
  ('experiencia', 'relax',          'Relax',                'Descansar sin afanes'),
  ('experiencia', 'aventura',       'Aventura',             'Actividad física y adrenalina'),
  ('experiencia', 'familiar',       'Familiar',             'Planes seguros para todas las edades'),
  ('experiencia', 'romantica',      'Romántica',            'Lugares tranquilos para ir en pareja'),
  ('experiencia', 'cultural',       'Cultural',             'Conocer la historia y costumbres de la isla'),
  ('experiencia', 'fotografia',     'Fotografía',           'Paisajes y atardeceres para fotografiar'),
  ('experiencia', 'gastronomica',   'Gastronómica',         'Probar la cocina típica de la isla'),
  ('experiencia', 'acuatica',       'Bajo el agua',         'Snorkel, buceo y fondo marino'),
  ('experiencia', 'ecologica',      'Ecoturismo',           'Naturaleza, fauna y senderos'),
  ('grupo',       'solo',           'Viajo solo',           null),
  ('grupo',       'pareja',         'En pareja',            null),
  ('grupo',       'familia_ninos',  'En familia con niños', null),
  ('grupo',       'amigos',         'Con amigos',           null),
  ('grupo',       'adulto_mayor',   'Con adultos mayores',  null);

-- ------------------------------------------------------------
-- Destinos (coordenadas, horarios y precios aproximados)
-- Horario en hora de Colombia; cierre exclusivo.
-- ------------------------------------------------------------
insert into public.destino (
  nombre, descripcion, categoria, latitud, longitud, ubicacion_texto, capacidad, estado,
  horario_apertura, horario_cierre, rango_precio, como_llegar,
  imagen_url, imagen_autor, imagen_licencia, imagen_fuente
) values
  -- Playas
  ('Playa de Spratt Bight',
   'La playa principal de la isla, frente al paseo peatonal de North End, con arena blanca, palmeras y agua tranquila de color turquesa.',
   'playa', 12.584300, -81.698800, 'North End, frente a la Avenida Colombia', 1500, 'abierto',
   '06:00', '19:00', 'Gratis',
   'Está en el centro (North End). Se llega caminando desde la mayoría de hoteles del centro por el paseo peatonal.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Playa_del_Centro_%288327400981%29.jpg/960px-Playa_del_Centro_%288327400981%29.jpg',
   'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Playa_del_Centro_(8327400981).jpg'),

  ('Playa de San Luis',
   'Playa tranquila de la costa oriental, en el sector raizal de San Luis, con aguas calmadas y poca gente entre semana.',
   'playa', 12.539000, -81.700500, 'Costa oriental, sector San Luis', 600, 'abierto',
   '06:00', '19:00', 'Gratis',
   'Por la vía circunvalar hacia el sur, unos 15 minutos desde el centro en taxi, bus o moto.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/San_Luis_%288321267521%29.jpg/960px-San_Luis_%288321267521%29.jpg',
   'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:San_Luis_(8321267521).jpg'),

  ('Rocky Cay',
   'Playa frente a un pequeño cayo al que se puede llegar caminando por el agua poco profunda; cerca se ve un barco encallado.',
   'playa', 12.512500, -81.704500, 'Costa oriental, al sur de San Luis', 400, 'abierto',
   '06:00', '18:00', 'Gratis',
   'Por la vía circunvalar hacia el sur, pasando San Luis, unos 20 minutos desde el centro.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Rocky_Cay_%288320969633%29.jpg/960px-Rocky_Cay_%288320969633%29.jpg',
   'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Rocky_Cay_(8320969633).jpg'),

  ('Playa de Sound Bay',
   'Playa amplia y poco concurrida en la costa oriental, buena para descansar lejos del centro.',
   'playa', 12.552000, -81.703000, 'Costa oriental, sector Sound Bay (San Luis)', 300, 'abierto',
   '06:00', '18:00', 'Gratis',
   'Por la vía circunvalar hacia el sur, unos 10 minutos desde el centro.',
   null, null, null, null),

  -- Cayos
  ('Johnny Cay',
   'Cayo con playa de arena blanca, palmeras y música; es parque regional, por lo que se paga una entrada además de la lancha.',
   'cayo', 12.600500, -81.689900, 'Frente a North End, a unos 15 minutos en lancha', 800, 'abierto',
   '09:00', '16:00', '$',
   'En lancha desde el muelle de North End. Normalmente se combina con El Acuario en el mismo tour.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Isla_Johnny_Cay.jpg/960px-Isla_Johnny_Cay.jpg',
   'EASLYHAKS', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Isla_Johnny_Cay.jpg'),

  ('El Acuario (Rose Cay)',
   'Cayo de aguas muy poco profundas y cristalinas donde se nada entre peces y se camina por el mar.',
   'cayo', 12.552900, -81.688700, 'Frente a San Luis, junto a Haynes Cay', 500, 'abierto',
   '09:00', '16:00', '$$',
   'En lancha desde el muelle de North End o desde San Luis, como parte del tour de cayos.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Acuario_de_San_Andr%C3%A9s_Islas.JPG/960px-Acuario_de_San_Andr%C3%A9s_Islas.JPG',
   'Mr.Jhosimar', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Acuario_de_San_Andr%C3%A9s_Islas.JPG'),

  ('Haynes Cay',
   'Cayo pequeño vecino de El Acuario, con kioscos de comida y música; en sus alrededores se suelen ver mantarrayas.',
   'cayo', 12.551000, -81.686000, 'Frente a San Luis, junto a El Acuario', 300, 'abierto',
   '09:00', '16:00', '$$',
   'En lancha como parte del tour de cayos; desde El Acuario se puede cruzar caminando por el agua cuando la marea lo permite.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Haynes_cay_%28view_from_west%29.JPG/960px-Haynes_cay_%28view_from_west%29.JPG',
   'Milenioscuro', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Haynes_cay_(view_from_west).JPG'),

  -- Restaurantes
  ('La Regatta',
   'Restaurante de mariscos sobre el mar, de los más reconocidos de la isla. Atiende al almuerzo y a la cena; conviene reservar.',
   'gastronomia', 12.580000, -81.696000, 'North End, Avenida Newball', 120, 'abierto',
   '12:00', '22:30', '$$$',
   'En el centro (North End), sobre la Avenida Newball; se llega caminando desde los hoteles del centro.',
   null, null, null, null),

  ('Miss Celia',
   'Restaurante de cocina isleña en una casa típica de madera, con platos como el rondón y mariscos.',
   'gastronomia', 12.578500, -81.699500, 'North End, Avenida Newball, frente al club náutico', 100, 'abierto',
   '12:00', '22:00', '$$',
   'En el centro (North End), sobre la Avenida Newball frente al club náutico.',
   null, null, null, null),

  ('Donde Francesca',
   'Restaurante de playa en San Luis, conocido por sus mariscos y su ambiente frente al mar.',
   'gastronomia', 12.545500, -81.700500, 'Costa oriental, sector San Luis', 150, 'abierto',
   '11:00', '17:00', '$$',
   'Por la vía circunvalar hacia el sur, unos 12 minutos desde el centro.',
   null, null, null, null),

  -- Actividades
  ('West View',
   'Piscina natural en el arrecife de la costa occidental, con trampolín y tobogán al mar; se hace snorkel entre peces de colores.',
   'actividad', 12.534500, -81.727100, 'Costa occidental, sector El Cove', 250, 'abierto',
   '08:00', '17:00', '$',
   'Por la vía circunvalar hacia el occidente, unos 20 minutos desde el centro. Se paga entrada; alquilan equipo de snorkel.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/West_View_%288333619624%29.jpg/960px-West_View_%288333619624%29.jpg',
   'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:West_View_(8333619624).jpg'),

  ('La Piscinita',
   'Piscina natural de agua turquesa entre rocas de coral, ideal para snorkel y para ver peces de cerca.',
   'actividad', 12.538000, -81.726500, 'Costa occidental, cerca de West View', 200, 'abierto',
   '08:00', '17:00', '$',
   'Por la vía circunvalar hacia el occidente, unos 20 minutos desde el centro. Se paga entrada; alquilan equipo de snorkel.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/San_Andres_Islas_La_Piscinita_-_panoramio.jpg/960px-San_Andres_Islas_La_Piscinita_-_panoramio.jpg',
   'adelmotrujillo (Panoramio)', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:San_Andres_Islas_La_Piscinita_-_panoramio.jpg'),

  ('Kayak en el Manglar de Old Point',
   'Recorrido guiado en kayak (también transparente) por los túneles del Parque Regional de Manglar Old Point, con parada para snorkel.',
   'actividad', 12.566000, -81.704000, 'Costa oriental, Parque Regional de Manglar Old Point', 60, 'abierto',
   '08:00', '16:00', '$$',
   'Por la vía circunvalar hacia San Luis, unos 10 minutos desde el centro. Los tours se reservan con operadores locales.',
   null, null, null, null),

  -- Naturaleza y cultura
  ('Hoyo Soplador',
   'Formación de coral en el extremo sur de la isla por donde el mar sale a presión como un géiser cuando hay oleaje.',
   'naturaleza', 12.482200, -81.731600, 'Extremo sur de la isla, vía circunvalar', 300, 'abierto',
   '07:00', '18:00', 'Gratis',
   'Por la vía circunvalar hasta el extremo sur, unos 30 minutos desde el centro. Es una parada habitual de la vuelta a la isla.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Hoyo_soplador%2C_San_Andres.jpg/960px-Hoyo_soplador%2C_San_Andres.jpg',
   'Denys', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Hoyo_soplador,_San_Andres.jpg'),

  ('Primera Iglesia Bautista',
   'Iglesia de madera en La Loma, fundada en 1844 y símbolo de la cultura raizal; desde allí se ve buena parte de la isla.',
   'cultura', 12.561500, -81.716800, 'Sector La Loma, centro de la isla', 150, 'abierto',
   '08:00', '17:00', 'Gratis',
   'Subiendo a La Loma desde el centro o desde San Luis, unos 15 minutos en taxi o moto.',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/First_Baptist_church_on_The_Hill%2C_La_Loma.jpg/960px-First_Baptist_church_on_The_Hill%2C_La_Loma.jpg',
   '...some guy (Flickr)', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:First_Baptist_church_on_The_Hill,_La_Loma.jpg'),

  -- ---- Destinos agregados en el prototipo (ids 16–30) ----
  -- Playas
  ('Cocoplum Bay',
   'Playa de arena blanca y agua tranquila y poco profunda en San Luis, frente a Rocky Cay, con palmeras y restaurantes de playa.',
   'playa', 12.542500, -81.705600, 'Costa oriental, sector San Luis, frente a Rocky Cay', 500, 'abierto',
   '06:00', '18:00', 'Gratis',
   'Por la vía circunvalar hacia San Luis, unos 15 minutos desde el centro en taxi, bus o moto.',
   null, null, null, null),

  ('Playa Los Charquitos',
   'Playa pequeña y tranquila a la orilla de la carretera, con pozos de agua (charquitos) que se forman entre las rocas con la marea baja; buena para niños y adultos mayores.',
   'playa', 12.480600, -81.728700, 'Extremo sur de la isla (South End), junto a la vía circunvalar', 200, 'abierto',
   '06:00', '18:00', 'Gratis',
   'Por la vía circunvalar hasta el extremo sur, unos 30 minutos desde el centro; queda cerca del Hoyo Soplador.',
   null, null, null, null),

  ('Bahía Sardina',
   'Playa urbana del sector oriental de North End, frente a los hoteles de la Avenida Colombia, con agua clara y poco profunda y vista hacia Johnny Cay.',
   'playa', 12.583600, -81.690900, 'North End, sector oriental de la Avenida Colombia', 600, 'abierto',
   '06:00', '19:00', 'Gratis',
   'En el centro (North End); se llega caminando por la Avenida Colombia desde la playa de Spratt Bight.',
   null, null, null, null),

  -- Cayos
  ('Cayo Bolívar',
   'Cayos del Este-Sudeste (Courtown Cays): islotes de arena blanca rodeados de arrecife, lejos de la multitud, para un día de playa y snorkel.',
   'cayo', 12.404500, -81.468500, 'Cayos del Este-Sudeste (Courtown Cays), al sureste de la isla', 150, 'abierto',
   '09:00', '16:00', '$$$',
   'Tour de día completo en lancha o catamarán desde el muelle de North End, con reserva; solo sale con buen tiempo.',
   null, null, null, null),

  -- Restaurantes
  ('Fishermen''s Place',
   'Restaurante de pescadores raizales frente al mar, al occidente de Spratt Bight; cocina isleña con pescado y mariscos frescos.',
   'gastronomia', 12.590400, -81.700600, 'North End, extremo occidental de Spratt Bight, cerca del aeropuerto', 120, 'abierto',
   '12:00', '17:00', '$$',
   'En North End, caminando hacia el occidente por la playa de Spratt Bight, en dirección al aeropuerto.',
   null, null, null, null),

  ('Gourmet Shop Assho',
   'Restaurante, tienda gourmet y vinoteca en el centro, con pastas, carnes y mariscos; ambiente tranquilo para cenar.',
   'gastronomia', 12.581500, -81.692700, 'North End, centro comercial de la isla', 80, 'abierto',
   '12:00', '22:00', '$$$',
   'En el centro (North End); se llega caminando desde los hoteles del centro.',
   null, null, null, null),

  ('Capitán Mandy',
   'Restaurante de mariscos conocido por sus platos para compartir de langosta, cangrejo, camarón y pescado.',
   'gastronomia', 12.581000, -81.698600, 'North End, centro de la isla', 100, 'abierto',
   '12:00', '22:00', '$$',
   'En el centro (North End); se llega caminando o en taxi desde los hoteles del centro.',
   null, null, null, null),

  -- Actividades
  ('Paseo en semisubmarino',
   'Recorrido de cerca de hora y media en un barco con casco de vidrio sobre el arrecife frente a North End, con parada para nadar; se ven peces y corales sin mojarse.',
   'actividad', 12.580100, -81.690400, 'Muelle Casa de la Cultura, North End', 60, 'abierto',
   '10:00', '17:00', '$$',
   'Salidas desde el muelle de la Casa de la Cultura (North End), con reserva. Normalmente hay una salida en la mañana y otra en la tarde.',
   null, null, null, null),

  ('Aquanautas (caminata submarina)',
   'Caminata por el fondo del mar a unos 6 m de profundidad con un casco que permite respirar normalmente, acompañado por un instructor; no hace falta saber nadar.',
   'actividad', 12.520700, -81.729100, 'Costa occidental, sector West View (El Cove)', 30, 'abierto',
   '09:00', '16:00', '$$$',
   'Por la vía circunvalar hacia el occidente, unos 20 minutos desde el centro, junto a West View. Con reserva; edad mínima 12 años.',
   null, null, null, null),

  ('Buceo con Karibik Diver',
   'Centro de buceo de North End con inmersiones guiadas en los arrecifes de la isla, bautizos para principiantes y cursos de certificación.',
   'actividad', 12.580300, -81.690100, 'North End, cerca del muelle de la Casa de la Cultura', 40, 'abierto',
   '08:00', '17:00', '$$$',
   'En el centro (North End). Las inmersiones salen en lancha; se reservan con un día de anticipación.',
   null, null, null, null),

  ('Vuelta a la isla',
   'Recorrido por la vía circunvalar (unos 30 km) en carrito de golf alquilado o en chiva, con paradas en West View, la Cueva de Morgan, el Hoyo Soplador y San Luis.',
   'actividad', 12.582200, -81.695500, 'North End, alquiler de carritos sobre la Avenida Colombia', 200, 'abierto',
   '08:00', '18:00', '$$',
   'Los carritos de golf se alquilan por horas en North End; las chivas recogen en los hoteles. Toma medio día con paradas.',
   null, null, null, null),

  -- Naturaleza
  ('Laguna Big Pond',
   'Laguna de agua dulce en el interior de la isla, rodeada de vegetación, donde se ven babillas y tortugas desde la orilla.',
   'naturaleza', 12.548400, -81.721400, 'Sector La Loma, interior de la isla (Vía Big Pond)', 100, 'abierto',
   '08:00', '17:00', '$',
   'Subiendo a La Loma desde el centro o desde San Luis, unos 15 minutos en taxi o moto; está en la Vía Big Pond.',
   null, null, null, null),

  ('Jardín Botánico de San Andrés',
   'Jardín botánico de la Universidad Nacional (sede Caribe) con senderos entre plantas nativas de las islas y un mirador.',
   'naturaleza', 12.537200, -81.711600, 'Sector San Luis, vía a La Loma', 100, 'abierto',
   '08:00', '17:00', '$',
   'Por la vía circunvalar hacia San Luis y luego subiendo hacia La Loma, unos 15 minutos desde el centro.',
   null, null, null, null),

  -- Cultura
  ('Cueva de Morgan',
   'Parque temático en torno a la cueva donde, según la leyenda, el pirata Henry Morgan escondió su tesoro; tiene museo, casa típica isleña y muestras de cultura raizal.',
   'cultura', 12.542400, -81.729400, 'Costa occidental, vía circunvalar', 300, 'abierto',
   '09:00', '17:00', '$$',
   'Por la vía circunvalar hacia el occidente, unos 20 minutos desde el centro. Es parada habitual de la vuelta a la isla.',
   null, null, null, null),

  ('Casa Museo Isleña',
   'Réplica de una casa tradicional isleña de madera donde guías cuentan la historia y las costumbres de la cultura raizal.',
   'cultura', 12.560100, -81.729000, 'Costa occidental, vía circunvalar', 80, 'abierto',
   '09:00', '17:00', '$',
   'Por la vía circunvalar hacia el occidente, unos 15 minutos desde el centro. Es parada habitual de la vuelta a la isla.',
   null, null, null, null);

-- ------------------------------------------------------------
-- Etiquetas de experiencia y grupo por destino
-- ------------------------------------------------------------
insert into public.destino_preferencia (id_destino, id_preferencia)
select d.id_destino, p.id_preferencia
from (values
  ('Playa de Spratt Bight',           'experiencia', 'relax'),
  ('Playa de Spratt Bight',           'experiencia', 'familiar'),
  ('Playa de Spratt Bight',           'grupo',       'familia_ninos'),
  ('Playa de Spratt Bight',           'grupo',       'adulto_mayor'),
  ('Playa de San Luis',               'experiencia', 'relax'),
  ('Playa de San Luis',               'experiencia', 'romantica'),
  ('Playa de San Luis',               'grupo',       'pareja'),
  ('Playa de San Luis',               'grupo',       'adulto_mayor'),
  ('Rocky Cay',                       'experiencia', 'aventura'),
  ('Rocky Cay',                       'experiencia', 'fotografia'),
  ('Rocky Cay',                       'grupo',       'pareja'),
  ('Rocky Cay',                       'grupo',       'amigos'),
  ('Playa de Sound Bay',              'experiencia', 'relax'),
  ('Playa de Sound Bay',              'experiencia', 'romantica'),
  ('Playa de Sound Bay',              'grupo',       'pareja'),
  ('Playa de Sound Bay',              'grupo',       'solo'),
  ('Johnny Cay',                      'experiencia', 'relax'),
  ('Johnny Cay',                      'experiencia', 'fotografia'),
  ('Johnny Cay',                      'grupo',       'amigos'),
  ('Johnny Cay',                      'grupo',       'pareja'),
  ('El Acuario (Rose Cay)',           'experiencia', 'familiar'),
  ('El Acuario (Rose Cay)',           'experiencia', 'relax'),
  ('El Acuario (Rose Cay)',           'grupo',       'familia_ninos'),
  ('El Acuario (Rose Cay)',           'grupo',       'amigos'),
  ('Haynes Cay',                      'experiencia', 'aventura'),
  ('Haynes Cay',                      'experiencia', 'fotografia'),
  ('Haynes Cay',                      'grupo',       'amigos'),
  ('Haynes Cay',                      'grupo',       'familia_ninos'),
  ('La Regatta',                      'experiencia', 'gastronomica'),
  ('La Regatta',                      'experiencia', 'romantica'),
  ('La Regatta',                      'grupo',       'pareja'),
  ('La Regatta',                      'grupo',       'adulto_mayor'),
  ('Miss Celia',                      'experiencia', 'gastronomica'),
  ('Miss Celia',                      'experiencia', 'cultural'),
  ('Miss Celia',                      'grupo',       'familia_ninos'),
  ('Miss Celia',                      'grupo',       'amigos'),
  ('Donde Francesca',                 'experiencia', 'gastronomica'),
  ('Donde Francesca',                 'experiencia', 'relax'),
  ('Donde Francesca',                 'grupo',       'amigos'),
  ('Donde Francesca',                 'grupo',       'pareja'),
  ('West View',                       'experiencia', 'aventura'),
  ('West View',                       'experiencia', 'familiar'),
  ('West View',                       'grupo',       'amigos'),
  ('West View',                       'grupo',       'solo'),
  ('La Piscinita',                    'experiencia', 'aventura'),
  ('La Piscinita',                    'experiencia', 'familiar'),
  ('La Piscinita',                    'grupo',       'familia_ninos'),
  ('La Piscinita',                    'grupo',       'solo'),
  ('Kayak en el Manglar de Old Point','experiencia', 'aventura'),
  ('Kayak en el Manglar de Old Point','experiencia', 'fotografia'),
  ('Kayak en el Manglar de Old Point','grupo',       'pareja'),
  ('Kayak en el Manglar de Old Point','grupo',       'amigos'),
  ('Hoyo Soplador',                   'experiencia', 'aventura'),
  ('Hoyo Soplador',                   'experiencia', 'fotografia'),
  ('Hoyo Soplador',                   'grupo',       'familia_ninos'),
  ('Hoyo Soplador',                   'grupo',       'adulto_mayor'),
  ('Primera Iglesia Bautista',        'experiencia', 'cultural'),
  ('Primera Iglesia Bautista',        'experiencia', 'fotografia'),
  ('Primera Iglesia Bautista',        'grupo',       'adulto_mayor'),
  ('Primera Iglesia Bautista',        'grupo',       'solo'),
  ('West View',                       'experiencia', 'acuatica'),
  ('La Piscinita',                    'experiencia', 'acuatica'),
  ('El Acuario (Rose Cay)',           'experiencia', 'acuatica'),
  ('Haynes Cay',                      'experiencia', 'acuatica'),
  ('Kayak en el Manglar de Old Point','experiencia', 'acuatica'),
  ('Kayak en el Manglar de Old Point','experiencia', 'ecologica'),
  ('Hoyo Soplador',                   'experiencia', 'ecologica'),
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
  ('Casa Museo Isleña',               'grupo',       'familia_ninos')
) as e (destino, tipo, codigo)
join public.destino d on d.nombre = e.destino
join public.preferencia p on p.tipo = e.tipo::public.tipo_preferencia and p.codigo = e.codigo;

-- ------------------------------------------------------------
-- Clima real restaurado (si existía antes del TRUNCATE)
-- ------------------------------------------------------------
insert into public.clima_hora (id_destino, fecha_hora, temperatura, prob_lluvia, precipitacion, codigo_clima, viento)
select d.id_destino, r.fecha_hora, r.temperatura, r.prob_lluvia, r.precipitacion, r.codigo_clima, r.viento
from clima_respaldo r
join public.destino d on d.nombre = r.nombre;

drop table clima_respaldo;

-- ------------------------------------------------------------
-- Ocupación por hora de las últimas 4 semanas (hora de Colombia)
-- porcentaje = curva de la categoría × factor fin de semana × popularidad
--              × efecto del clima real de esa hora × ruido ±10 %
-- Fuera del horario del destino (o en su pausa) la ocupación es 0.
-- Clima (de clima_hora; sin dato de esa hora no hay efecto):
--   tormenta (WMO 95, 96, 99) o lluvia (prob. ≥ 60 % o ≥ 0,5 mm): ver efecto_clima.
--
-- Curvas (índice 1 = 00:00 … 24 = 23:00):
--   playa:       pico al mediodía
--   cayo:        solo 09–16 (las lanchas no salen antes ni regresan después)
--   gastronomia: picos al almuerzo (12–14) y a la cena (19–21)
--   actividad:   mañana y primeras horas de la tarde
--   naturaleza:  durante el día, suave
--   cultura:     mañana y media tarde
-- ------------------------------------------------------------
with horas as (
  select h as fecha_hora
  from generate_series(
    date_trunc('hour', now()) - interval '28 days',
    date_trunc('hour', now()) - interval '1 hour',
    interval '1 hour'
  ) as h
),
curvas (categoria, curva) as (
  values
    ('playa'::public.categoria_destino,
     array[0,0,0,0,0,0, 0.08,0.15,0.25,0.40,0.55,0.70, 0.80,0.82,0.75,0.65,0.55,0.42, 0.25,0,0,0,0,0]::numeric[]),
    ('cayo',
     array[0,0,0,0,0,0, 0,0,0,0.35,0.60,0.78, 0.85,0.85,0.75,0.50,0,0, 0,0,0,0,0,0]::numeric[]),
    ('gastronomia',
     array[0,0,0,0,0,0, 0,0,0,0,0,0.15, 0.65,0.85,0.60,0.20,0.12,0.18, 0.35,0.70,0.85,0.60,0.25,0]::numeric[]),
    ('actividad',
     array[0,0,0,0,0,0, 0,0,0.20,0.45,0.70,0.80, 0.65,0.60,0.70,0.55,0.30,0, 0,0,0,0,0,0]::numeric[]),
    ('naturaleza',
     array[0,0,0,0,0,0, 0,0.10,0.25,0.45,0.60,0.70, 0.65,0.60,0.65,0.60,0.45,0.25, 0,0,0,0,0,0]::numeric[]),
    ('cultura',
     array[0,0,0,0,0,0, 0,0,0.15,0.35,0.55,0.60, 0.40,0.35,0.50,0.55,0.35,0, 0,0,0,0,0,0]::numeric[])
),
-- Multiplicador por categoría cuando llovió o hubo tormenta a esa hora.
efecto_clima (categoria, lluvia, tormenta) as (
  values
    ('playa'::public.categoria_destino, 0.65, 0.40),
    ('cayo',                            0.55, 0.25),
    ('actividad',                       0.65, 0.40),
    ('naturaleza',                      0.80, 0.60),
    ('gastronomia',                     1.15, 1.10),
    ('cultura',                         1.15, 1.10)
),
-- pausa: horas (enteras) en que el lugar cierra dentro de su horario.
popularidad (nombre, factor, pausa) as (
  values
    ('Playa de Spratt Bight',            1.00, null::int4range),
    ('Playa de San Luis',                0.70, null),
    ('Rocky Cay',                        0.75, null),
    ('Playa de Sound Bay',               0.55, null),
    ('Johnny Cay',                       1.10, null),
    ('El Acuario (Rose Cay)',            1.00, null),
    ('Haynes Cay',                       0.85, null),
    ('La Regatta',                       1.10, int4range(15, 18)),  -- cierra de 15:00 a 18:30
    ('Miss Celia',                       0.90, null),
    ('Donde Francesca',                  0.95, null),
    ('West View',                        0.95, null),
    ('La Piscinita',                     0.90, null),
    ('Kayak en el Manglar de Old Point', 0.70, null),
    ('Hoyo Soplador',                    0.80, null),
    ('Primera Iglesia Bautista',         0.50, null),
    ('Cocoplum Bay',                     0.75, null),
    ('Playa Los Charquitos',             0.45, null),
    ('Bahía Sardina',                    0.80, null),
    ('Cayo Bolívar',                     0.60, null),
    ('Fishermen''s Place',               0.90, null),   -- solo almuerzo (12:00–17:00)
    ('Gourmet Shop Assho',               0.75, null),
    ('Capitán Mandy',                    0.95, null),
    ('Paseo en semisubmarino',           0.85, int4range(12, 15)),  -- salidas de la mañana y de la tarde
    ('Aquanautas (caminata submarina)',  0.80, int4range(12, 14)),  -- turnos 09–12 y 14–16
    ('Buceo con Karibik Diver',          0.65, null),
    ('Vuelta a la isla',                 0.80, null),
    ('Laguna Big Pond',                  0.55, null),
    ('Jardín Botánico de San Andrés',    0.45, null),
    ('Cueva de Morgan',                  0.85, null),
    ('Casa Museo Isleña',                0.60, null)
),
calculo as (
  select
    d.id_destino,
    d.capacidad,
    h.fecha_hora,
    case
      when d.horario_apertura is not null
           and not (make_time(l.hora, 0, 0) >= d.horario_apertura
                    and make_time(l.hora, 0, 0) < d.horario_cierre)
        then 0
      when p.pausa @> l.hora then 0
      else
        c.curva[l.hora + 1]
        * (case l.dia when 6 then 1.30 when 7 then 1.25 when 5 then 1.10 else 1.00 end)
        * p.factor
        * (case
             when ch.codigo_clima in (95, 96, 99) then e.tormenta
             when ch.prob_lluvia >= 60 or ch.precipitacion >= 0.5 then e.lluvia
             else 1
           end)
        * (0.90 + random() * 0.20)
        * 100
    end as porcentaje
  from public.destino d
  join popularidad p on p.nombre = d.nombre
  join curvas c on c.categoria = d.categoria
  join efecto_clima e on e.categoria = d.categoria
  cross join horas h
  left join public.clima_hora ch on ch.id_destino = d.id_destino and ch.fecha_hora = h.fecha_hora
  cross join lateral (
    select
      extract(hour from h.fecha_hora at time zone 'America/Bogota')::int as hora,
      extract(isodow from h.fecha_hora at time zone 'America/Bogota')::int as dia
  ) l
)
insert into public.ocupacion (id_destino, fecha_hora, cantidad_personas, porcentaje_ocupacion)
select
  id_destino,
  fecha_hora,
  round(least(porcentaje, 100) / 100 * capacidad)::int,
  round(least(porcentaje, 100)::numeric, 2)
from calculo;
