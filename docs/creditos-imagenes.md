# Créditos de imágenes

Las fotos de los 30 destinos están en el repositorio, en `backend/public/destinos/<slug>.jpg` (JPEG de ~1000 px de ancho), y las sirve el backend como archivos estáticos en `/destinos/<slug>.jpg` con caché de un día. `destino.imagen_url` guarda la ruta relativa (`/destinos/johnny-cay.jpg`) y la app la completa con `EXPO_PUBLIC_API_URL`. Autor, licencia y página de origen se guardan en `imagen_autor`, `imagen_licencia` e `imagen_fuente`; la fuente de verdad de esta tabla es `backend/scripts/imagenes/creditos.json`.

En el detalle del destino la app muestra **"Foto: autor · licencia"** cuando la licencia es conocida, e **"Imagen de referencia"** cuando es *sin verificar*. Si la imagen no carga, muestra el placeholder de su categoría.

- **Commons (22 fotos)**: licencias CC BY, CC BY-SA y CC0, que permiten el uso con atribución (CC BY-SA además pide compartir igual las obras derivadas). Las fotos solo se redimensionaron y recomprimieron.
- **Sin verificar (8 fotos)**: imágenes de referencia tomadas de la web (sitios oficiales o portales turísticos) **sin licencia confirmada**, solo para la presentación. Hay que reemplazarlas por fotos propias o con licencia libre antes de publicar la app.

| Destino | Archivo | URL de origen | Autor | Licencia | Reemplazar | Nota |
| --- | --- | --- | --- | --- | --- | --- |
| Playa de Spratt Bight | `destinos/playa-spratt-bight.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Playa_del_Centro_(8327400981).jpg) | Joao Carlos Medau | CC BY 2.0 | — |  |
| Playa de San Luis | `destinos/playa-san-luis.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:San_Luis_(8321267521).jpg) | Joao Carlos Medau | CC BY 2.0 | — |  |
| Rocky Cay | `destinos/rocky-cay.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Rocky_Cay_(8320969633).jpg) | Joao Carlos Medau | CC BY 2.0 | — |  |
| Playa de Sound Bay | `destinos/playa-sound-bay.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Enchanted_-_llO.jpg) | Lyanishah Livingston O'Neill | CC BY-SA 4.0 | Recomendado | Tomada en el acceso de Sound Bay (coordenadas de la foto); día nublado |
| Johnny Cay | `destinos/johnny-cay.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Isla_Johnny_Cay.jpg) | EASLYHAKS | CC BY-SA 4.0 | — |  |
| El Acuario (Rose Cay) | `destinos/el-acuario.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Acuario_de_San_Andr%C3%A9s_Islas.JPG) | Mr.Jhosimar | CC BY-SA 4.0 | — |  |
| Haynes Cay | `destinos/haynes-cay.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Haynes_cay_(view_from_west).JPG) | Milenioscuro | CC BY-SA 3.0 | — |  |
| La Regatta | `destinos/la-regatta.jpg` | [enlace](https://restaurantelaregatta.com/) | Restaurante La Regatta (sitio oficial) | sin verificar | ✅ Sí |  |
| Miss Celia | `destinos/miss-celia.jpg` | [enlace](https://www.sanandresislas.com.co/restaurante-miss-celia-san-andres) | sanandresislas.com.co | sin verificar | ✅ Sí |  |
| Donde Francesca | `destinos/donde-francesca.jpg` | [enlace](https://visitsanandres.co/news/restaurante-donde-francesca) | VisitSanAndres | sin verificar | ✅ Sí |  |
| West View | `destinos/west-view.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:West_View_(8333619624).jpg) | Joao Carlos Medau | CC BY 2.0 | — |  |
| La Piscinita | `destinos/la-piscinita.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:San_Andres_Islas_La_Piscinita_-_panoramio.jpg) | adelmotrujillo (Panoramio) | CC BY-SA 3.0 | — |  |
| Kayak en el Manglar de Old Point | `destinos/kayak-manglar-old-point.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Kayaking_in_San_Luis_(8330776002).jpg) | Joao Carlos Medau | CC BY 2.0 | Recomendado | Kayak en el mar de San Luis, no en el manglar |
| Hoyo Soplador | `destinos/hoyo-soplador.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Hoyo_soplador,_San_Andres.jpg) | Denys | CC BY-SA 4.0 | — |  |
| Primera Iglesia Bautista | `destinos/primera-iglesia-bautista.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:First_Baptist_church_on_The_Hill,_La_Loma.jpg) | ...some guy (Flickr) | CC BY 2.0 | — |  |
| Cocoplum Bay | `destinos/cocoplum-bay.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:San_Andres_Islas_Colombia_-_panoramio_-_agosto_de_2010_(1).jpg) | adelmotrujillo (Panoramio) | CC BY-SA 3.0 | — | Tomada en el extremo norte de la playa (junto a Rocky Cay) |
| Playa Los Charquitos | `destinos/playa-los-charquitos.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Punta_Sur_(8330405067).jpg) | Joao Carlos Medau | CC BY 2.0 | Recomendado | Punta Sur (South End), la zona de la playa; no se confirma que sea exactamente Los Charquitos |
| Bahía Sardina | `destinos/bahia-sardina.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:San_Andres_Isla_(8303603057).jpg) | Joao Carlos Medau | CC BY 2.0 | — |  |
| Cayo Bolívar | `destinos/cayo-bolivar.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Bolivar_Key_-_Cayo_Bol%C3%ADvar,_San_Andres,_Colombia.JPG) | Roberto San Andrés | CC0 | — |  |
| Fishermen's Place | `destinos/fishermens-place.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Club_de_Pescadores_San_Andres,_Islas.jpg) | Jackca77 | CC BY-SA 4.0 | Recomendado | Lanchas del club de pescadores en la playa; no muestra el restaurante |
| Gourmet Shop Assho | `destinos/gourmet-shop-assho.jpg` | [enlace](https://www.sanandresislas.com.co/restaurante-gourmet-shop-assho-san-andres) | sanandresislas.com.co | sin verificar | ✅ Sí |  |
| Capitán Mandy | `destinos/capitan-mandy.jpg` | [enlace](https://www.sanandresislas.com.co/restaurante-capitan-mandy-san-andres) | sanandresislas.com.co | sin verificar | ✅ Sí |  |
| Paseo en semisubmarino | `destinos/paseo-semisubmarino.jpg` | [enlace](https://sanandres.travel/tour/semisubmarino) | sanandres.travel | sin verificar | ✅ Sí | Resolución baja (480 px) |
| Aquanautas (caminata submarina) | `destinos/aquanautas.jpg` | [enlace](https://aqua-nautas.com/) | Aquanautas (sitio oficial) | sin verificar | ✅ Sí |  |
| Buceo con Karibik Diver | `destinos/buceo-karibik-diver.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Escuela_YoBuceo_en_San_Andr%C3%A9s.jpg) | Andrés Dagnone | CC BY-SA 3.0 | Recomendado | Buceo en un naufragio de San Andrés con otra escuela; no es de Karibik Diver |
| Vuelta a la isla | `destinos/vuelta-a-la-isla.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Carretera_del_litoral_en_San_Andr%C3%A9s.JPG) | Aliman5040 | CC BY-SA 3.0 | — |  |
| Laguna Big Pond | `destinos/laguna-big-pond.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Laguna_de_Big_Pong.jpg) | Jackca77 | CC BY-SA 4.0 | — |  |
| Jardín Botánico de San Andrés | `destinos/jardin-botanico.jpg` | [enlace](https://circular.unal.edu.co/museo-detalle/jardin-botanico-de-san-andres) | Universidad Nacional de Colombia | sin verificar | ✅ Sí | Resolución baja (700 px) |
| Cueva de Morgan | `destinos/cueva-de-morgan.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Cueva_de_Morgan.jpg) | HaseyJDBS | CC BY-SA 4.0 | — |  |
| Casa Museo Isleña | `destinos/casa-museo-islena.jpg` | [enlace](https://commons.wikimedia.org/wiki/File:Casa_Museo_Isle%C3%B1a.jpg) | Mario Carvajal | CC BY 3.0 | — |  |

## Reemplazar una foto

1. Guarda la nueva foto como JPEG (~1000 px de ancho) con **el mismo nombre** en `backend/public/destinos/` (por ejemplo, `la-regatta.jpg`) y despliega el backend. No hace falta cambiar la base: `imagen_url` sigue siendo la misma.
2. Actualiza el crédito en `backend/scripts/imagenes/creditos.json`, en esta tabla y con una migración nueva que cambie `imagen_autor`, `imagen_licencia` (p. ej. "Todos los derechos reservados" o "CC BY 4.0") e `imagen_fuente` de ese destino (y en `supabase/seed.sql`).
3. La app guarda la imagen en caché hasta un día: para verla de inmediato, cierra y abre la app.

## Nota técnica

Wikimedia rechaza (403) las peticiones de imágenes sin un User-Agent identificable. Como ahora las fotos se sirven desde el backend, la app ya no las pide a Wikimedia; `mobile/src/utils/imagenes.ts` conserva el User-Agent propio por si algún destino vuelve a usar una URL de `wikimedia.org`.
