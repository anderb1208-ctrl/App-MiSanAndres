# MiSanAndrés

App móvil de turismo para San Andrés (Colombia) que recomienda destinos según las preferencias del turista y predice su nivel de ocupación.

## Arquitectura

### Cliente-servidor en tres capas

```
┌──────────────────────┐   HTTPS / JSON    ┌──────────────────────┐        ┌──────────────────────┐
│  Presentación        │  API REST  /v1    │  Lógica de negocio   │        │  Datos               │
│  App móvil           │ ────────────────▶ │  Backend Express     │ ─────▶ │  Supabase            │
│  (React Native/Expo) │  Bearer <JWT>     │  (Node.js, Render)   │        │  (PostgreSQL + RLS)  │
└──────────┬───────────┘                   └──────────┬───────────┘        └──────────▲───────────┘
           │                                          │ clima por hora                │
           │                                          ▼ (1 consulta por hora, isla)    │
           │                               ┌──────────────────────┐                   │
           │                               │  Open-Meteo          │                   │
           │                               └──────────────────────┘                   │
           │              inicio de sesión y registro (Supabase Auth)                 │
           └──────────────────────────────────────────────────────────────────────────┘
           ▲                                          │ avisos de cierre/reapertura
           │  push remota (FCM en Android,            ▼ (lotes de 100)
           │  APNs en iPhone)              ┌──────────────────────┐
           └────────────────────────────── │  Expo Push API       │
                                           └──────────────────────┘
```

Opcionalmente, el backend llama al **servicio de ML** (`ml/`, `POST /predict/lote` con API key) para la predicción de ocupación; ver [Proveedores de predicción](#proveedores-de-predicción). El servicio usa el **ganador de una comparación de tres modelos** (Ridge, Random Forest y HistGradientBoosting; hoy gana HistGradientBoosting) entrenados con **datos de ocupación simulados** calibrados con datos reales (clima observado, festivos, llegadas oficiales de turistas): ver [`ml/README.md`](ml/README.md) y [`docs/seleccion-de-modelo.md`](docs/seleccion-de-modelo.md).

```
App ──▶ Backend ──▶ Servicio ML (FastAPI)  GET /modelo · POST /predict · POST /predict/lote
                     └─ tres modelos versionados (ml/artefactos/; atiende el ganador)
                        ◀─ entrenado con ml/datos/dataset_ocupacion_san_andres.csv (simulado)
```

1. **Presentación (`mobile/`)**: pantallas, navegación y estado de la sesión. No accede a la base de datos: todos los datos llegan por la API REST. Solo habla directamente con Supabase Auth para iniciar sesión, registrarse y renovar el token.
2. **Lógica de negocio (`backend/`)**: valida las entradas, aplica las reglas (recomendaciones, predicción de ocupación con clima y calendario) y responde JSON con errores en un formato consistente. Consulta el clima a [Open-Meteo](https://open-meteo.com/) (gratis para uso no comercial, sin clave).
3. **Datos (Supabase)**: PostgreSQL con las tablas `usuario` (con `rol`), `destino`, `preferencia`, `destino_preferencia`, `usuario_preferencia`, `interaccion`, `ocupacion`, `clima_hora`, `ticket`, `ticket_comentario`, `favorito`, `dispositivo_push` y `resena`, y políticas RLS.

**Roles:** `turista` (por defecto), `tecnico` y `administrador`. El rol vive en la base, nunca se elige al registrarse y solo lo cambia un administrador. El backend lo lee de la base en cada petición que lo necesita (`requiereRol`, 403 si no alcanza) y RLS lo vuelve a comprobar; la app solo decide qué pestañas mostrar. Detalles en `docs/usuarios-y-roles.md`.

**Autenticación:** la app envía el JWT de Supabase en `Authorization: Bearer <token>`. El backend obtiene el usuario **del token** (nunca de un ID enviado por el cliente) y consulta la base con ese mismo token para que se apliquen las políticas RLS. Por eso el backend solo necesita la publishable key, no la secret key.

### Backend en capas

Cada petición atraviesa las capas en un solo sentido; ninguna capa salta a otra:

```
routes → middleware → controllers → services → models → Supabase
```

| Capa | Carpeta | Responsabilidad |
| --- | --- | --- |
| Rutas | `routes/` | Solo asocian método + URL con su middleware y controller. |
| Middleware | `middleware/` | Autenticación (`requerirAuth`), rol leído de la base (`requiereRol`, 403), validación con zod (IDs, `fecha` YYYY-MM-DD, `hora` HH:MM, `nivelOcupacion`) y manejo central de errores (400, 401, 403, 404, 500, 503). |
| Controllers | `controllers/` | Leen la petición ya validada, llaman a un service y responden. Sin lógica de negocio ni consultas. |
| Services | `services/` | Lógica de negocio: recomendaciones y sus razones (`razonesRecomendacion`), predicción (proveedores heurístico/ML), tickets, administración, favoritos, reseñas, avisos push (`notificaciones/`), clima (`clima/climaService`), calendario (`calendarioService`), armado de las respuestas. |
| Models | `models/` | Únicos que consultan Supabase (`.from`, `.rpc`). |

La predicción de ocupación vive solo en `services/prediccionService.ts`: parte del promedio histórico de esa hora en ese día de la semana y lo ajusta con factores de clima y calendario (ver [Predicción de ocupación](#predicción-de-ocupación)). El cálculo lo hace un `ProveedorPrediccion` intercambiable (heurístico, ML o auto), elegido con `PREDICCION_PROVEEDOR`, sin tocar controllers, rutas ni la app. Del mismo modo, el envío de push pasa por un `ProveedorPush` (Expo Push API por defecto) que se puede reemplazar o simular en las pruebas.

### Monorepo

Un solo repositorio con un subproyecto independiente por componente (`backend/`, `mobile/` y `ml/`), cada uno con sus dependencias, comandos y `.env.example`. El esquema de la base vive en `supabase/` como migraciones versionadas.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| App móvil | React Native + Expo, TypeScript, React Navigation (Android primero, luego iOS) |
| Backend | Node.js + Express 5, TypeScript, zod — API REST bajo `/v1` |
| Base de datos | Supabase (PostgreSQL) con RLS |
| Clima | [Open-Meteo](https://open-meteo.com/) (pronóstico por hora; datos CC BY 4.0) |
| Autenticación | Supabase Auth (JWT) |
| Pruebas | Jest + Supertest (backend) |
| Despliegue | Render (backend) |
| Machine Learning | Python + scikit-learn (Random Forest Regressor) + FastAPI, servicio aparte en `ml/` (hoy entrenado con datos sintéticos) |
| Mapas | react-native-maps: Apple Maps en iPhone (sin clave) y Google Maps en Android. expo-location para la ubicación del usuario. |

## Estructura del repositorio

```
.
├── backend/                     # API REST (Node.js + Express), desplegada en Render
│   ├── src/
│   │   ├── config/              # Entorno, Supabase, factores de la predicción y temporadas
│   │   ├── routes/              # Definición de endpoints
│   │   ├── middleware/          # Autenticación, validación y errores
│   │   ├── controllers/         # Request / response
│   │   ├── services/            # Lógica de negocio (recomendaciones, predicción, calendario)
│   │   │   └── clima/           # ProveedorClima, OpenMeteoProvider y climaService (caché)
│   │   ├── models/              # Consultas a Supabase y tipos de la base
│   │   ├── utils/               # Fechas en hora de Colombia, niveles de ocupación, errores
│   │   ├── types/               # Tipos de Express (res.locals)
│   │   ├── tests/               # Pruebas Jest + Supertest (modelos mockeados)
│   │   ├── app.ts               # Configuración de Express
│   │   └── server.ts            # Punto de entrada
│   ├── public/destinos/         # Fotos de los destinos (servidas en /destinos/<slug>.jpg)
│   ├── scripts/                 # Clima histórico y geolocalización de destinos (OSM)
│   │   └── ubicaciones/         # destinos.json (entrada), ubicaciones.json y tierra.geojson (generados)
│   └── requests.http            # Una petición de ejemplo por endpoint
├── mobile/                      # App móvil (React Native + Expo)
│   └── src/
│       ├── assets/              # Imágenes
│       ├── components/          # Componentes reutilizables
│       ├── screens/             # Pantallas
│       ├── navigation/          # Autenticación → tabs → vistas de detalle
│       ├── services/            # Llamadas a la API y a Supabase Auth
│       ├── store/               # Estado global (sesión)
│       ├── hooks/               # Hooks reutilizables
│       ├── utils/               # Utilidades de formato y validación
│       └── theme/               # Colores, tipografía, espaciado
├── ml/                          # Predicción: datos simulados calibrados, 3 modelos comparados (gana HistGradientBoosting) + FastAPI; ver ml/README.md
├── supabase/
│   ├── migrations/              # Migraciones SQL versionadas
│   ├── seed.sql                 # Datos de prueba de San Andrés (ocupación sintética)
│   └── clima_hora.sql           # Clima real de las últimas 4 semanas (generado)
└── docs/
    ├── Entregable2_MiSanAndres.docx  # Documento de diseño (entregable)
    ├── cambios-al-diseno.md          # Diferencias entre el diseño y lo implementado
    ├── datos-sinteticos.md           # Supuestos de la ocupación sintética
    ├── datos-por-verificar.md        # Datos de los destinos que hay que confirmar
    ├── seleccion-de-modelo.md        # Metodología y resultados de la comparación de modelos (para el entregable)
    ├── revision-ubicaciones.html     # Mapa para revisar y corregir las ubicaciones (doble clic)
    └── creditos-imagenes.md          # Autor y licencia de las fotos
```

## API

Base: `/v1`. Las rutas marcadas con 🔒 requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servicio |
| GET | `/destinos` | Destinos con su ocupación actual; búsqueda `q` y filtros `categoria` y `nivelOcupacion` |
| GET | `/destinos/:id` | Detalle de un destino |
| GET | `/destinos/:id/clima?horas=` | Clima actual y de las próximas horas en el destino |
| GET | `/clima?horas=` | Clima del centro de la isla |
| GET | `/mapa` | Todos los destinos con coordenadas, foto y ocupación de ahora, en una sola llamada |
| GET | `/ocupacion/:destinoId?fecha=` | Registros de ocupación de un día |
| GET | `/ocupacion/:destinoId/prediccion?fecha=&hora=` | Predicción para una fecha y hora, con el clima usado y los factores aplicados |
| GET | `/ocupacion/:destinoId/prediccion/dia?fecha=` | Ocupación típica por hora de ese día de la semana |
| GET | `/preferencias/catalogo` | Catálogo de preferencias |
| GET / PUT / DELETE | `/preferencias` 🔒 | Preferencias del usuario |
| GET / PUT | `/perfil` 🔒 | Perfil del usuario |
| GET / POST | `/interacciones` 🔒 | Historial y registro de interacciones |
| GET | `/historial?filtro=&pagina=&tamano=` 🔒 | Historial con filtros (`recientes`, `semana`, `mes`, `mas_vistos`, `populares`), visitas repetidas juntadas y paginación |
| DELETE | `/historial` 🔒 | Borrar el historial propio |
| GET | `/recomendaciones?fecha=&hora=&presupuestoMin=&presupuestoMax=` 🔒 | Recomendaciones personalizadas con `razones` (✓/⚠), `porQue` y `porQueCorto` (una línea para las tarjetas); hora planeada y filtro rápido de presupuesto opcionales |
| GET | `/me` 🔒 | Usuario del token con su rol |
| GET | `/me/pasaporte` 🔒 | Pasaporte del viajero: destinos explorados, favoritos, días activos e insignias |
| GET | `/destinos/:id/resenas` | Reseñas visibles y promedio |
| GET / PUT / DELETE | `/destinos/:id/resena` 🔒 | Reseña propia (una por destino) |
| GET / POST | `/favoritos` 🔒 | Favoritos con sus avisos y la ocupación de ahora de cada destino |
| PATCH / DELETE | `/favoritos/:idDestino` 🔒 | Cambiar los avisos o quitar el favorito |
| POST / DELETE | `/dispositivos` 🔒 | Registrar o desasociar el token push del teléfono |
| GET / POST | `/tickets` 🔒 | Reportes de soporte (el turista ve los suyos; el personal, todos) |
| GET / PATCH | `/tickets/:id` 🔒 | Detalle; gestionar estado, prioridad y técnico (técnico o administrador) |
| POST | `/tickets/:id/comentarios` 🔒 | Comentar un ticket |
| GET | `/admin/usuarios` 🔒 administrador | Usuarios con su rol |
| PATCH | `/admin/usuarios/:id/rol` 🔒 administrador | Cambiar un rol |
| GET | `/admin/metricas` 🔒 administrador | Métricas del panel |
| GET / POST | `/admin/destinos` 🔒 administrador | Destinos (incluye ocultos) y crear |
| PATCH | `/admin/destinos/:id` 🔒 administrador | Editar u ocultar |
| PATCH | `/admin/destinos/:id/estado` 🔒 administrador | Abrir / cerrar temporalmente con motivo; avisa por push |
| GET | `/admin/destinos/:id/resenas` 🔒 administrador | Reseñas, también las ocultas |
| PATCH | `/admin/resenas/:id` 🔒 administrador | Ocultar o mostrar una reseña |

## Base de datos

- El esquema vive en `supabase/migrations/` como archivos SQL versionados (`AAAAMMDDHHMMSS_descripcion.sql`). Los cambios se hacen siempre con una migración nueva, nunca editando la base a mano.
- `supabase/seed.sql` carga datos de prueba (destinos, catálogo de preferencias y ocupación simulada). **Borra datos: usarlo solo en desarrollo.**
- Las migraciones se aplican con el MCP de Supabase, que registra cada una con la marca de tiempo del momento en que se aplicó. Por eso los números de versión que muestra Supabase **no coinciden** con los de los archivos locales; los nombres y el contenido sí. El orden de los archivos en `supabase/migrations/` es el que manda.
- `supabase/clima_hora.sql` carga el clima real por hora de las últimas 4 semanas (datos para entrenar el modelo). Se regenera con `npm run clima:historico` en `backend/`; el orden de carga está en `docs/datos-sinteticos.md`.
- Los cambios respecto al documento de diseño están en `docs/cambios-al-diseno.md`.

## Predicción de ocupación

1. **Base**: promedio histórico de la ocupación a esa hora en ese día de la semana (si hay al menos 3 registros; si no, el del tipo de día).
2. **Variables** (`services/featuresPrediccion.ts`, `FeaturesPrediccion`): hora, día de la semana, fin de semana, festivo, puente, temporada y clima. Son las mismas que recibirá el modelo de ML.
3. **Factores** multiplicativos, todos en `config/factoresPrediccion.ts`: lluvia probable (baja playas, cayos y actividades; sube un poco restaurantes y cultura), tormenta, festivo, puente y temporada alta. El resultado se limita a 0–100 % y se clasifica en Bajo / Medio / Alto. Fuera del horario del destino la respuesta es "Cerrado".

**Calendario** (`calendarioService`, sin API externa): festivos de Colombia calculados con la Ley 51 de 1983 (Ley Emiliani), incluidos los que dependen de la Pascua; puentes (bloques de 3 o más días no laborales) y temporadas. Las fechas de temporada alta son **configurables** en `config/calendario.ts`: 15 dic – 15 ene, Semana Santa, 15 jun – 15 jul y el receso escolar de octubre (del sábado anterior a la semana de receso hasta el lunes festivo del 12 de octubre). `ml/calendario.py` aplica las mismas reglas.

**Clima** (`services/clima/`): la interfaz `ProveedorClima` aísla al proveedor; `OpenMeteoProvider` pide temperatura, probabilidad de precipitación, precipitación, código WMO y viento por hora (zona `America/Bogota`), con un timeout de 6 s por intento. San Andrés mide unos 12 km, así que `climaService` hace **una sola consulta para toda la isla** (el centro, 1 día atrás y 16 adelante, por hora) y la guarda en memoria **60 minutos**, compartida por todos los destinos y todas las peticiones; si varias llegan a la vez con la caché vencida, sale una sola consulta y las demás esperan. Ante un timeout, error de red o HTTP 5xx reintenta con espera creciente (`CLIMA_TIMEOUT_MS`, `CLIMA_REINTENTOS`); un 429 solo se reintenta si `Retry-After` es corto. Si aun así falla, sirve el **último pronóstico bueno** (hasta 24 h) marcado `desactualizado`, y no vuelve a consultar durante 1, 2, 4… minutos (desde 5 tras un 429; máximo 30; o lo que pida `Retry-After`), registrando el motivo en el log (`[clima] Open-Meteo falló (…)`). Las peticiones se identifican con un User-Agent con el nombre de la app y el repositorio. Sin clima, la predicción sigue funcionando y `motivoSinClima` dice por qué: `fuera_de_rango`, `sin_datos`, `no_configurado`, `timeout`, `error_red`, `limite_excedido`, `error_http` o `respuesta_invalida`. Ese motivo solo aparece si no hay ningún pronóstico guardado. `GET /v1/health` incluye el estado del clima, su última falla, el próximo intento y `consultasUltimaHora`.

> Open-Meteo gratuito limita las peticiones **por IP**. En el plan gratuito de Render la IP de salida es compartida con otros servicios, así que puede responder 429 (`limite_excedido`) aunque nuestra app haga pocas consultas. Si pasa, la solución es una clave de su API comercial (`OPEN_METEO_URL` y `OPEN_METEO_API_KEY`) o un plan de Render con IP propia.

### Proveedores de predicción

El porcentaje lo calcula un proveedor intercambiable (`backend/src/services/prediccion/`), elegido con `PREDICCION_PROVEEDOR`:

| Valor | Qué hace |
| --- | --- |
| `heuristico` (por defecto) | Promedio histórico + factores (lo descrito arriba). No necesita nada más. |
| `ml` | Servicio de `ml/` (el ganador de la comparación, hoy HistGradientBoosting; `POST /predict/lote`). Si no responde, la predicción da 503. |
| `auto` | Servicio de `ml/` y, si falla o tarda más de `ML_TIMEOUT_MS`, el heurístico; la API no se rompe. |

Cada predicción indica `proveedor`, `modelo` (el que respondió: "HistGradientBoosting", "promedio histórico"…), `proveedorRespaldo`, `origenDatos` y `datosSimulados`; la app lo muestra en el detalle como "Estimado con HistGradientBoosting · datos simulados". Cómo entrenar, desplegar y pasar a datos reales: [`ml/README.md`](ml/README.md).

### Atribución del clima

Los datos del clima son de **[Open-Meteo.com](https://open-meteo.com/)**, con licencia [Creative Commons Attribution 4.0 (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). La API es gratuita para uso no comercial (hasta 10.000 llamadas al día) y no requiere clave. La app muestra "Datos del clima: Open-Meteo.com (CC BY 4.0)" con enlace en el detalle de cada destino y en el resumen del clima de Inicio. Los datos se usan sin modificar, salvo el redondeo para mostrarlos.

## Ubicación de los destinos (OpenStreetMap)

**Convención:** `latitud` y `longitud` son el **punto de acceso**, siempre en tierra: playas, el acceso desde la calle o el paseo; cayos, el muelle o punto de desembarque; restaurantes, la entrada; actividades, el punto de encuentro o embarque; naturaleza y cultura, la entrada. Cada destino guarda además `ubicacion_fuente` (`osm`, `manual` o `aproximada`) y `ubicacion_verificada`.

### Atribución de OpenStreetMap

Las ubicaciones se calculan con datos de **[OpenStreetMap](https://www.openstreetmap.org/copyright)** (© colaboradores de OpenStreetMap), disponibles bajo la [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/). Se consultan con [Nominatim](https://nominatim.org/) y la [API de Overpass](https://overpass-api.de/) respetando sus políticas de uso (User-Agent identificable, máximo 1 petición por segundo a Nominatim, una sola consulta a Overpass guardada en caché). `backend/scripts/ubicaciones/tierra.geojson` (contorno de la isla y los cayos) es una base de datos derivada de OpenStreetMap y queda bajo la misma licencia ODbL. La app muestra la atribución en **Perfil → Créditos y licencias**.

### Agregar un destino y geolocalizarlo

1. Crea el destino en la base con una migración (y en `supabase/seed.sql`), con una coordenada aproximada.
2. Agrégalo a `backend/scripts/ubicaciones/destinos.json`: `nombre` (igual al de la tabla), `categoria`, `aprox` y, si en OpenStreetMap tiene otro nombre, los términos en `buscar` (`[]` si no existe en OSM). Opcionales: `tipos` (tipos de OSM aceptados), `cerca` (lugar de referencia para elegir la parte de una playa larga), `mismoLugarQue` y `nota`. No hace falta tocar código.
3. Geolocaliza (desde `backend/`):

   ```powershell
   npm run ubicaciones:geolocalizar               # usa la caché de Overpass
   npm run ubicaciones:geolocalizar -- --overpass # vuelve a descargar los datos de OSM
   ```

   Busca cada lugar en Nominatim dentro del cuadro de San Andrés, calcula el punto de acceso según la categoría, comprueba que cae en tierra (si cae en el agua lo lleva a la tierra más cercana) y asigna una confianza (alta, media o baja). Si OSM no tiene el lugar, deja la coordenada aproximada con confianza baja. Los destinos ya verificados a mano se conservan (salvo `--incluir-verificados`). Genera una migración en `supabase/migrations/`, actualiza el seed, la tabla de `docs/datos-por-verificar.md` y la página de revisión.
4. Aplica la migración generada en Supabase.

### Revisar y corregir

1. Abre `docs/revision-ubicaciones.html` con doble clic (necesita internet para el mapa). Los marcadores tienen el color de su confianza; arrástralos al punto de acceso correcto o márcalos como revisados. La capa satelital ayuda a ver muelles y entradas.
2. Pulsa **Copiar correcciones** y guarda el texto como `correcciones.json` (o usa **Descargar JSON**).
3. Aplica (desde `backend/`): `npm run ubicaciones:corregir -- ruta/correcciones.json`. Los destinos incluidos quedan como `manual` y verificados; genera la migración y actualiza el seed y la página. Rechaza puntos en el agua o fuera del cuadro.
4. Aplica la migración en Supabase y comprueba con `npm run verificar:ubicaciones`, que falla si algún destino activo cae fuera de tierra o fuera del cuadro de San Andrés (`-- --local` revisa `ubicaciones.json` sin conectarse a la base).

## Fotos de los destinos

Las 30 fotos están en `backend/public/destinos/<slug>.jpg` (JPEG de ~1000 px) y el backend las sirve en `/destinos/<slug>.jpg` con caché de un día. `imagen_url` guarda la ruta relativa y la app la completa con `EXPO_PUBLIC_API_URL`. El detalle muestra "Foto: autor · licencia" o, para las imágenes de referencia con licencia *sin verificar*, "Imagen de referencia"; si una foto no carga, aparece el placeholder de la categoría. Créditos completos en `docs/creditos-imagenes.md`.

**Reemplazar una foto:** sustituye el archivo en `backend/public/destinos/` por uno nuevo **con el mismo nombre** (JPEG, ~1000 px de ancho) y despliega el backend; no hace falta tocar la base. Luego actualiza el autor y la licencia (`backend/scripts/imagenes/creditos.json`, `docs/creditos-imagenes.md` y una migración para `imagen_autor`, `imagen_licencia` e `imagen_fuente`).

## Cómo ejecutar

Pasos para Windows 10/11 con PowerShell. El backend y la app corren en el mismo PC y el celular se conecta por la red local.

### Requisitos

- [Node.js](https://nodejs.org) 20 o superior (`node -v`).
- La app **Expo Go** en el celular (Play Store / App Store), conectado a la **misma red Wi-Fi** que el PC.
- Un proyecto de Supabase con las migraciones de `supabase/migrations/` aplicadas y, para desarrollo, `supabase/seed.sql` cargado.

### 1. Backend (API REST)

```powershell
cd backend
npm install
Copy-Item .env.example .env   # solo la primera vez; luego completa los valores
npm run dev                   # http://localhost:3000/v1 (se reinicia al guardar)
```

Variables de `backend/.env` (ver `backend/.env.example`):

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto (Supabase → Settings → API) |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`). El backend **no** usa la secret key: reenvía el JWT del usuario para que se aplique RLS. |
| `PORT` | Puerto HTTP (por defecto `3000`) |
| `CORS_ORIGIN` | Orígenes permitidos separados por coma; vacío = cualquiera (desarrollo) |
| `NODE_ENV` | `development` (por defecto) o `production` |
| `PREDICCION_PROVEEDOR` | `heuristico` (por defecto), `ml` o `auto` |
| `ML_SERVICE_URL`, `ML_API_KEY` | URL del servicio de `ml/` y su API key; obligatorias solo con `ml` o `auto` |
| `ML_TIMEOUT_MS` | Espera máxima al servicio de ML (por defecto 2500) |
| `ORIGEN_DATOS_HISTORICOS` | `sintetico` (por defecto) o `real`: origen de la tabla `ocupacion` que usa el heurístico |
| `EXPO_ACCESS_TOKEN` | Opcional. Solo si activas "Enhanced Security for Push Notifications" en Expo |
| `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD` | **Solo para el script local** `npm run usuarios:demo`; no van en Render. `DEMO_PASSWORD` se define en la terminal, no en el archivo |

Comprobar que responde: abre `http://localhost:3000/v1/health` en el navegador. `backend/requests.http` tiene una petición de ejemplo por endpoint (extensión REST Client de VS Code).

Otros comandos:

```powershell
npm test            # pruebas (Jest + Supertest; no tocan la base de datos)
npm run typecheck   # verificación de tipos
npm run build       # compila a dist/
npm start           # ejecuta dist/ (producción, p. ej. en Render)
npm run verificar:ubicaciones   # todos los destinos activos en tierra y en el cuadro de San Andrés
```

La primera vez que Windows pregunte, permite a Node.js en **redes privadas** en el Firewall; si no, el celular no podrá llegar a la API.

### 2. App móvil (Expo)

1. Averigua la IP local del PC: `ipconfig` → "Dirección IPv4" del adaptador Wi-Fi (por ejemplo `192.168.1.50`).
2. Configura y arranca la app:

```powershell
cd mobile
npm install
Copy-Item .env.example .env   # solo la primera vez; luego completa los valores
npx expo start
```

Variables de `mobile/.env` (ver `mobile/.env.example`):

| Variable | Valor |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | URL del backend, sin barra final ni `/v1`: `https://app-misanandres.onrender.com` (Render) o `http://<IP-del-PC>:3000` para el backend local (**no** `localhost`: en el celular, localhost es el propio celular) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key. La secret / service role key nunca va en la app. |
| `GOOGLE_MAPS_API_KEY` | Opcional. Clave de Google Maps SDK for Android, solo para builds propios de Android (ver [Mapa](#mapa)). Vacía en desarrollo con Expo Go. |
| `EAS_PROJECT_ID` | Opcional. Id del proyecto de EAS (`npx eas init`); lo necesitan las push remotas (ver [Notificaciones](#notificaciones)). |

3. Escanea el código QR con Expo Go (Android) o con la cámara (iOS).
4. Si cambias el `.env`, reinicia con `npm run start:limpio` (`npx expo start --clear`). Expo **incrusta** las variables `EXPO_PUBLIC_*` en el bundle; sin limpiar la caché, la app sigue usando el valor anterior. En desarrollo la app imprime la URL de la API al arrancar y la muestra al final de **Perfil**; la configuración está centralizada en `mobile/src/config/env.ts` y, si falta una variable, la app lo dice en vez de usar otra URL.

Verificación de tipos: `npm run typecheck`.

### 3. Servicio de ML (opcional)

Python 3.11. Ver [`ml/README.md`](ml/README.md).

```powershell
cd ml
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m misanandres_ml.datos.generar_dataset_simulado    # dataset SIMULADO calibrado con datos reales (~5 s, sin internet)
python -m misanandres_ml.datos.calidad_dataset             # chequeos de coherencia → reportes/calidad_dataset.md
python entrenar_modelo.py --comparar  # compara Ridge, Random Forest y HistGradientBoosting y guarda al ganador
uvicorn app:app --port 8000           # necesita ML_API_KEY en ml/.env
pytest
```

En el backend: `PREDICCION_PROVEEDOR=auto`, `ML_SERVICE_URL=http://localhost:8000` y la misma `ML_API_KEY`. El modelo ganador está versionado, así que el servicio arranca sin entrenar.

### Pruebas y tipos

| Carpeta | Pruebas | Tipos |
| --- | --- | --- |
| `backend/` | `npm test` (Jest + Supertest) | `npm run typecheck` |
| `mobile/` | `npm test` (Jest con jest-expo, lógica de pantallas) | `npm run typecheck` |
| `ml/` | `pytest` | — |

### Mapa

La pestaña **Mapa** usa `react-native-maps`:

| Plataforma | Proveedor | Clave |
| --- | --- | --- |
| iPhone | Apple Maps (proveedor por defecto) | No necesita. Funciona en Expo Go. |
| Android, en Expo Go | Google Maps | No necesita: Expo Go trae su propia configuración. |
| Android, build propio (EAS) | Google Maps (`PROVIDER_GOOGLE`, solo en Android) | `GOOGLE_MAPS_API_KEY` |

La configuración vive en `mobile/app.config.ts` (reemplaza a `app.json`). Lee la clave de `process.env.GOOGLE_MAPS_API_KEY` y la pasa al plugin de react-native-maps solo para Android. **La clave nunca se escribe en el repositorio.** El botón "Cómo llegar" del detalle abre la **ubicación** del destino (un pin con su nombre), no una ruta: en iPhone ofrece Apple Maps (`https://maps.apple.com/?ll=LAT,LNG&q=NOMBRE`) o Google Maps (enlace universal `https://www.google.com/maps/search/?api=1&query=LAT,LNG`, que abre la app o el navegador); en Android abre la app de mapas con `geo:LAT,LNG?q=LAT,LNG(NOMBRE)`. Ninguno necesita clave y todos funcionan en Expo Go.

**Crear la clave (Google Cloud Console):**

1. En un proyecto de Google Cloud, habilita **Maps SDK for Android**.
2. Crea una clave de API (APIs y servicios → Credenciales).
3. Restríngela: tipo de aplicación **Android**, paquete `com.misanandres.app` y la huella **SHA-1** del certificado de firma. Con EAS se obtiene con `eas credentials` (Android → Keystore). Si publicas en Google Play, agrega también la SHA-1 de "App signing" de Play Console.
4. En "Restricciones de API", permite solo **Maps SDK for Android**.

**Usarla en EAS Build** (variable secreta, no visible en los registros):

```powershell
cd mobile
eas env:create --name GOOGLE_MAPS_API_KEY --value "<tu-clave>" --environment development --environment preview --environment production --visibility secret
eas build --platform android --profile preview
```

Durante el build, EAS expone la variable a `app.config.ts`. Para un build local (`npx expo run:android`), pon la clave en `mobile/.env` (`GOOGLE_MAPS_API_KEY=...`); ese archivo nunca se sube.

**Ubicación:** se pide solo en primer plano, con el texto en español definido en `app.config.ts` (en Expo Go, iOS muestra el texto de Expo Go). Si el permiso se niega, el mapa y la lista funcionan igual y la lista se ordena por nombre.

### Usuarios de demostración y roles

Requiere `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `backend/.env` (solo en tu PC, nunca en Render ni en la app):

```powershell
cd backend
$env:DEMO_PASSWORD="<contraseña de 8+ caracteres>"
npm run usuarios:demo     # turista@, tecnico@ y admin@misanandres.test, con su rol
Remove-Item Env:DEMO_PASSWORD
```

Las contraseñas nunca se guardan en el repositorio. Para promover a mano a un usuario existente, ver `docs/usuarios-y-roles.md`.

### Notificaciones

| Tipo | Para qué | Expo Go (SDK 57) | Build propio (EAS) |
| --- | --- | --- | --- |
| **Locales** | Apertura y cierre del horario normal de los favoritos (próximos 7 días, máx. 60) | Android e iPhone | Sí |
| **Push remotas** | Cierre temporal o reapertura enviados por el administrador | **Solo iPhone**. En Android, Expo Go no recibe push remotas desde SDK 53: hace falta un development build | Android (FCM) e iPhone (APNs, cuenta paga de Apple Developer) |

Para las push remotas: `npx eas init` (crea el proyecto y su id), poner `EAS_PROJECT_ID` en `mobile/.env`, y en un build propio configurar las credenciales de FCM (Android) y APNs (iPhone) con `eas credentials`. Sin `EAS_PROJECT_ID`, sin permiso o en Expo Go Android, la app sigue funcionando con avisos locales e informa el motivo en la hoja de Alertas. Perfil → "Probar notificación" programa un aviso local a 5 segundos.

### Presupuesto y reseñas

Los precios por persona de los destinos son **estimados** (`docs/datos-por-verificar.md`) y la app los marca así. El presupuesto se define en Preferencias o como filtro rápido en Inicio, con una barra de rango en JS puro (funciona en Expo Go). No hay reseñas de ejemplo: la razón "Buena calificación" solo aparece con 3 o más reseñas reales.

### Problemas frecuentes

- **Mapa gris en Android con un build propio**: falta `GOOGLE_MAPS_API_KEY` en el build o la restricción de la clave no coincide con el paquete o la SHA-1. Tras 10 segundos la pantalla ofrece la lista como respaldo.

- **La app sigue usando la IP local aunque el `.env` tiene la URL de Render**: el bundle quedó con el valor anterior. Detén Expo y arranca con `npm run start:limpio`; revisa también que `mobile/.env` no tenga dos líneas `EXPO_PUBLIC_API_URL` (vale la última). La consola de Metro y Perfil muestran la URL que está usando la app.
- **"No pudimos conectar con el servidor"**: revisa que el backend esté corriendo, que `EXPO_PUBLIC_API_URL` use la IP del PC y que el celular esté en la misma Wi-Fi. Prueba abrir `http://<IP-del-PC>:3000/v1/health` desde el navegador del celular.
- **El registro pide confirmar el correo**: si Supabase tiene activa la confirmación de correo (Authentication → Providers → Email), confirma desde el enlace del correo y luego inicia sesión. Al entrar por primera vez la app lleva a Configurar preferencias.
- **La gráfica no muestra la línea "Real de hoy"**: la ocupación típica del día siempre se muestra; la serie real solo aparece si hay registros de ocupación de hoy (el seed genera datos hasta el momento en que se ejecutó).
