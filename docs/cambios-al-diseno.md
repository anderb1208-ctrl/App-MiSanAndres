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
| imagen_url | — | **Nuevo**: TEXT | Imagen de la tarjeta y del detalle. En el prototipo guarda la ruta relativa de la foto que sirve el backend (`/destinos/<slug>.jpg`, archivos en `backend/public/destinos/`); la app la completa con la URL del backend. |
| horario_apertura, horario_cierre | — | **Nuevo** (prototipo): TIME, opcionales; van juntos y apertura < cierre | Mostrar el horario y que la predicción responda "Cerrado" fuera de él. |
| rango_precio | — | **Nuevo** (prototipo): enum `rango_precio` (Gratis, $, $$, $$$), opcional | Orientar al turista sobre el costo. |
| como_llegar | — | **Nuevo** (prototipo): TEXT, opcional | Indicaciones en el detalle. |
| imagen_autor, imagen_licencia, imagen_fuente | — | **Nuevo** (prototipo): TEXT, opcionales | Atribución que exigen las licencias Creative Commons (ver `docs/creditos-imagenes.md`). |
| ubicacion_fuente | — | **Nuevo** (prototipo): enum `ubicacion_fuente` (osm, manual, aproximada), NOT NULL, default `aproximada` | Saber de dónde salen las coordenadas (sección 13). |
| ubicacion_verificada | — | **Nuevo** (prototipo): BOOLEAN, NOT NULL, default `false` | Distinguir los puntos que una persona ya revisó. |

Las fotos se sirven desde el backend como archivos estáticos (`GET /destinos/<slug>.jpg`, fuera de `/v1`, con caché de un día); para reemplazar una basta con sustituir el archivo con el mismo nombre. El bucket público `destinos` de Supabase Storage sigue disponible (lectura pública, sin escritura desde la app). Las imágenes con `imagen_licencia = 'sin verificar'` son de referencia y la app las rotula "Imagen de referencia".

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
| origen | Enum `origen_ocupacion`: sintetico, real | NOT NULL, default `sintetico` (migración `20261015120000`, sección 14) |

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
- El backend encapsula el cálculo en `prediccionService`. Con el modelo Random Forest (sección 14) el cálculo pasó a ser un proveedor intercambiable: este promedio histórico es el proveedor **heurístico**, que sigue siendo el predeterminado.
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

**Respuesta de `GET /ocupacion/{destinoId}/prediccion`**: además de porcentaje y nivel, incluye `base` (promedio histórico usado), `features`, `clima` (o `null`), `motivoSinClima` (ver abajo) y `factores` (lista legible). **Degradación elegante**: si Open-Meteo falla o la fecha está a más de 16 días, la predicción funciona sin clima. `motivoSinClima` distingue el caso: `fuera_de_rango`, `sin_datos`, `no_configurado` (`CLIMA_PROVEEDOR=ninguno`), `timeout`, `error_red`, `limite_excedido` (HTTP 429), `error_http` o `respuesta_invalida` (antes era un único `proveedor_no_disponible`). Las fallas transitorias se reintentan una vez, cada falla se registra en el log con su motivo concreto y `GET /health` muestra el estado del clima. Variables opcionales: `CLIMA_PROVEEDOR`, `CLIMA_TIMEOUT_MS`, `CLIMA_REINTENTOS`, `OPEN_METEO_URL`, `OPEN_METEO_API_KEY`.

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
- **Detalle**: mini mapa con la ubicación y botón "Cómo llegar", que abre la **ubicación** del destino (pin con el nombre) y no una ruta, para que el usuario decida en su app de mapas si pide el trayecto. iPhone: hoja de opciones Apple Maps (`https://maps.apple.com/?ll=LAT,LNG&q=NOMBRE`) / Google Maps (enlace universal de búsqueda por coordenadas; app o navegador). Android: `geo:LAT,LNG?q=LAT,LNG(NOMBRE)`. Sin claves; compatible con Expo Go.
- **Marcadores**: con 30 destinos el nombre no se dibuja sobre el mapa; aparece al tocar el marcador (tarjeta), y se conservan los filtros por categoría.
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

## 14. Predicción con Machine Learning

El entregable prevé un modelo Random Forest expuesto con `POST /predict`. Se implementó en `ml/` y se integró al backend sin cambiar rutas ni la app:

**Servicio `ml/` (Python, FastAPI, scikit-learn)**

| Endpoint | Descripción | Protección |
| --- | --- | --- |
| `GET /health` | Estado del servicio y del modelo (origen de los datos, métricas) | Pública |
| `POST /predict` | Porcentaje, nivel y personas para un destino, fecha, hora y clima opcional | Cabecera `X-API-Key` (`ML_API_KEY`) |
| `POST /predict/lote` | Lo mismo para varias consultas (hasta 500); lo usa el backend | Cabecera `X-API-Key` |

- Modelo (versión inicial; ver la sección 18 para la comparación de tres modelos que lo reemplazó): `RandomForestRegressor(n_estimators=100, random_state=42)` con `min_samples_leaf=20` (para que el archivo pese ~11 MB). Variables: las de `FeaturesPrediccion` (hora, día de la semana, fin de semana, festivo, puente, temporada, temperatura, precipitación, viento) más el destino, su categoría y su capacidad. Validación **temporal** (entrena con las fechas antiguas, prueba con las recientes) y comparación contra un baseline (promedio por destino y hora).
- **Datos sintéticos**: mientras no haya mediciones reales, el modelo se entrena con un dataset simulado (`ml/generar_mock_dataset.py`) con los mismos supuestos del seed y el mismo calendario del backend (`ml/calendario.py` replica `calendarioService`). Cada respuesta indica el origen (`mock`/`real`) y la app muestra "Estimación basada en datos simulados".
- **Datos reales**: plantilla y guía en `ml/datos/`; `ml/cargar_datos_reales.py` valida y normaliza el archivo y opcionalmente lo inserta en `ocupacion` con `origen = real`; `python entrenar_modelo.py --dataset real` reentrena. Con menos de 4 semanas por destino el modelo no queda "listo para producción".
- Se despliega como un segundo Web Service en Render (Root Directory `ml`).

**Backend**

- Interfaz `ProveedorPrediccion` (`services/prediccion/`) con dos implementaciones, el **heurístico** (promedio histórico + factores, sección 9) y el de **ML** (llama a `/predict/lote` con timeout corto), y un modo **auto** (ML; si falla o no responde, heurístico). Se elige con `PREDICCION_PROVEEDOR` (`heuristico` por defecto). Tras un fallo del servicio de ML no se reintenta durante 30 s. En modo `ml` sin respaldo, una caída responde **503** (`SERVICIO_NO_DISPONIBLE`).
- Variables nuevas, validadas con zod y opcionales si no se usa ML: `PREDICCION_PROVEEDOR`, `ML_SERVICE_URL`, `ML_API_KEY`, `ML_TIMEOUT_MS` (2.500 ms) y `ORIGEN_DATOS_HISTORICOS` (`sintetico`/`real`, el origen del histórico que usa el heurístico).
- `GET /ocupacion/{destinoId}/prediccion` (y la ocupación de `/destinos`, `/mapa` y `/recomendaciones`, que usan el mismo servicio) agrega: `proveedor` (`heuristico`, `ml` u `horario` si está cerrado), `proveedorRespaldo` (el modo auto cayó al heurístico), `origenDatos` (`sintetico`/`real`), `datosSimulados` y `mensajeOrigen` ("Estimación basada en datos simulados"). Con ML, `fuente` es `modelo_ml`, `base` es `null` y `factores` va vacío (el modelo ya incorpora calendario y clima).
- La ocupación típica del día (`/prediccion/dia`) sigue saliendo del histórico de `ocupacion`.
- Registro de peticiones con morgan (método, ruta, estado y duración) y mensaje de arranque con entorno y puerto.

**Agregar al entregable**: el servicio de ML como componente del diagrama de arquitectura (Backend → Servicio ML por HTTPS con API key), la columna `Ocupacion.origen`, los campos nuevos de la respuesta de predicción y el aviso de datos simulados.

## 15. Roles y permisos

El entregable solo contempla al turista. Se agregan tres roles en `usuario.rol` (enum `rol_usuario`, por defecto `turista`), migración `20261016120000_roles_y_tickets.sql`:

| Rol | Puede |
| --- | --- |
| turista | Todo lo anterior (recomendaciones, favoritos, reseñas) y reportar problemas (tickets) y ver los suyos. |
| tecnico | Ver y gestionar todos los tickets (estado, prioridad, asignación) y comentarlos. |
| administrador | Lo del técnico, más usuarios y roles, crear/editar/ocultar destinos, cierre temporal con aviso, moderar reseñas y ver métricas. |

- **El rol nunca se elige al registrarse** ni lo puede cambiar el propio usuario: un trigger (`private.proteger_rol`) lo impide y los privilegios por columna solo dejan editar `nombre`, `nivel_ocupacion_preferido` y el presupuesto. Solo la función `cambiar_rol_usuario` (administrador) lo cambia; no deja que un administrador se quite su propio rol ni que la app quede sin administradores.
- **Sin service role en la API**: el backend sigue trabajando con el JWT del usuario. El middleware `requiereRol(...)` lee el rol **de la base** (no del token ni del cliente) para responder 403 pronto, y RLS lo vuelve a comprobar con las funciones `es_personal()` y `es_administrador()`.
- Tablas nuevas `ticket` y `ticket_comentario` (categoría, prioridad, estado `abierto → en_revision → resuelto → cerrado`, técnico asignado, fechas de actualización y cierre).
- Endpoints: `GET /me`, `/tickets` (POST, GET, GET/:id, PATCH/:id para el personal, POST /:id/comentarios) y `/admin/*` (usuarios, rol, métricas, destinos y estado). Errores: **403** `PROHIBIDO` cuando el rol no alcanza.
- La app muestra pestañas según el rol: turista (Inicio, Explorar, Mapa, Favoritos, Perfil), técnico (Tickets, Perfil) y administrador (Panel, Destinos, Usuarios, Tickets, Perfil). Es solo presentación: la seguridad está en el backend y en RLS.
- Usuarios de demostración: `backend/scripts/crear-usuarios-demo.ts` (ver `docs/usuarios-y-roles.md`).

## 16. Favoritos, cierre temporal y avisos

Migración `20261016120100_favoritos_y_alertas.sql`.

- **Cierre temporal**: se reutiliza el valor `cerrado_temporal` del enum `estado_destino` en vez de una columna booleana `cierre_temporal` nueva (sería redundante y podría contradecir al estado). Se agregan `destino.motivo_cierre` (3–200 caracteres) y `destino.cierre_hasta` (fin previsto). El **estado efectivo** se evalúa en cada consulta: si `cierre_hasta` ya pasó, el destino cuenta como abierto sin necesidad de tareas programadas.
- Tabla `favorito` (PK `id_usuario, id_destino`) con `avisar_apertura` y `avisar_cierre` (por defecto activos). El tipo de interacción `favorito` se sigue registrando aparte, para las métricas.
- Tabla `dispositivo_push` (token de Expo único por teléfono y plataforma). El cliente no la escribe directamente: usa `registrar_dispositivo_push` (reasigna el token si el teléfono cambió de cuenta) y `quitar_dispositivo_push` (al cerrar sesión).
- **Avisos locales** (horario normal): la app programa en el teléfono, para los próximos 7 días, un aviso a la hora de apertura y otro 30 minutos antes del cierre de cada favorito (máximo 60, por el límite de 64 de iOS, priorizando los más próximos). Funcionan sin internet y en Expo Go.
- **Push remotas** (cierre temporal o reapertura): `PATCH /admin/destinos/:id/estado` envía el aviso por la Expo Push API a quienes tienen ese favorito con el aviso correspondiente, en lotes de 100, y desactiva los tokens que responden `DeviceNotRegistered`. Un fallo del envío no deshace el cambio de estado; la respuesta trae `{ destino, aviso }` con el resumen.
- Endpoints: `/favoritos` (GET, POST, PATCH/:idDestino, DELETE/:idDestino) y `/dispositivos` (POST, DELETE).

## 17. Presupuesto, recomendaciones explicadas y reseñas

Migración `20261016120200_presupuesto_y_resenas.sql`.

| Tabla | Campo nuevo | Motivo |
| --- | --- | --- |
| destino | `precio_min_cop`, `precio_max_cop` (INT ≥ 0, van juntos, mín ≤ máx) | Costo **por persona por visita** (entrada, tour o consumo típico) para comparar con el presupuesto. `rango_precio` ($, $$, $$$) se mantiene. |
| destino | `precio_es_estimado` (BOOLEAN, por defecto true) | Todos los precios cargados son aproximados (`docs/datos-por-verificar.md`); la app los marca "Estimado". |
| usuario | `presupuesto_min_cop`, `presupuesto_max_cop` (opcionales, van juntos) | Presupuesto del turista, editable por él (privilegio de columna). |
| resena | Tabla nueva: usuario, destino, estrellas 1–5, comentario opcional, `oculta`, única por usuario y destino | Calificación de los destinos. El administrador oculta con `ocultar_resena`; el autor no puede des-ocultar la suya. |

- **Tipos de grupo aptos**: no se agregó una columna; ya existen como etiquetas de grupo del destino en `destino_preferencia` (solo, pareja, familia_ninos, amigos, adulto_mayor) y se reutilizan.
- **No se siembran reseñas.** El promedio solo cuenta reseñas visibles y la razón "Buena calificación" exige al menos 3 reseñas reales.
- **Recomendaciones explicadas**: cada recomendación trae `razones: [{ codigo, texto, tipo: 'positiva' | 'advertencia' }]` y una frase `porQue`, calculadas de forma determinista con los mismos datos y reglas del puntaje (`services/razonesRecomendacion.ts`): preferencias que coinciden, presupuesto, tipo de grupo, horario, ocupación a la hora planeada, clima (al aire libre) y calificación. Si falta un dato, la razón se omite; las advertencias son reales ("Ocupación alta a las 12:00 (82 %)").
- **Puntaje**: a la afinidad y el ajuste por ocupación (sección 9) se suman presupuesto (+5 dentro o por debajo, +2 si el rango se cruza, −10 si está por encima) y calificación (+3 con promedio ≥ 4, −3 con < 3, solo con 3 reseñas o más).
- `GET /recomendaciones` acepta `fecha`, `hora` (hora planeada) y `presupuestoMin`/`presupuestoMax` (filtro rápido: deja fuera lo que empieza por encima del máximo). La respuesta agrega `presupuesto` (el usado).
- Endpoints de reseñas: `GET /destinos/:id/resenas` (público), `GET/PUT/DELETE /destinos/:id/resena` (la propia) y, para el administrador, `GET /admin/destinos/:id/resenas` y `PATCH /admin/resenas/:id`. El detalle del destino agrega `precio` y `calificacion`.
- Las reseñas públicas no muestran el nombre del autor (RLS no deja a anon leer `usuario`); la app muestra "Viajero".

**Agregar al entregable**: los roles y los actores técnico y administrador en los casos de uso, las tablas `ticket`, `ticket_comentario`, `favorito`, `dispositivo_push` y `resena`, los campos de precio y presupuesto, y la Expo Push API en el diagrama de arquitectura (Backend → Expo Push → FCM/APNs → teléfono).

## 18. Comparación de modelos y datos simulados calibrados

El entregable prevé un solo modelo (Random Forest). Para justificar la elección se **compararon tres modelos** y se usa el mejor. Detalle para el entregable: [`docs/seleccion-de-modelo.md`](seleccion-de-modelo.md).

- **Datos**: `ml/generar_dataset_simulado.py` (alias `generar_mock_dataset.py`) genera 24,5 meses de ocupación horaria **simulada** para los 30 destinos, calibrada con datos reales: clima observado hora por hora de Open-Meteo (`ml/datos/clima_historico_san_andres.csv`, versionado), festivos y temporadas de Colombia, llegadas oficiales de turistas por mes (`ml/datos/llegadas_turistas_mensuales.csv`), capacidad de Johnny Cay y cierre judicial de El Acuario. Columnas nuevas del dataset: `origen_dato` (`simulado_calibrado`), `categoria`, `capacidad` y `evento` (cierres con ocupación 0). Fuentes y supuestos: `ml/datos/FUENTES.md`; chequeos: `ml/calidad_dataset.py` → `ml/reportes/calidad_dataset.md`.
- **Modelos**: Ridge (one-hot de destino, mes y categoría × hora, hora cíclica e interacciones), Random Forest y HistGradientBoosting, más el baseline (promedio por destino y hora) como referencia. Pipelines con `ColumnTransformer` e imputación del clima por **climatología mensual** (el backend manda clima nulo para fechas sin pronóstico).
- **Validación**: temporal (prueba = últimos 3 meses) y `RandomizedSearchCV` con `TimeSeriesSplit` (semilla 42). **Selección**: menor RMSE; si la diferencia es menor al 2 %, el más liviano; restricciones de ≤ 50 MB y < 100 ms por predicción. **Ganador: HistGradientBoosting** (RMSE 6,48 frente a 6,65 de Random Forest, 8,94 de Ridge y 9,50 del baseline; 0,64 MB).
- **Servicio ML**: `GET /modelo` (ganador y comparativa); `/predict` y `/predict/lote` indican `modelo` y `modelo_clave`; `origen_modelo` pasa de `mock` a `simulado` (el backend acepta los dos). El modelo ganador se versiona en `ml/modelos/` y el Build Command de Render queda en `pip install -r requirements.txt`.
- **Backend**: la predicción agrega `modelo` (el que respondió) y la app muestra "Estimado con [modelo] · datos simulados" en el detalle.
- **Calendario**: se agrega el **receso escolar de octubre** como temporada alta (backend y ML).

**Agregar al entregable**: la sección de selección de modelo (metodología, tabla comparativa, ganador y limitaciones), el aviso de datos simulados y el campo `modelo` de la predicción.

## 19. Historial y pasaporte del viajero

- `GET /historial?filtro=recientes|semana|mes|mas_vistos|populares&pagina=&tamano=` reemplaza la lista de historial del Perfil: junta las visitas repetidas al mismo destino en el mismo día de Colombia ("Visto 3 veces") y pagina. `populares` usa la función nueva `destinos_populares(p_desde, p_limite)` (migración `20261019120000_destinos_populares.sql`, `security definer`), que solo devuelve totales por destino, sin datos personales. `DELETE /historial` borra el historial propio (RLS ya permitía borrar las interacciones propias).
- `GET /me/pasaporte`: destinos **explorados** (con alguna interacción en la app; no significa visitados) sobre el total, favoritos, días activos e insignias por categoría (por ejemplo, 3 cayos o 5 playas) y de avance (Primeros pasos, Medio camino, Isleño), con los destinos que faltan para cada una. Se calcula desde `interaccion` y `favorito`, sin tablas nuevas.
- Perfil: se quitan la lista de historial (queda la fila "Historial"), la fila "Créditos y licencias" (queda el enlace "Créditos" al final, por la atribución obligatoria), la fila "Mis reportes" (ahora es la pestaña "Mis reportes" dentro de "Reportar un problema") y el modo demostración "Pedir inicio de sesión al abrir la app" (código y ajuste local).

**Agregar al entregable**: la pantalla Historial y el Pasaporte del viajero en el diseño de la app, y los endpoints nuevos.

## 20. Ajustes de la interfaz

- Tarjetas de Inicio: sin chips de razones; descripción breve y una sola razón corta (`porQueCorto`, generada en el backend). El detalle completo ("Por qué es para ti", ✓ y ⚠) queda solo en el detalle del lugar. Compatibilidad y ocupación separadas, con un componente de ocupación compartido por Inicio, Explorar y Favoritos.
- Favoritos muestra la ocupación actual: `GET /favoritos` la calcula en lote con el mismo `prediccionService` que Inicio (antes no la calculaba y la app mostraba "Sin datos de ocupación").
- Accesos rápidos de Inicio sin tarjetas: ícono circular plano y texto.
- Botón flotante de regresar (`BotonVolver`) en las pantallas secundarias, con desenfoque esmerilado (expo-blur), dos variantes (sobre imagen y sobre fondo claro) y respaldo a Inicio si no hay historial.

