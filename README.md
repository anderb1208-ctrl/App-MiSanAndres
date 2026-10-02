# MiSanAndrés

App móvil de turismo para San Andrés (Colombia) que recomienda destinos según las preferencias del turista y predice su nivel de ocupación.

## Estructura del repositorio

```
.
├── backend/                  # API REST (Node.js + Express), desplegada en Render
├── mobile/                   # App móvil (React Native + Expo)
├── ml/                       # Modelo de predicción de ocupación (Python + Scikit-learn)
├── supabase/
│   ├── migrations/           # Migraciones SQL versionadas
│   └── seed.sql              # Datos de prueba
└── docs/                     # Documento de diseño (entregable)
    └── referencia-frontend/  # Prototipo visual de referencia (no se importa en la app)
```

## Stack tecnológico

| Capa            | Tecnología                                              |
| --------------- | ------------------------------------------------------- |
| App móvil       | React Native + Expo (Android primero, luego iOS)        |
| Backend         | Node.js + Express — API REST bajo `/v1`                 |
| Base de datos   | Supabase (PostgreSQL)                                   |
| Autenticación   | Supabase Auth (JWT)                                     |
| Machine Learning| Python + Scikit-learn (Random Forest Regressor)         |
| Mapas           | Google Maps Platform                                    |
| Pruebas         | Jest + Supertest (backend)                              |
| Despliegue      | Render (backend)                                        |

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
