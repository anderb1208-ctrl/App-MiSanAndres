# Cambios al diseño (Entregable 2)

Diferencias entre el documento de diseño (`Entregable2_MiSanAndres.docx`) y la base de datos implementada en `supabase/migrations/`. Sirve como lista de pendientes para actualizar el entregable.

## 1. Tabla Usuario

| Campo | Entregable | Implementado | Motivo |
| --- | --- | --- | --- |
| id_usuario | INT, PK, AUTO_INCREMENT | UUID, PK, FK → `auth.users(id)` ON DELETE CASCADE | La autenticación la maneja Supabase Auth, que identifica a los usuarios con UUID. |
| correo | VARCHAR(150), NOT NULL, UNIQUE | **Eliminado** de la tabla | Ya se guarda (y es único) en `auth.users`. Duplicarlo generaría inconsistencias. |
| nombre | VARCHAR(100), NOT NULL | TEXT, opcional | Se toma de los metadatos del registro (`nombre`); puede llegar vacío. |
| nivel_ocupacion_preferido | — | **Nuevo**: Bajo / Medio / Alto, opcional | El body de `POST/PUT /preferencias` incluye `nivelOcupacion` y no había dónde guardarlo. |
| fecha_registro | — | **Nuevo**: TIMESTAMPTZ, default `now()` | Auditoría básica. |

- La fila de `usuario` se crea automáticamente con un **trigger** sobre `auth.users` al registrarse; la app no la inserta.
- La regla "El correo electrónico de cada usuario debe ser único" pasa a cumplirse en `auth.users`.

## 2. Tabla Destino

| Campo | Entregable | Implementado | Motivo |
| --- | --- | --- | --- |
| nombre | VARCHAR(150), NOT NULL | TEXT, NOT NULL, **UNIQUE** | Evitar destinos duplicados. |
| categoria | VARCHAR(50), valor controlado | Enum `categoria_destino`: playa, cayo, naturaleza, buceo_snorkel, cultura, gastronomia, **actividad** | El valor controlado queda garantizado por la base de datos. `actividad` (snorkel, buceo, kayak, lancha) se agregó en el prototipo; `buceo_snorkel` queda sin destinos pero no se elimina (migraciones aditivas). Los restaurantes usan `gastronomia` (etiqueta "Restaurantes"). |
| ubicacion | VARCHAR(255), NOT NULL | `ubicacion_texto` TEXT, NOT NULL | Renombrado para distinguirlo de las coordenadas. |
| latitud | DECIMAL(10,8) | NUMERIC(9,6), CHECK entre -90 y 90 | 6 decimales ≈ 0,1 m de precisión, suficiente para destinos turísticos. |
| longitud | DECIMAL(11,8) | NUMERIC(9,6), CHECK entre -180 y 180 | Ídem. |
| estado | VARCHAR(20) (ej: Activo, Inactivo) | Enum `estado_destino`: abierto, cerrado_temporal, inactivo | Se agrega el cierre temporal (mantenimiento, clima, veda). |
| descripcion | — | **Nuevo**: TEXT | Lo muestra la pantalla de Detalle del destino. |
| imagen_url | — | **Nuevo**: TEXT | Imagen de la tarjeta y del detalle. |
| horario_apertura, horario_cierre | — | **Nuevo** (prototipo): TIME, opcionales; van juntos y apertura < cierre | Mostrar el horario y que la predicción responda "Cerrado" fuera de él. |
| rango_precio | — | **Nuevo** (prototipo): enum `rango_precio` (Gratis, $, $$, $$$), opcional | Orientar al turista sobre el costo. |
| como_llegar | — | **Nuevo** (prototipo): TEXT, opcional | Indicaciones en el detalle. |
| imagen_autor, imagen_licencia, imagen_fuente | — | **Nuevo** (prototipo): TEXT, opcionales | Atribución que exigen las licencias Creative Commons (ver `docs/creditos-imagenes.md`). |
| ubicacion_fuente | — | **Nuevo** (prototipo): enum `ubicacion_fuente` (osm, manual, aproximada), NOT NULL, default `aproximada` | Saber de dónde salen las coordenadas (sección 13). |
| ubicacion_verificada | — | **Nuevo** (prototipo): BOOLEAN, NOT NULL, default `false` | Distinguir los puntos que una persona ya revisó. |

Las fotos propias se suben al bucket público `destinos` de Supabase Storage (lectura pública, sin escritura desde la app).

## 3. Tablas que el diccionario de datos no detalla

El entregable menciona Preferencia, Usuario_Preferencia, Interaccion y Ocupacion en las relaciones y reglas, pero no incluye su diccionario. Hay que agregarlo con esta definición:

**Preferencia** (catálogo único para categorías, tipos de experiencia y tipos de grupo)
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_preferencia | SMALLINT | PK, identity |
| tipo | Enum: categoria, experiencia, grupo | NOT NULL |
| codigo | TEXT | NOT NULL, UNIQUE (tipo, codigo); si tipo = categoria debe ser una categoría de destino válida |
| nombre | TEXT | NOT NULL (etiqueta visible) |
| descripcion | TEXT | Opcional |

**Usuario_Preferencia**
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_usuario | UUID | PK compuesta, FK → Usuario (ON DELETE CASCADE) |
| id_preferencia | SMALLINT | PK compuesta, FK → Preferencia |

**Interaccion**
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_interaccion | BIGINT | PK, identity |
| id_usuario | UUID | NOT NULL, FK → Usuario |
| id_destino | INT | NOT NULL, FK → Destino |
| tipo_interaccion | Enum: vista, favorito, visita, compartir | NOT NULL |
| fecha_hora | TIMESTAMPTZ | NOT NULL, default `now()` |

**Ocupacion**
| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_ocupacion | BIGINT | PK, identity |
| id_destino | INT | NOT NULL, FK → Destino |
| fecha_hora | TIMESTAMPTZ | NOT NULL, UNIQUE (id_destino, fecha_hora) |
| cantidad_personas | INT | NOT NULL, CHECK >= 0 |
| porcentaje_ocupacion | NUMERIC(5,2) | NOT NULL, CHECK entre 0 y 100 |

## 4. Tabla nueva: Destino_Preferencia

No existe en el entregable. Etiqueta cada destino con los tipos de experiencia y de grupo a los que se ajusta (PK compuesta `id_destino`, `id_preferencia`). Sin ella, el recomendador solo podría cruzar la categoría: las preferencias de experiencia y grupo del usuario no tendrían con qué compararse.

Agregar a la tabla de **Relaciones principales**:
| Relación | Tabla origen | Tabla destino | Tipo |
| --- | --- | --- | --- |
| Destino_A_Etiqueta | Destino | Destino_Preferencia | 1:N |
| Preferencia_A_Destino | Preferencia | Destino_Preferencia | 1:N |

Y actualizar el diagrama ER.

## 5. Reglas de integridad

- **Eliminaciones**: el entregable dice que "se restringen las eliminaciones para evitar registros huérfanos". Se implementó **ON DELETE CASCADE**: al borrar un usuario (desde Supabase Auth) se borran su perfil, preferencias e interacciones; al borrar un destino, su ocupación, etiquetas e interacciones. Tampoco quedan huérfanos, pero el mecanismo es distinto. Para dar de baja un destino sin perder su historial se usa `estado = 'inactivo'`.
- **Fechas**: "datetime" pasa a ser **TIMESTAMPTZ** (con zona horaria). Los datos se guardan en UTC y se interpretan en hora de Colombia (`America/Bogota`).
- **Tipo de grupo**: se mencionaba como valor controlado sin indicar dónde vive; ahora es parte del catálogo `preferencia` (tipo = grupo).
- **Nivel de ocupación**: no se guarda; el backend lo calcula del porcentaje. Cortes propuestos: **Bajo < 40 %**, **Medio 40–70 %**, **Alto > 70 %**. Agregarlos al documento.

## 6. Seguridad (no aparece en el entregable)

Agregar una sección sobre **Row Level Security** (activado en todas las tablas):

| Tabla | Visitante (anon) | Usuario autenticado |
| --- | --- | --- |
| destino, destino_preferencia, preferencia, ocupacion, clima_hora | Leer | Leer |
| usuario | — | Ver y editar solo su perfil |
| usuario_preferencia | — | Ver, agregar y quitar solo las propias |
| interaccion | — | Ver, registrar y borrar solo las propias (no se editan: son histórico para el modelo) |

La escritura de destinos y ocupación la hace únicamente el backend con la service role key.

## 7. Impacto en la API (sección 3 del entregable)

- **usuarioId**: el entregable lo define como "número entero positivo" y lo recibe en la URL/body. Ahora es UUID y **no se envía**: el backend lo obtiene del JWT de Supabase Auth. Las rutas `/preferencias/{usuarioId}` pasan a `/preferencias`, y `GET /recomendaciones` deja de recibir `usuarioId`.
- **Recomendaciones**: no se guardan en una tabla, se calculan al momento. `GET /recomendaciones/{id}` ("detalle de una recomendación") no tiene sentido y se elimina; el detalle es `GET /destinos/{id}`.
- **Body de preferencias**: `{categorias, tipoExperiencia, nivelOcupacion}` puede incluir también `tiposGrupo`, ya que el catálogo lo soporta.
- **Errata**: la tabla de destinos lista el detalle como `GET / destinos` con parámetro `id`; debe ser `GET /destinos/{id}`.

## 8. Endpoints agregados en el MVP

No están en la sección 3 del entregable; agregarlos a las tablas de endpoints:

| Método | Endpoint | Descripción | Auth |
| --- | --- | --- | --- |
| GET | /health | Estado del servicio | No |
| GET | /ocupacion/{destinoId}/prediccion/dia?fecha= | Ocupación típica de cada hora para el día de la semana de la fecha (gráfico del detalle) | No |
| GET | /preferencias/catalogo | Catálogo de categorías, experiencias y grupos | No |
| GET, PUT | /perfil | Ver y cambiar el nombre del usuario del token | Sí |
| POST, GET | /interacciones | Registrar una interacción y ver el historial propio | Sí |
| GET | /destinos/{id}/clima?horas= | Clima actual y de las próximas horas (1–48, por defecto 12) en el destino, con la atribución de Open-Meteo | No |
| GET | /clima?horas= | Clima del centro de la isla (resumen de Inicio) | No |
| GET | /mapa | Todos los destinos visibles con coordenadas, foto y ocupación predicha de ahora (estado, porcentaje, nivel) en una sola llamada, para la pestaña Mapa | No |

- `POST /preferencias` se reemplaza por `PUT /preferencias` (crea o reemplaza; idempotente).
- `POST /recomendaciones` no se implementó: las recomendaciones se calculan con `GET /recomendaciones` a partir de las preferencias guardadas.
- Todos los errores usan el formato `{ "error": { "codigo", "mensaje", "detalles?" } }` con 400, 401, 404 o 500.

## 9. Predicción de ocupación (MVP, antes del modelo de ML)

- Mientras no exista el servicio de ML, la predicción parte del **promedio histórico del porcentaje de ocupación a la misma hora y en el mismo día de la semana** (si hay al menos 3 registros; si no, el del tipo de día: entre semana / fin de semana), en hora de Colombia, y lo ajusta con factores de clima y calendario (sección 11).
- El gráfico del detalle muestra la **ocupación típica** de cada hora para ese día de la semana (p. ej. "Ocupación típica de un martes"), con los registros reales de hoy superpuestos. Si aún no hay historial de ese día, se usa el del tipo de día.
- Ambos cálculos usan la función SQL `ocupacion_promedio_hora` (migraciones `20260929200000` y `20261001120000`), que es `security invoker` (respeta RLS) y solo pueden ejecutar los roles `anon` y `authenticated`.
- El backend encapsula el cálculo en `prediccionService`; al llegar el modelo Random Forest solo cambia ese servicio.
- Si la hora consultada está fuera del horario del destino, la predicción responde `estado: "Cerrado"` con ocupación 0 (sin consultar el histórico). Dentro del horario, `estado: "Abierto"`.

## 10. Búsqueda de destinos

`GET /destinos` acepta `q` (texto, 1 a 100 caracteres): filtra por nombre sin distinguir mayúsculas. Se combina con `categoria` y `nivelOcupacion`.

## 11. Clima y calendario en la predicción

El entregable menciona la predicción por hora y día, pero no las variables de contexto. Se agregan dos módulos al backend y una tabla:

**Módulos nuevos (`backend/src/services/`)**

| Módulo | Responsabilidad |
| --- | --- |
| `clima/climaService` | Clima por hora de cada destino con caché en memoria (30 min por destino; 1 min de espera tras un fallo). Depende de la interfaz `ProveedorClima`; la implementación actual es `OpenMeteoProvider` (Open-Meteo, sin clave, timeout de 4 s, todos los destinos en una llamada). |
| `calendarioService` | Día de la semana, fin de semana, festivos de Colombia (Ley 51 de 1983, "Ley Emiliani", calculados sin API ni paquete externo), puentes (3 o más días no laborales seguidos) y temporada (alta / normal). |
| `featuresPrediccion` | Define en un solo lugar las variables de entrada (`FeaturesPrediccion`): hora, díaSemana, esFinDeSemana, esFestivo, esPuente, temporada y clima opcional (temperatura, probLluvia, precipitacion, codigoClima, viento). El modelo de ML recibirá exactamente estas. |
| `factoresPrediccion` | Convierte las variables en factores multiplicativos con su explicación ("Lluvia probable: -20 %"). Los valores viven en `config/factoresPrediccion.ts`. |

**Factores (supuestos del prototipo, configurables)**

| Factor | Condición | Efecto |
| --- | --- | --- |
| Lluvia probable | Probabilidad ≥ 60 % o ≥ 0,5 mm en la hora | Playa −20 %, cayo −25 %, actividad −15 %, naturaleza −10 %, restaurante +10 %, cultura +10 % |
| Tormenta (reemplaza a lluvia) | Código WMO 95, 96 o 99 | Playa −35 %, cayo −50 %, actividad −30 %, naturaleza −20 %, restaurante y cultura +10 % |
| Festivo | El día es festivo | +25 % |
| Puente | Sábado o domingo de un puente | +10 % |
| Temporada alta | 15 dic – 15 ene, Semana Santa, 15 jun – 15 jul (`config/calendario.ts`) | +20 % |

El resultado se limita a 0–100 % y se reclasifica en Bajo / Medio / Alto. Fuera del horario es "Cerrado" sin factores.

**Respuesta de `GET /ocupacion/{destinoId}/prediccion`**: además de porcentaje y nivel, incluye `base` (promedio histórico usado), `features`, `clima` (o `null`), `motivoSinClima` (`fuera_de_rango`, `proveedor_no_disponible` o `sin_datos`) y `factores` (lista legible). **Degradación elegante**: si Open-Meteo falla o la fecha está a más de 16 días, la predicción funciona sin clima.

**Tabla nueva `Clima_Hora`** (datos de entrenamiento del modelo):

| Campo | Tipo | Restricciones |
| --- | --- | --- |
| id_clima_hora | BIGINT | PK, identity |
| id_destino | INT | NOT NULL, FK → Destino (ON DELETE CASCADE) |
| fecha_hora | TIMESTAMPTZ | NOT NULL, UNIQUE (id_destino, fecha_hora) |
| temperatura | NUMERIC(4,1) | °C |
| prob_lluvia | SMALLINT | 0–100 |
| precipitacion | NUMERIC(5,1) | ≥ 0, mm |
| codigo_clima | SMALLINT | 0–99, código WMO |
| viento | NUMERIC(5,1) | ≥ 0, km/h |

Relación: Destino → Clima_Hora (1:N). Lectura pública por RLS, sin escritura desde el cliente. Se llena con el clima real de las últimas 4 semanas (`backend/scripts/generarClimaHistorico.ts` → `supabase/clima_hora.sql`). La ocupación de prueba es **sintética** y responde a ese clima: ver `docs/datos-sinteticos.md`.

**Servicio externo y atribución**: los datos del clima son de Open-Meteo.com con licencia CC BY 4.0 (gratis para uso no comercial, hasta 10.000 llamadas al día). La app muestra "Datos del clima: Open-Meteo.com (CC BY 4.0)" con enlace donde aparece el clima. Agregar Open-Meteo al diagrama de arquitectura del entregable como servicio externo del backend.

## 12. Mapa

En el MVP la pestaña Mapa era una lista con la ubicación en texto. En el prototipo pasa a ser un mapa interactivo:

- **Proveedor**: Apple Maps en iPhone (sin clave, compatible con Expo Go) y Google Maps solo en Android (`PROVIDER_GOOGLE`). El entregable menciona Google Maps Platform para ambas plataformas; en iOS se usa Apple Maps porque no necesita clave ni facturación.
- **Datos**: `GET /mapa` devuelve en una sola llamada todos los destinos visibles con coordenadas, foto y la ocupación predicha de ahora (misma lógica de horario, clima y calendario que la predicción). Evita una petición por destino en conexiones móviles lentas.
- **Marcadores**: el color es la ocupación (Bajo, Medio, Alto y Cerrado en gris) y el ícono la categoría; leyenda y filtros por categoría. Al tocar uno aparece una tarjeta con foto, ocupación y "Ver detalle".
- **Ubicación del usuario** (expo-location, solo en primer plano) y lista **ordenada por distancia** con la fórmula de Haversine (en línea recta; sin ubicación, por nombre). La lista es también el respaldo si el mapa no carga.
- **Detalle**: mini mapa con la ubicación y botón "Cómo llegar", que abre `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG` (sin clave; funciona en iOS y Android).
- **Configuración**: `mobile/app.config.ts` reemplaza a `app.json` y lee la clave de Google Maps de la variable de entorno `GOOGLE_MAPS_API_KEY` (EAS: variable secreta). La clave nunca se guarda en el repositorio.

## 13. Ubicación de los destinos

**Convención**: `latitud` y `longitud` representan el **punto de acceso** del destino y siempre caen **en tierra**:

| Categoría | Punto de acceso |
| --- | --- |
| Playa | Acceso desde la calle o el paseo (el punto de la playa más cercano a una calle o camino) |
| Cayo | Muelle o punto de desembarque (si OSM no tiene muelle: la orilla del cayo más cercana a la isla principal) |
| Restaurante | Entrada |
| Actividad | Punto de encuentro o de embarque |
| Naturaleza y cultura | Entrada (en una laguna, la orilla junto al camino) |

El entregable no define qué representa la coordenada. Con esta convención el pin de "Cómo llegar" lleva a un lugar al que se puede llegar por tierra, nunca a un punto en el mar.

- **Origen**: se calculan con OpenStreetMap (Nominatim y Overpass; datos © colaboradores de OpenStreetMap, ODbL) con `backend/scripts/geolocalizar-destinos.ts`, que lee los destinos de `backend/scripts/ubicaciones/destinos.json`. Se comprueba que el punto cae dentro del contorno de la isla o del cayo; si cae en el agua se lleva a la tierra más cercana.
- **Columnas nuevas**: `ubicacion_fuente` (`osm`, `manual` o `aproximada`) y `ubicacion_verificada` (falso hasta que una persona lo revisa en `docs/revision-ubicaciones.html` y aplica `npm run ubicaciones:corregir`).
- **Control**: `npm run verificar:ubicaciones` falla si algún destino activo cae fuera de tierra o fuera del cuadro de San Andrés (12,38–12,62 N, 81,44–81,76 O: la isla, sus cayos cercanos y los Cayos del Este-Sudeste; no incluye Providencia).
- **Agregar al entregable**: OpenStreetMap como fuente de datos externa (solo en el proceso de carga, no en tiempo de ejecución) y su atribución, que la app muestra en Perfil → Créditos y licencias.
