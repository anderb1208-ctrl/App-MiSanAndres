-- ============================================================================
-- ⚠️  ADVERTENCIA: ESTE SCRIPT BORRA DATOS. USAR SOLO EN DESARROLLO.
--
-- Hace TRUNCATE ... CASCADE sobre destino, preferencia, destino_preferencia y
-- ocupacion. Por la cascada también vacía interaccion y usuario_preferencia
-- (las interacciones y preferencias de TODOS los usuarios).
-- Nunca ejecutarlo contra la base de producción.
-- ============================================================================
--
-- Datos de prueba del prototipo (base de desarrollo).
-- No crea usuarios: se crean al registrarse con Supabase Auth.
-- Es re-ejecutable: limpia los catálogos y la ocupación antes de insertar.
--
-- Horarios, precios y coordenadas son aproximados: la lista de lo que falta
-- confirmar está en docs/datos-por-verificar.md. Créditos de las fotos en
-- docs/creditos-imagenes.md.

truncate public.ocupacion, public.destino_preferencia, public.destino, public.preferencia
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
   '...some guy (Flickr)', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:First_Baptist_church_on_The_Hill,_La_Loma.jpg');

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
  ('Primera Iglesia Bautista',        'grupo',       'solo')
) as e (destino, tipo, codigo)
join public.destino d on d.nombre = e.destino
join public.preferencia p on p.tipo = e.tipo::public.tipo_preferencia and p.codigo = e.codigo;

-- ------------------------------------------------------------
-- Ocupación por hora de las últimas 4 semanas (hora de Colombia)
-- porcentaje = curva de la categoría × factor fin de semana × popularidad × ruido ±10 %
-- Fuera del horario del destino (o en su pausa) la ocupación es 0.
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
    ('Primera Iglesia Bautista',         0.50, null)
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
        * (0.90 + random() * 0.20)
        * 100
    end as porcentaje
  from public.destino d
  join popularidad p on p.nombre = d.nombre
  join curvas c on c.categoria = d.categoria
  cross join horas h
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
