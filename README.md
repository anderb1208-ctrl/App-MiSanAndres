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

_Esta sección se completará cuando cada subproyecto esté inicializado._
