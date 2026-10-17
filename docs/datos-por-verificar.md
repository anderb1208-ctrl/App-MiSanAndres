# Datos por verificar

Valores aproximados cargados en `supabase/seed.sql` que hay que confirmar en Google Maps (o en la fuente oficial del lugar). Al corregir uno, actualizar el seed y tachar la fila aquí.

Convenciones: coordenadas en grados decimales (latitud, longitud); horarios en hora de Colombia, cierre exclusivo.

## Coordenadas

Punto de acceso de cada destino (siempre en tierra; ver la convención en `docs/cambios-al-diseno.md`), calculado con OpenStreetMap por `backend/scripts/geolocalizar-destinos.ts`. Revisar y corregir en `docs/revision-ubicaciones.html`; las correcciones se aplican con `npm run ubicaciones:corregir` y regeneran esta tabla.

<!-- ubicaciones:inicio (generado por backend/scripts/ubicaciones) -->
| Destino | Punto de acceso | Fuente | Confianza | OSM | Cómo se obtuvo |
| --- | --- | --- | --- | --- | --- |
| Kayak en el Manglar de Old Point | 12.566000, -81.704000 | aproximada | baja | — | Sin objeto en OSM: coordenada aproximada. Punto de salida de los tours en el manglar |
| Playa de San Luis | 12.530005, -81.707701 | aproximada | baja | [node/306384198](https://www.openstreetmap.org/node/306384198) | OSM no tiene la playa: costa más cercana al centro del sector "San Luis". Ajustado 3 m a tierr. A 1.3 km de la coordenada anterio |
| Playa Los Charquitos | 12.480600, -81.728700 | aproximada | baja | — | OSM no tiene esta playa: coordenada aproximada. Las fuentes web la ubican en el extremo sur (South End) |
| Vuelta a la isla | 12.582200, -81.695500 | aproximada | baja | — | Sin objeto en OSM: coordenada aproximada. Actividad sin lugar fijo: se toma como punto de encuentro el alquiler de carritos de North End |
| Bahía Sardina | 12.583335, -81.691070 | osm | media | [node/6423522299](https://www.openstreetmap.org/node/6423522299) | Playa "Bahía Sardina" (punto en OSM) y contorno de playa vecino: punto más cercano a un camino |
| Cayo Bolívar | 12.399145, -81.475497 | osm | media | [way/20257555](https://www.openstreetmap.org/way/20257555) | Sin muelle en OSM: orilla de "Cayo Bolívar" más cercana a la isla principal. Ajustado 3 m a tierr. A 1.0 km de la coordenada anterio |
| El Acuario (Rose Cay) | 12.553161, -81.689049 | osm | media | [way/245133418](https://www.openstreetmap.org/way/245133418) | Sin muelle en OSM: orilla de "Cayo Acuario" más cercana a la isla principal |
| Jardín Botánico de San Andrés | 12.537151, -81.711551 | osm | media | [way/713176581](https://www.openstreetmap.org/way/713176581) | Centro de "Jardin Botanico de San Andres" (leisure/park) en OSM (área grande sin entrada marcada) |
| Laguna Big Pond | 12.548054, -81.719180 | osm | media | [way/28570754](https://www.openstreetmap.org/way/28570754) | "Laguna Big Pond" (water/pond) de OSM: orilla más cercana a un camino (a 2 m) |
| Playa de Sound Bay | 12.516862, -81.714277 | osm | media | [way/172276505](https://www.openstreetmap.org/way/172276505) | Playa "Sound Bay" de OSM: punto más cercano a una calle o camino (a 4 m). Queda a 4.1 km de la coordenada aproximada: confirmar que es el mismo luga |
| Rocky Cay | 12.543624, -81.703992 | osm | media | [way/172205579](https://www.openstreetmap.org/way/172205579) | Playa de OSM (way/172205579) junto a "Rocky Cay" (place/islet): punto más cercano a un camino. El destino es la playa frente al cayo: se toma la parte de la playa más cercana al cayo. A 3.5 km de la coordenada anterio |
| Aquanautas (caminata submarina) | 12.520692, -81.729055 | osm | alta | [node/4523563092](https://www.openstreetmap.org/node/4523563092) | Ubicación de "Aquanautas" (tourism/attraction) en OSM. Funciona en West View |
| Buceo con Karibik Diver | 12.580288, -81.690093 | osm | alta | [node/1269638941](https://www.openstreetmap.org/node/1269638941) | Ubicación de "Karibik Diving" (amenity/dive_centre) en OSM |
| Capitán Mandy | 12.580954, -81.698561 | osm | alta | [node/3230550452](https://www.openstreetmap.org/node/3230550452) | Ubicación de "Capitan Mandy" (amenity/restaurant) en OSM |
| Casa Museo Isleña | 12.560124, -81.729008 | osm | alta | [node/313846087](https://www.openstreetmap.org/node/313846087) | Ubicación de "Casa Museo Isleña" (tourism/museum) en OSM |
| Cocoplum Bay | 12.542496, -81.707070 | osm | alta | [way/172205579](https://www.openstreetmap.org/way/172205579) | Playa "Cocoplum" de OSM: punto junto a "Cocoplum Beach Hotel" más cercano a una calle o camino (a 34 m). Se toma la parte de la playa frente al hotel Cocoplum (el extremo norte es el acceso de Rocky Cay) |
| Cueva de Morgan | 12.542459, -81.729628 | osm | alta | [node/12434308112](https://www.openstreetmap.org/node/12434308112) | Ubicación de "Cueva de Morgan" (tourism/attraction) en OSM |
| Donde Francesca | 12.519852, -81.713905 | osm | alta | [node/3168649268](https://www.openstreetmap.org/node/3168649268) | Ubicación de "Donde Francesca" (amenity/restaurant) en OSM. A 3.2 km de la coordenada anterio |
| Fishermen's Place | 12.590403, -81.700637 | osm | alta | [node/3782623549](https://www.openstreetmap.org/node/3782623549) | Ubicación de "Fishermen's Place" (amenity/restaurant) en OSM |
| Gourmet Shop Assho | 12.581517, -81.692729 | osm | alta | [node/3167245221](https://www.openstreetmap.org/node/3167245221) | Ubicación de "Gourmet Shop Assho" (amenity/restaurant) en OSM |
| Haynes Cay | 12.550556, -81.689238 | osm | alta | [way/172206236](https://www.openstreetmap.org/way/172206236) | Muelle del cayo en OSM ("Cayo Córdoba") |
| Hoyo Soplador | 12.481358, -81.731107 | osm | alta | [node/313845738](https://www.openstreetmap.org/node/313845738) | Ubicación de "Hoyo Soplador" (tourism/attraction) en OSM |
| Johnny Cay | 12.599784, -81.690421 | osm | alta | [relation/11519035](https://www.openstreetmap.org/relation/11519035) | Muelle del cayo en OSM ("Cayo Sucre") |
| La Piscinita | 12.508634, -81.729559 | osm | alta | [way/243996700](https://www.openstreetmap.org/way/243996700) | Centro de "La Piscinita" (leisure/swimming_pool) en OSM. Ajustado 7 m a tierr. A 3.3 km de la coordenada anterio |
| La Regatta | 12.580267, -81.691796 | osm | alta | [node/3167245220](https://www.openstreetmap.org/node/3167245220) | Ubicación de "La Regatta" (amenity/restaurant) en OSM. Ajustado 12 m a tierr |
| Miss Celia | 12.581208, -81.691748 | osm | alta | [node/3782623547](https://www.openstreetmap.org/node/3782623547) | Ubicación de "Miss Celia" (amenity/restaurant) en OSM. A 0.9 km de la coordenada anterio |
| Paseo en semisubmarino | 12.580118, -81.690372 | osm | alta | [node/4740694087](https://www.openstreetmap.org/node/4740694087) | Ubicación de "Muelle Casa de la Cultura" (leisure/marina) en OSM. Punto de embarque: muelle de la Casa de la Cultura |
| Playa de Spratt Bight | 12.585246, -81.693270 | osm | alta | [way/28185601](https://www.openstreetmap.org/way/28185601) | Playa "Spratt Bight" de OSM: punto más cercano a una calle o camino (a 2 m). A 0.6 km de la coordenada anterio |
| Primera Iglesia Bautista | 12.561879, -81.716904 | osm | alta | [way/169875625](https://www.openstreetmap.org/way/169875625) | Centro de "Iglesia Bautista" (amenity/place_of_worship) en OSM |
| West View | 12.520718, -81.729171 | osm | alta | [node/3166634771](https://www.openstreetmap.org/node/3166634771) | Ubicación de "West View" (tourism/attraction) en OSM. A 1.5 km de la coordenada anterio |
<!-- ubicaciones:fin -->

## Horarios

| Destino | Cargado | Nota |
| --- | --- | --- |
| Playas (Spratt Bight, San Luis) | 06:00–19:00 | Son de acceso libre: el horario es referencial (horas con afluencia). |
| Playas (Rocky Cay, Sound Bay) | 06:00–18:00 | Ídem. |
| Cayos | 09:00–16:00 | Horario habitual de las lanchas; confirmar con los operadores. |
| La Regatta | 12:00–22:30 | Según búsquedas web: 12:00–15:00 y 18:30–22:30, cerrado los domingos. El esquema guarda un solo intervalo; la pausa de la tarde se refleja con ocupación 0 en el seed. El cierre dominical no está modelado. |
| Miss Celia | 12:00–22:00 | Según búsquedas web. |
| Donde Francesca | 11:00–17:00 | Según búsquedas web. |
| West View, La Piscinita | 08:00–17:00 | Estimado. |
| Kayak en Old Point | 08:00–16:00 | Estimado: los tours salen con reserva. |
| Hoyo Soplador | 07:00–18:00 | Lugar abierto; horario referencial (luz de día). |
| Primera Iglesia Bautista | 08:00–17:00 | Estimado: confirmar horario de visitas. |
| Cocoplum Bay, Playa Los Charquitos | 06:00–18:00 | Acceso libre; horario referencial. |
| Bahía Sardina | 06:00–19:00 | Acceso libre; horario referencial (igual que Spratt Bight). |
| Cayo Bolívar | 09:00–16:00 | Tour de día completo; confirmar horas de salida y regreso con los operadores. |
| Fishermen's Place | 12:00–17:00 | Estimado: se conoce como lugar de almuerzo. Confirmar si abre en la noche. |
| Gourmet Shop Assho, Capitán Mandy | 12:00–22:00 | Estimado. |
| Paseo en semisubmarino | 10:00–17:00, sin salidas de 12:00 a 15:00 | Según operadores en la web: salidas a las 10:00 y a las 15:00 (~1 h 30 min). La pausa se refleja con ocupación 0 en el seed. |
| Aquanautas | 09:00–16:00, pausa 12:00–14:00 | Según su web: turnos 9:00–12:00 y 14:00–16:00, con reserva. |
| Buceo con Karibik Diver | 08:00–17:00 | Estimado. |
| Vuelta a la isla | 08:00–18:00 | Horario referencial del alquiler de carritos y de las chivas. |
| Laguna Big Pond | 08:00–17:00 | Estimado. |
| Jardín Botánico | 08:00–17:00 | Según sanandresislas.com.co: martes a sábado 9:00–12:00 y 14:00–16:30; domingos y festivos 10:00–12:00 y 14:00–16:30; cerrado los lunes. Ajustar el horario cargado (el esquema guarda un solo intervalo). |
| Cueva de Morgan, Casa Museo Isleña | 09:00–17:00 | Estimado. |

## Rangos de precio

| Destino | Cargado | Nota |
| --- | --- | --- |
| Johnny Cay | $ | Entrada al parque regional + lancha. |
| El Acuario, Haynes Cay | $$ | Tour en lancha. |
| West View, La Piscinita | $ | Entrada; alquiler de snorkel aparte. |
| Kayak en Old Point | $$ | Tour guiado + entrada al parque (las fuentes mencionan entre $10.000 y $15.000 COP de entrada). |
| La Regatta | $$$ | |
| Miss Celia, Donde Francesca | $$ | |
| Primera Iglesia Bautista | Gratis | Confirmar si cobran por subir a la torre o piden aporte. |
| Playas, Hoyo Soplador | Gratis | |
| Cayo Bolívar | $$$ | Tour de día completo con almuerzo; confirmar precio. |
| Fishermen's Place, Capitán Mandy | $$ | |
| Gourmet Shop Assho | $$$ | |
| Paseo en semisubmarino, Vuelta a la isla | $$ | La vuelta a la isla depende de si es en carrito (por horas) o en chiva (por persona). |
| Aquanautas, Buceo con Karibik Diver | $$$ | |
| Laguna Big Pond, Jardín Botánico, Casa Museo Isleña | $ | Confirmar si cobran entrada o piden aporte voluntario. |
| Cueva de Morgan | $$ | Entrada al parque temático. |

## Precio por persona (COP)

Columnas `destino.precio_min_cop`, `precio_max_cop` y `precio_es_estimado` (migración `20261016120200_presupuesto_y_resenas.sql`, también en `supabase/seed.sql`). Es el costo **por persona por visita**: entrada, tour o consumo típico. Todos están marcados como **estimados** (`precio_es_estimado = true`) y la app los muestra con la etiqueta "Estimado". No incluyen la tarjeta de turismo del archipiélago ni el transporte desde el hotel.

Al confirmar un precio: actualizarlo con una migración aditiva (o desde el panel del administrador cuando se agregue el campo), poner `precio_es_estimado = false` y tachar la fila.

Consultado en octubre de 2026. Fuentes públicas: operadores y guías turísticas ([Viator](https://www.viator.com/tours/San-Andres/Combo-Jhony-Cay-Aquarius-Bahia-Mangroves-and-Manta-Rays/d28673-191475P1), [Islaventura](https://islaventura.com.co/tour/tour-acuario-johnny-cay/), [Guía San Andrés Islas](https://guiasanandresislas.com/producto/acuario-y-jhony-cay/), [Viaja San Andrés: Cueva de Morgan](https://viajasanandres.com/sitios-turisticos/cueva-de-morgan/), [Viaja San Andrés: West View](https://viajasanandres.com/sitios-turisticos/west-view/), [Mi Gue bajo el agua: West View y La Piscinita](https://www.miguebajoelagua.com/blog/san_andres/west-view-poseidon-san-andres-la-piscinita), [sanandres.travel: semisubmarino](https://sanandres.travel/tour/semisubmarino), [sanandres.travel: Aquanautas](https://sanandres.travel/tour/aquanautas-san-andres)). Cuando no hubo una fuente clara, se usó una estimación prudente (indicada en la tabla).

| Destino | Mínimo | Máximo | Qué incluye / supuesto | Base |
| --- | ---: | ---: | --- | --- |
| Johnny Cay | 85.000 | 125.000 | Tour en lancha (con El Acuario en muchos combos) + impuesto de ingreso al cayo (~15.000) y muelle | Fuente: tours de 70.000–110.000 + impuesto |
| El Acuario (Rose Cay) | 70.000 | 110.000 | Tour en lancha (suele ir con Haynes Cay) | Fuente: precios de tours combinados |
| Haynes Cay | 70.000 | 110.000 | Mismo tour que El Acuario | Fuente: precios de tours combinados |
| Cayo Bolívar | 250.000 | 400.000 | Tour de día en lancha rápida, normalmente con almuerzo | Estimación prudente |
| West View | 10.000 | 30.000 | Entrada (10.000–20.000) + alquiler de chaleco o snorkel | Fuente |
| La Piscinita | 5.000 | 15.000 | Entrada (~5.000) + chaleco | Fuente |
| Cueva de Morgan | 15.000 | 25.000 | Entrada al parque | Fuente (15.000–25.000; 20.000 lo más citado) |
| Paseo en semisubmarino | 110.000 | 180.000 | Tour de unas 2 horas (Manatí y similares) | Fuente (110.000–176.000) |
| Aquanautas (caminata submarina) | 200.000 | 300.000 | Caminata submarina con casco | Estimación prudente: confirmar con el operador |
| Buceo con Karibik Diver | 250.000 | 400.000 | Bautizo o inmersión guiada con equipo | Estimación prudente |
| Kayak en el Manglar de Old Point | 60.000 | 120.000 | Tour guiado en kayak | Estimación prudente |
| Vuelta a la isla | 30.000 | 80.000 | Por persona: bus/chiva o la parte de un carrito compartido | Estimación prudente |
| La Regatta | 120.000 | 250.000 | Plato fuerte + bebida | Estimación prudente |
| Miss Celia | 50.000 | 100.000 | Plato típico + bebida | Estimación prudente |
| Donde Francesca | 60.000 | 120.000 | Plato fuerte + bebida | Estimación prudente |
| Fishermen's Place | 40.000 | 90.000 | Almuerzo de pescado + bebida | Estimación prudente |
| Gourmet Shop Assho | 70.000 | 150.000 | Plato + bebida | Estimación prudente |
| Capitán Mandy | 60.000 | 150.000 | Mariscos + bebida | Estimación prudente |
| Jardín Botánico de San Andrés | 10.000 | 20.000 | Entrada | Estimación prudente: confirmar |
| Casa Museo Isleña | 15.000 | 25.000 | Entrada con recorrido | Estimación prudente: confirmar |
| Laguna Big Pond | 5.000 | 15.000 | Aporte o entrada | Estimación prudente: confirmar si es gratis |
| Hoyo Soplador | 0 | 5.000 | Gratis; consumo opcional en los puestos | Estimación prudente |
| Primera Iglesia Bautista | 0 | 10.000 | Gratis o aporte para subir al campanario | Estimación prudente: confirmar |
| Playa de Spratt Bight | 0 | 30.000 | Playa pública; carpa o silla opcional | Estimación prudente |
| Playa de San Luis | 0 | 20.000 | Playa pública; silla o bebida opcional | Estimación prudente |
| Rocky Cay | 0 | 20.000 | Playa pública; snorkel o bebida opcional | Estimación prudente |
| Playa de Sound Bay | 0 | 10.000 | Playa pública | Estimación prudente |
| Cocoplum Bay | 0 | 30.000 | Playa pública; consumo en el hotel opcional | Estimación prudente |
| Bahía Sardina | 0 | 30.000 | Playa pública; carpa o silla opcional | Estimación prudente |
| Playa Los Charquitos | 0 | 0 | Gratis | Estimación prudente |

**Reseñas:** no se siembran reseñas de ejemplo. El promedio y la razón "Buena calificación" solo aparecen con reseñas reales (la razón exige al menos 3).

## Otros datos

- **Capacidades** (`destino.capacidad`): todas son estimaciones para el cálculo de personas; no hay fuente oficial.
- **Primera Iglesia Bautista**: la descripción dice "fundada en 1844"; confirmar el año.
- **Haynes Cay**: la descripción menciona que en sus alrededores se suelen ver mantarrayas.
- **Cómo llegar**: los tiempos de viaje desde el centro son aproximados.
- **Cayo Bolívar**: está a unos 30 km al sureste de la isla (Cayos del Este-Sudeste / Courtown Cays); no es tan cercano como Johnny Cay o El Acuario, pero se visita en tours de día desde San Andrés. El tiempo de viaje en lancha varía con el mar: confirmarlo antes de mostrarlo en la app.
- **Playa Los Charquitos**: las fuentes web la ubican en el extremo sur (South End); OpenStreetMap no tiene una playa con ese nombre. Confirmar el punto exacto.
- **Laguna Big Pond**: la descripción menciona babillas y tortugas (según guías turísticas); confirmar.
- **Jardín Botánico de San Andrés**: confirmar el mirador y si se visita con guía o reserva.
- **Buceo con Karibik Diver**: en OpenStreetMap aparece como "Karibik Diving"; confirmar el nombre comercial.
- **Aquanautas**: según su web, edad mínima de 12 años (o 1,45 m de estatura) y unos 25 minutos bajo el agua.
