# Datos por verificar

Valores aproximados cargados en `supabase/seed.sql` que hay que confirmar en Google Maps (o en la fuente oficial del lugar). Al corregir uno, actualizar el seed y tachar la fila aquí.

Convenciones: coordenadas en grados decimales (latitud, longitud); horarios en hora de Colombia, cierre exclusivo.

## Coordenadas

| Destino | Cargado | Origen | Qué confirmar |
| --- | --- | --- | --- |
| Playa de Spratt Bight | 12.584300, -81.698800 | Seed del MVP | Punto central de la playa |
| Playa de San Luis | 12.539000, -81.700500 | Seed del MVP | Punto central de la playa |
| Rocky Cay | 12.512500, -81.704500 | Seed del MVP | Playa frente al cayo (podría estar más al norte, ~12.52) |
| Playa de Sound Bay | 12.552000, -81.703000 | Estimado | Ubicación de la playa |
| Johnny Cay | 12.600500, -81.689900 | Geolocalización de fotos de Commons | Solo revisar |
| El Acuario (Rose Cay) | 12.552900, -81.688700 | Geolocalización de una foto tomada allí | Solo revisar |
| Haynes Cay | 12.551000, -81.686000 | Estimado (vecino de El Acuario) | Ubicación exacta del cayo |
| La Regatta | 12.580000, -81.696000 | Estimado | Ubicación del restaurante |
| Miss Celia | 12.578500, -81.699500 | Estimado | Ubicación del restaurante |
| Donde Francesca | 12.545500, -81.700500 | Estimado | Ubicación del restaurante |
| West View | 12.534500, -81.727100 | Seed del MVP | Entrada del lugar |
| La Piscinita | 12.538000, -81.726500 | Seed del MVP | Una foto de Commons la ubica en 12.5270, -81.7317: confirmar cuál es correcta |
| Kayak en el Manglar de Old Point | 12.566000, -81.704000 | Estimado | Punto de salida de los tours |
| Hoyo Soplador | 12.482200, -81.731600 | Geolocalización de fotos de Commons | Solo revisar |
| Primera Iglesia Bautista | 12.561500, -81.716800 | Geolocalización de una foto tomada desde la iglesia | Solo revisar |

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
| Laguna Big Pond, Jardín Botánico | 08:00–17:00 | Estimado. |
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
