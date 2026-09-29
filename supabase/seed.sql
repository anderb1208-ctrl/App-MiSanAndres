-- ============================================================================
-- ⚠️  ADVERTENCIA: ESTE SCRIPT BORRA DATOS. USAR SOLO EN DESARROLLO.
--
-- Hace TRUNCATE ... CASCADE sobre destino, preferencia, destino_preferencia y
-- ocupacion. Por la cascada también vacía interaccion y usuario_preferencia
-- (las interacciones y preferencias de TODOS los usuarios).
-- Nunca ejecutarlo contra la base de producción.
-- ============================================================================
--
-- Datos de prueba del MVP (base de desarrollo).
-- No crea usuarios: se crean al registrarse con Supabase Auth.
-- Es re-ejecutable: limpia los catálogos y la ocupación antes de insertar.

truncate public.ocupacion, public.destino_preferencia, public.destino, public.preferencia
  restart identity cascade;

-- ------------------------------------------------------------
-- Catálogo de preferencias
-- ------------------------------------------------------------
insert into public.preferencia (tipo, codigo, nombre, descripcion) values
  ('categoria',   'playa',          'Playas',               'Playas de arena blanca y mar de siete colores'),
  ('categoria',   'cayo',           'Cayos',                'Islotes cercanos a los que se llega en lancha'),
  ('categoria',   'naturaleza',     'Naturaleza',           'Formaciones naturales, lagunas y fauna'),
  ('categoria',   'buceo_snorkel',  'Buceo y snorkel',      'Arrecifes y piscinas naturales para ver vida marina'),
  ('categoria',   'cultura',        'Cultura',              'Historia y tradición raizal'),
  ('categoria',   'gastronomia',    'Gastronomía',          'Cocina isleña y restaurantes típicos'),
  ('experiencia', 'relax',          'Relax',                'Descansar sin afanes'),
  ('experiencia', 'aventura',       'Aventura',             'Actividad física y adrenalina'),
  ('experiencia', 'familiar',       'Familiar',             'Planes seguros para todas las edades'),
  ('experiencia', 'romantica',      'Romántica',            'Lugares tranquilos para ir en pareja'),
  ('experiencia', 'cultural',       'Cultural',             'Conocer la historia y costumbres de la isla'),
  ('experiencia', 'fotografia',     'Fotografía',           'Paisajes y atardeceres para fotografiar'),
  ('grupo',       'solo',           'Viajo solo',           null),
  ('grupo',       'pareja',         'En pareja',            null),
  ('grupo',       'familia_ninos',  'En familia con niños', null),
  ('grupo',       'amigos',         'Con amigos',           null),
  ('grupo',       'adulto_mayor',   'Con adultos mayores',  null);

-- ------------------------------------------------------------
-- Destinos (coordenadas aproximadas)
-- ------------------------------------------------------------
insert into public.destino (nombre, descripcion, categoria, latitud, longitud, ubicacion_texto, capacidad, estado) values
  ('Johnny Cay',                   'Cayo con playa de arena blanca, palmeras y música en vivo.',            'cayo',          12.601900, -81.689300, 'A 15 minutos en lancha desde el muelle de North End', 800, 'abierto'),
  ('Acuario (Haynes Cay)',         'Aguas poco profundas y cristalinas para nadar entre peces y rayas.',    'cayo',          12.556500, -81.682500, 'Frente a San Luis, a 20 minutos en lancha',            500, 'abierto'),
  ('Hoyo Soplador',                'Géiser natural que expulsa agua de mar entre las rocas de coral.',      'naturaleza',    12.483800, -81.732700, 'Extremo sur de la isla, vía circunvalar',             300, 'abierto'),
  ('West View',                    'Piscina natural con trampolín y tobogán para snorkel en arrecife.',     'buceo_snorkel', 12.534500, -81.727100, 'Costa occidental, sector El Cove',                   250, 'abierto'),
  ('La Piscinita',                 'Piscina natural de agua turquesa ideal para alimentar peces.',          'buceo_snorkel', 12.538000, -81.726500, 'Costa occidental, al norte de West View',            200, 'abierto'),
  ('Playa Spratt Bight',           'Playa principal de la isla, junto al paseo peatonal.',                  'playa',         12.584200, -81.699600, 'North End, frente a la Avenida Colombia',            1500, 'abierto'),
  ('Playa de San Luis',            'Playa tranquila de aguas calmadas en el sector raizal de San Luis.',    'playa',         12.539000, -81.700500, 'Costa oriental, sector San Luis',                    600, 'abierto'),
  ('Rocky Cay',                    'Playa con cayo al que se llega caminando por el mar y un barco hundido.','playa',         12.512500, -81.704500, 'Costa oriental, sur de San Luis',                    400, 'abierto'),
  ('Cueva de Morgan',              'Parque temático sobre la leyenda del pirata Henry Morgan.',             'cultura',       12.544000, -81.725000, 'Sector El Cove, costa occidental',                   300, 'abierto'),
  ('Primera Iglesia Bautista',     'Iglesia de 1844 en La Loma, símbolo de la cultura raizal.',             'cultura',       12.553000, -81.715000, 'Sector La Loma, centro de la isla',                  150, 'abierto');

-- ------------------------------------------------------------
-- Etiquetas de experiencia y grupo por destino
-- ------------------------------------------------------------
insert into public.destino_preferencia (id_destino, id_preferencia)
select d.id_destino, p.id_preferencia
from (values
  ('Johnny Cay',               'experiencia', 'relax'),
  ('Johnny Cay',               'experiencia', 'fotografia'),
  ('Johnny Cay',               'grupo',       'amigos'),
  ('Johnny Cay',               'grupo',       'pareja'),
  ('Acuario (Haynes Cay)',     'experiencia', 'familiar'),
  ('Acuario (Haynes Cay)',     'experiencia', 'relax'),
  ('Acuario (Haynes Cay)',     'grupo',       'familia_ninos'),
  ('Acuario (Haynes Cay)',     'grupo',       'amigos'),
  ('Hoyo Soplador',            'experiencia', 'aventura'),
  ('Hoyo Soplador',            'experiencia', 'fotografia'),
  ('Hoyo Soplador',            'grupo',       'familia_ninos'),
  ('Hoyo Soplador',            'grupo',       'adulto_mayor'),
  ('West View',                'experiencia', 'aventura'),
  ('West View',                'grupo',       'amigos'),
  ('West View',                'grupo',       'solo'),
  ('La Piscinita',             'experiencia', 'aventura'),
  ('La Piscinita',             'experiencia', 'familiar'),
  ('La Piscinita',             'grupo',       'familia_ninos'),
  ('La Piscinita',             'grupo',       'solo'),
  ('Playa Spratt Bight',       'experiencia', 'relax'),
  ('Playa Spratt Bight',       'experiencia', 'familiar'),
  ('Playa Spratt Bight',       'grupo',       'familia_ninos'),
  ('Playa Spratt Bight',       'grupo',       'adulto_mayor'),
  ('Playa de San Luis',        'experiencia', 'relax'),
  ('Playa de San Luis',        'experiencia', 'romantica'),
  ('Playa de San Luis',        'grupo',       'pareja'),
  ('Playa de San Luis',        'grupo',       'adulto_mayor'),
  ('Rocky Cay',                'experiencia', 'aventura'),
  ('Rocky Cay',                'experiencia', 'fotografia'),
  ('Rocky Cay',                'grupo',       'pareja'),
  ('Rocky Cay',                'grupo',       'amigos'),
  ('Cueva de Morgan',          'experiencia', 'cultural'),
  ('Cueva de Morgan',          'experiencia', 'familiar'),
  ('Cueva de Morgan',          'grupo',       'familia_ninos'),
  ('Cueva de Morgan',          'grupo',       'adulto_mayor'),
  ('Primera Iglesia Bautista', 'experiencia', 'cultural'),
  ('Primera Iglesia Bautista', 'experiencia', 'fotografia'),
  ('Primera Iglesia Bautista', 'grupo',       'adulto_mayor'),
  ('Primera Iglesia Bautista', 'grupo',       'solo')
) as e (destino, tipo, codigo)
join public.destino d on d.nombre = e.destino
join public.preferencia p on p.tipo = e.tipo::public.tipo_preferencia and p.codigo = e.codigo;

-- ------------------------------------------------------------
-- Ocupación por hora de las últimas 4 semanas (hora de Colombia)
-- porcentaje = curva horaria × factor fin de semana × popularidad × ruido ±10 %
-- ------------------------------------------------------------
with horas as (
  select h as fecha_hora
  from generate_series(
    date_trunc('hour', now()) - interval '28 days',
    date_trunc('hour', now()) - interval '1 hour',
    interval '1 hour'
  ) as h
),
popularidad (nombre, factor) as (
  values
    ('Johnny Cay',               1.10),
    ('Acuario (Haynes Cay)',     1.00),
    ('Hoyo Soplador',            0.85),
    ('West View',                0.95),
    ('La Piscinita',             0.90),
    ('Playa Spratt Bight',       1.00),
    ('Playa de San Luis',        0.70),
    ('Rocky Cay',                0.75),
    ('Cueva de Morgan',          0.65),
    ('Primera Iglesia Bautista', 0.50)
),
calculo as (
  select
    d.id_destino,
    d.capacidad,
    h.fecha_hora,
    (case extract(hour from h.fecha_hora at time zone 'America/Bogota')::int
       when 0 then 0.02 when 1 then 0.01 when 2 then 0.01 when 3 then 0.01
       when 4 then 0.01 when 5 then 0.02 when 6 then 0.05 when 7 then 0.12
       when 8 then 0.25 when 9 then 0.40 when 10 then 0.55 when 11 then 0.70
       when 12 then 0.78 when 13 then 0.80 when 14 then 0.72 when 15 then 0.62
       when 16 then 0.50 when 17 then 0.38 when 18 then 0.22 when 19 then 0.12
       when 20 then 0.08 when 21 then 0.05 when 22 then 0.04 else 0.03
     end)
    * (case extract(isodow from h.fecha_hora at time zone 'America/Bogota')::int
         when 6 then 1.35 when 7 then 1.30 when 5 then 1.10 else 1.00
       end)
    * p.factor
    * (0.90 + random() * 0.20)
    * 100 as porcentaje
  from public.destino d
  join popularidad p on p.nombre = d.nombre
  cross join horas h
)
insert into public.ocupacion (id_destino, fecha_hora, cantidad_personas, porcentaje_ocupacion)
select
  id_destino,
  fecha_hora,
  round(least(porcentaje, 100) / 100 * capacidad)::int,
  round(least(porcentaje, 100)::numeric, 2)
from calculo;
