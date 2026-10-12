# MiSanAndrés

App móvil de turismo para San Andrés (Colombia) que recomienda destinos según las preferencias del turista y predice su nivel de ocupación.

## Arquitectura

### Cliente-servidor en tres capas

```
┌──────────────────────┐   HTTPS / JSON    ┌──────────────────────┐        ┌──────────────────────┐
│  Presentación        │  API REST  /v1    │  Lógica de negocio   │        │  Datos               │
│  App móvil           │ ────────────────▶ │  Backend Express     │ ─────▶ │  Supabase            │
│  (React Native/Expo) │  Bearer <JWT>     │  (Node.js, Render)   │        │  (PostgreSQL + RLS)  │
└──────────┬───────────┘                   └──────────────────────┘        └──────────▲───────────┘
           │              inicio de sesión y registro (Supabase Auth)                 │
           └──────────────────────────────────────────────────────────────────────────┘
```

1. **Presentación (`mobile/`)**: pantallas, navegación y estado de la sesión. No accede a la base de datos: todos los datos llegan por la API REST. Solo habla directamente con Supabase Auth para iniciar sesión, registrarse y renovar el token.
2. **Lógica de negocio (`backend/`)**: valida las entradas, aplica las reglas (recomendaciones, predicción de ocupación) y responde JSON con errores en un formato consistente.
3. **Datos (Supabase)**: PostgreSQL con las tablas `usuario`, `destino`, `preferencia`, `usuario_preferencia`, `interaccion` y `ocupacion`, y políticas RLS.

**Autenticación:** la app envía el JWT de Supabase en `Authorization: Bearer <token>`. El backend obtiene el usuario **del token** (nunca de un ID enviado por el cliente) y consulta la base con ese mismo token para que se apliquen las políticas RLS. Por eso el backend solo necesita la publishable key, no la secret key.

### Backend en capas

Cada petición atraviesa las capas en un solo sentido; ninguna capa salta a otra:

```
routes → middleware → controllers → services → models → Supabase
```

| Capa | Carpeta | Responsabilidad |
| --- | --- | --- |
| Rutas | `routes/` | Solo asocian método + URL con su middleware y controller. |
| Middleware | `middleware/` | Autenticación (`requerirAuth`), validación con zod (IDs, `fecha` YYYY-MM-DD, `hora` HH:MM, `nivelOcupacion`) y manejo central de errores (400, 401, 404, 500). |
| Controllers | `controllers/` | Leen la petición ya validada, llaman a un service y responden. Sin lógica de negocio ni consultas. |
| Services | `services/` | Lógica de negocio: recomendaciones, predicción, armado de las respuestas. |
| Models | `models/` | Únicos que consultan Supabase (`.from`, `.rpc`). |

La predicción de ocupación vive solo en `services/prediccionService.ts`. En el MVP es un promedio histórico por hora; para usar el modelo de ML (`POST /predict`) basta con reimplementar ese service conservando sus firmas, sin tocar controllers, rutas ni la app.

### Monorepo

Un solo repositorio con un subproyecto independiente por componente (`backend/`, `mobile/` y, más adelante, `ml/`), cada uno con sus dependencias, comandos y `.env.example`. El esquema de la base vive en `supabase/` como migraciones versionadas.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| App móvil | React Native + Expo, TypeScript, React Navigation (Android primero, luego iOS) |
| Backend | Node.js + Express 5, TypeScript, zod — API REST bajo `/v1` |
| Base de datos | Supabase (PostgreSQL) con RLS |
| Autenticación | Supabase Auth (JWT) |
| Pruebas | Jest + Supertest (backend) |
| Despliegue | Render (backend) |
| Machine Learning *(fase posterior)* | Python + Scikit-learn (Random Forest Regressor) |
| Mapas *(fase posterior)* | Google Maps Platform. En el MVP la pestaña Mapa muestra una lista con la ubicación en texto. |

## Estructura del repositorio

```
.
├── backend/                     # API REST (Node.js + Express), desplegada en Render
│   ├── src/
│   │   ├── config/              # Variables de entorno y cliente de Supabase
│   │   ├── routes/              # Definición de endpoints
│   │   ├── middleware/          # Autenticación, validación y errores
│   │   ├── controllers/         # Request / response
│   │   ├── services/            # Lógica de negocio (recomendaciones, predicción)
│   │   ├── models/              # Consultas a Supabase y tipos de la base
│   │   ├── utils/               # Fechas en hora de Colombia, niveles de ocupación, errores
│   │   ├── types/               # Tipos de Express (res.locals)
│   │   ├── tests/               # Pruebas Jest + Supertest (modelos mockeados)
│   │   ├── app.ts               # Configuración de Express
│   │   └── server.ts            # Punto de entrada
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
├── ml/                          # Modelo de predicción de ocupación (fase posterior)
├── supabase/
│   ├── migrations/              # Migraciones SQL versionadas
│   └── seed.sql                 # Datos de prueba de San Andrés
└── docs/
    ├── Entregable2_MiSanAndres.docx  # Documento de diseño (entregable)
    └── cambios-al-diseno.md          # Diferencias entre el diseño y lo implementado
```

## API

Base: `/v1`. Las rutas marcadas con 🔒 requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado del servicio |
| GET | `/destinos` | Destinos con su ocupación actual; filtros `categoria` y `nivelOcupacion` |
| GET | `/destinos/:id` | Detalle de un destino |
| GET | `/ocupacion/:destinoId?fecha=` | Registros de ocupación de un día |
| GET | `/ocupacion/:destinoId/prediccion?fecha=&hora=` | Predicción para una fecha y hora |
| GET | `/ocupacion/:destinoId/prediccion/dia?fecha=` | Ocupación típica por hora de ese día de la semana |
| GET | `/preferencias/catalogo` | Catálogo de preferencias |
| GET / PUT / DELETE | `/preferencias` 🔒 | Preferencias del usuario |
| GET / PUT | `/perfil` 🔒 | Perfil del usuario |
| GET / POST | `/interacciones` 🔒 | Historial y registro de interacciones |
| GET | `/recomendaciones` 🔒 | Recomendaciones personalizadas para ahora |

## Base de datos

- El esquema vive en `supabase/migrations/` como archivos SQL versionados (`AAAAMMDDHHMMSS_descripcion.sql`). Los cambios se hacen siempre con una migración nueva, nunca editando la base a mano.
- `supabase/seed.sql` carga datos de prueba (destinos, catálogo de preferencias y ocupación simulada). **Borra datos: usarlo solo en desarrollo.**
- Las migraciones se aplican con el MCP de Supabase, que registra cada una con la marca de tiempo del momento en que se aplicó. Por eso los números de versión que muestra Supabase **no coinciden** con los de los archivos locales; los nombres y el contenido sí. El orden de los archivos en `supabase/migrations/` es el que manda.
- Los cambios respecto al documento de diseño están en `docs/cambios-al-diseno.md`.

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

Comprobar que responde: abre `http://localhost:3000/v1/health` en el navegador. `backend/requests.http` tiene una petición de ejemplo por endpoint (extensión REST Client de VS Code).

Otros comandos:

```powershell
npm test            # pruebas (Jest + Supertest; no tocan la base de datos)
npm run typecheck   # verificación de tipos
npm run build       # compila a dist/
npm start           # ejecuta dist/ (producción, p. ej. en Render)
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
| `EXPO_PUBLIC_API_URL` | `http://<IP-del-PC>:3000`, **no** `localhost` (en el celular, localhost es el propio celular) |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key. La secret / service role key nunca va en la app. |

3. Escanea el código QR con Expo Go (Android) o con la cámara (iOS).
4. Si cambias el `.env`, reinicia con `npx expo start --clear`.

Verificación de tipos: `npm run typecheck`.

### Problemas frecuentes

- **"No pudimos conectar con el servidor"**: revisa que el backend esté corriendo, que `EXPO_PUBLIC_API_URL` use la IP del PC y que el celular esté en la misma Wi-Fi. Prueba abrir `http://<IP-del-PC>:3000/v1/health` desde el navegador del celular.
- **El registro pide confirmar el correo**: si Supabase tiene activa la confirmación de correo (Authentication → Providers → Email), confirma desde el enlace del correo y luego inicia sesión. Al entrar por primera vez la app lleva a Configurar preferencias.
- **La gráfica no muestra la línea "Real de hoy"**: la ocupación típica del día siempre se muestra; la serie real solo aparece si hay registros de ocupación de hoy (el seed genera datos hasta el momento en que se ejecutó).
