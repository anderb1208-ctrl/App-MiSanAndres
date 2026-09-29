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

## Cómo ejecutar

_Esta sección se completará cuando cada subproyecto esté inicializado._
