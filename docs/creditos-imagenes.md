# Créditos de imágenes

Las fotos de los destinos no están en el repositorio: la app las carga desde la miniatura de 960 px de Wikimedia Commons (`destino.imagen_url`). Autor, licencia y enlace se guardan en `imagen_autor`, `imagen_licencia` e `imagen_fuente`, y la app los muestra en el detalle ("Foto: autor · licencia").

Las licencias CC BY y CC BY-SA permiten el uso con atribución; CC BY-SA además pide compartir igual las obras derivadas (no se modifican las fotos).

| Destino | Foto | Autor | Licencia |
| --- | --- | --- | --- |
| Playa de Spratt Bight | [Playa del Centro (8327400981).jpg](https://commons.wikimedia.org/wiki/File:Playa_del_Centro_(8327400981).jpg) | Joao Carlos Medau | CC BY 2.0 |
| Playa de San Luis | [San Luis (8321267521).jpg](https://commons.wikimedia.org/wiki/File:San_Luis_(8321267521).jpg) | Joao Carlos Medau | CC BY 2.0 |
| Rocky Cay | [Rocky Cay (8320969633).jpg](https://commons.wikimedia.org/wiki/File:Rocky_Cay_(8320969633).jpg) | Joao Carlos Medau | CC BY 2.0 |
| Playa de Sound Bay | ❌ Sin foto adecuada | — | — |
| Johnny Cay | [Isla Johnny Cay.jpg](https://commons.wikimedia.org/wiki/File:Isla_Johnny_Cay.jpg) | EASLYHAKS | CC BY-SA 4.0 |
| El Acuario (Rose Cay) | [Acuario de San Andrés Islas.JPG](https://commons.wikimedia.org/wiki/File:Acuario_de_San_Andr%C3%A9s_Islas.JPG) | Mr.Jhosimar | CC BY-SA 4.0 |
| Haynes Cay | [Haynes cay (view from west).JPG](https://commons.wikimedia.org/wiki/File:Haynes_cay_(view_from_west).JPG) | Milenioscuro | CC BY-SA 3.0 |
| La Regatta | ❌ Sin foto con licencia libre | — | — |
| Miss Celia | ❌ Sin foto con licencia libre | — | — |
| Donde Francesca | ❌ Sin foto con licencia libre | — | — |
| West View | [West View (8333619624).jpg](https://commons.wikimedia.org/wiki/File:West_View_(8333619624).jpg) | Joao Carlos Medau | CC BY 2.0 |
| La Piscinita | [San Andres Islas La Piscinita - panoramio.jpg](https://commons.wikimedia.org/wiki/File:San_Andres_Islas_La_Piscinita_-_panoramio.jpg) | adelmotrujillo (Panoramio) | CC BY-SA 3.0 |
| Kayak en el Manglar de Old Point | ❌ Sin foto adecuada | — | — |
| Hoyo Soplador | [Hoyo soplador, San Andres.jpg](https://commons.wikimedia.org/wiki/File:Hoyo_soplador,_San_Andres.jpg) | Denys | CC BY-SA 4.0 |
| Primera Iglesia Bautista | [First Baptist church on The Hill, La Loma.jpg](https://commons.wikimedia.org/wiki/File:First_Baptist_church_on_The_Hill,_La_Loma.jpg) | ...some guy (Flickr) | CC BY 2.0 |

Los destinos sin foto muestran en la app un placeholder según su categoría.

## Fotos propias

Para reemplazar o completar una foto:

1. Subirla al bucket público `destinos` de Supabase Storage desde el dashboard (los clientes de la app no pueden escribir en él).
2. Copiar su URL pública (`https://<proyecto>.supabase.co/storage/v1/object/public/destinos/<archivo>`) en `imagen_url` y llenar `imagen_autor`, `imagen_licencia` (p. ej. "Todos los derechos reservados" o "CC BY 4.0") e `imagen_fuente`.
3. Actualizar esta tabla y `supabase/seed.sql`.

## Nota técnica

Wikimedia rechaza (403) las peticiones de imágenes sin un User-Agent identificable, como el `okhttp` por defecto de Android. La app envía un User-Agent propio al cargar imágenes de `wikimedia.org` (ver `mobile/src/utils/imagenes.ts`).
