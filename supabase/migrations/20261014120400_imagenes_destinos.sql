-- Fotos de los 30 destinos servidas por el backend (backend/public/destinos/<slug>.jpg).
-- imagen_url guarda la ruta relativa; la app la completa con EXPO_PUBLIC_API_URL.
-- Licencia "sin verificar" = imagen de referencia tomada de la web, a reemplazar
-- (la app muestra "Imagen de referencia"). Créditos: docs/creditos-imagenes.md.
-- Solo actualiza filas existentes (por nombre): no borra nada.

update public.destino as d
set imagen_url = v.url,
    imagen_autor = v.autor,
    imagen_licencia = v.licencia,
    imagen_fuente = v.fuente
from (values
  ('Playa de Spratt Bight', '/destinos/playa-spratt-bight.jpg', 'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Playa_del_Centro_(8327400981).jpg'),
  ('Playa de San Luis', '/destinos/playa-san-luis.jpg', 'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:San_Luis_(8321267521).jpg'),
  ('Rocky Cay', '/destinos/rocky-cay.jpg', 'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Rocky_Cay_(8320969633).jpg'),
  ('Playa de Sound Bay', '/destinos/playa-sound-bay.jpg', 'Lyanishah Livingston O''Neill', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Enchanted_-_llO.jpg'),
  ('Johnny Cay', '/destinos/johnny-cay.jpg', 'EASLYHAKS', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Isla_Johnny_Cay.jpg'),
  ('El Acuario (Rose Cay)', '/destinos/el-acuario.jpg', 'Mr.Jhosimar', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Acuario_de_San_Andr%C3%A9s_Islas.JPG'),
  ('Haynes Cay', '/destinos/haynes-cay.jpg', 'Milenioscuro', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Haynes_cay_(view_from_west).JPG'),
  ('La Regatta', '/destinos/la-regatta.jpg', 'Restaurante La Regatta (sitio oficial)', 'sin verificar', 'https://restaurantelaregatta.com/'),
  ('Miss Celia', '/destinos/miss-celia.jpg', 'sanandresislas.com.co', 'sin verificar', 'https://www.sanandresislas.com.co/restaurante-miss-celia-san-andres'),
  ('Donde Francesca', '/destinos/donde-francesca.jpg', 'VisitSanAndres', 'sin verificar', 'https://visitsanandres.co/news/restaurante-donde-francesca'),
  ('West View', '/destinos/west-view.jpg', 'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:West_View_(8333619624).jpg'),
  ('La Piscinita', '/destinos/la-piscinita.jpg', 'adelmotrujillo (Panoramio)', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:San_Andres_Islas_La_Piscinita_-_panoramio.jpg'),
  ('Kayak en el Manglar de Old Point', '/destinos/kayak-manglar-old-point.jpg', 'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Kayaking_in_San_Luis_(8330776002).jpg'),
  ('Hoyo Soplador', '/destinos/hoyo-soplador.jpg', 'Denys', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Hoyo_soplador,_San_Andres.jpg'),
  ('Primera Iglesia Bautista', '/destinos/primera-iglesia-bautista.jpg', '...some guy (Flickr)', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:First_Baptist_church_on_The_Hill,_La_Loma.jpg'),
  ('Cocoplum Bay', '/destinos/cocoplum-bay.jpg', 'adelmotrujillo (Panoramio)', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:San_Andres_Islas_Colombia_-_panoramio_-_agosto_de_2010_(1).jpg'),
  ('Playa Los Charquitos', '/destinos/playa-los-charquitos.jpg', 'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Punta_Sur_(8330405067).jpg'),
  ('Bahía Sardina', '/destinos/bahia-sardina.jpg', 'Joao Carlos Medau', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:San_Andres_Isla_(8303603057).jpg'),
  ('Cayo Bolívar', '/destinos/cayo-bolivar.jpg', 'Roberto San Andrés', 'CC0', 'https://commons.wikimedia.org/wiki/File:Bolivar_Key_-_Cayo_Bol%C3%ADvar,_San_Andres,_Colombia.JPG'),
  ('Fishermen''s Place', '/destinos/fishermens-place.jpg', 'Jackca77', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Club_de_Pescadores_San_Andres,_Islas.jpg'),
  ('Gourmet Shop Assho', '/destinos/gourmet-shop-assho.jpg', 'sanandresislas.com.co', 'sin verificar', 'https://www.sanandresislas.com.co/restaurante-gourmet-shop-assho-san-andres'),
  ('Capitán Mandy', '/destinos/capitan-mandy.jpg', 'sanandresislas.com.co', 'sin verificar', 'https://www.sanandresislas.com.co/restaurante-capitan-mandy-san-andres'),
  ('Paseo en semisubmarino', '/destinos/paseo-semisubmarino.jpg', 'sanandres.travel', 'sin verificar', 'https://sanandres.travel/tour/semisubmarino'),
  ('Aquanautas (caminata submarina)', '/destinos/aquanautas.jpg', 'Aquanautas (sitio oficial)', 'sin verificar', 'https://aqua-nautas.com/'),
  ('Buceo con Karibik Diver', '/destinos/buceo-karibik-diver.jpg', 'Andrés Dagnone', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Escuela_YoBuceo_en_San_Andr%C3%A9s.jpg'),
  ('Vuelta a la isla', '/destinos/vuelta-a-la-isla.jpg', 'Aliman5040', 'CC BY-SA 3.0', 'https://commons.wikimedia.org/wiki/File:Carretera_del_litoral_en_San_Andr%C3%A9s.JPG'),
  ('Laguna Big Pond', '/destinos/laguna-big-pond.jpg', 'Jackca77', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Laguna_de_Big_Pong.jpg'),
  ('Jardín Botánico de San Andrés', '/destinos/jardin-botanico.jpg', 'Universidad Nacional de Colombia', 'sin verificar', 'https://circular.unal.edu.co/museo-detalle/jardin-botanico-de-san-andres'),
  ('Cueva de Morgan', '/destinos/cueva-de-morgan.jpg', 'HaseyJDBS', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Cueva_de_Morgan.jpg'),
  ('Casa Museo Isleña', '/destinos/casa-museo-islena.jpg', 'Mario Carvajal', 'CC BY 3.0', 'https://commons.wikimedia.org/wiki/File:Casa_Museo_Isle%C3%B1a.jpg')
) as v (nombre, url, autor, licencia, fuente)
where d.nombre = v.nombre;
