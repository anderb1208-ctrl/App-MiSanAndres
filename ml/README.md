# Servicio de predicción de ocupación (ML)

Predice el **porcentaje de ocupación** de un destino de San Andrés para una fecha y hora, con un `RandomForestRegressor` de scikit-learn, y lo expone como servicio HTTP (FastAPI) que consume el backend.

> ⚠ **Hoy el modelo se entrena con datos SINTÉTICOS** (simulados): no existen todavía mediciones reales de ocupación. Las predicciones son una demostración del sistema, no reflejan la afluencia real. El servicio lo indica en cada respuesta (`origen_modelo: "mock"`, `mensaje_origen: "Estimación basada en datos simulados"`). Cuando lleguen datos reales, el cambio es poner un archivo y correr dos comandos: ver [Cómo pasar a datos reales](#cómo-pasar-a-datos-reales).

## Instalación

Requiere Python 3.11 o superior.

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # en macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env         # opcional: DATASET, ML_API_KEY y Supabase
```

## Orden de ejecución

```powershell
python exportar_destinos.py      # 1. destinos de Supabase → datos/destinos.csv (o el respaldo)
python generar_mock_dataset.py   # 2. dataset SINTÉTICO → datos/mock/dataset_ocupacion_san_andres.csv
python validar_dataset.py        # 3. revisa el dataset (código 1 si hay errores)
python entrenar_modelo.py        # 4. entrena, compara con el baseline y guarda modelo + reporte
uvicorn app:app --port 8000      # 5. servicio HTTP (necesita ML_API_KEY)
pytest                           # pruebas
```

`preparar_dataset.py` lo usan el entrenamiento y la API; también se puede correr para ver las features construidas.

Todos los scripts aceptan `--dataset mock|real`; si no se indica, usan la variable `DATASET` (de `ml/.env` o del entorno) y, si tampoco está, `mock`.

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `config.py` | Rutas, columnas, `DATASET` (mock/real), hiperparámetros y umbrales de nivel |
| `calendario.py` | Festivos de Colombia (Ley Emiliani), puentes y temporada: copia fiel de `calendarioService` del backend |
| `comun.py` | Lectura de destinos y del dataset, horario de atención |
| `exportar_destinos.py` | Destinos de Supabase a CSV, con respaldo versionado `datos/destinos_respaldo.csv` |
| `generar_mock_dataset.py` | Ocupación horaria **sintética** y reproducible (semilla 42) para todos los destinos |
| `validar_dataset.py` | Columnas, vacíos, rangos, capacidad, duplicados, horario, calendario y cobertura |
| `preparar_dataset.py` | Limpieza, features y pipeline (codificación + modelo) |
| `entrenar_modelo.py` | Validación temporal, baseline, métricas, modelo y reporte |
| `cargar_datos_reales.py` | Valida y normaliza el archivo real; opcionalmente lo sube a Supabase |
| `app.py` | API FastAPI: `/health`, `/predict`, `/predict/lote` |
| `datos/` | Plantilla y guía de datos reales; los CSV generados no se suben a git |
| `modelos/`, `reportes/` | Modelo entrenado (joblib + JSON de metadatos) y reportes en Markdown (no se suben) |

## Dataset

`dataset_ocupacion_san_andres.csv`, una fila por destino y hora de atención:

| Columna | Tipo | Equivale en el backend (`FeaturesPrediccion`) |
| --- | --- | --- |
| `fecha_hora` | Fecha y hora local de Colombia (`2026-03-14T15:00:00-05:00`) | `ocupacion.fecha_hora` |
| `id_destino` | Entero | id del destino |
| `hora` | 0–23 | `hora` |
| `dia_semana` | 1 = lunes … 7 = domingo | `diaSemana` |
| `es_fin_de_semana`, `es_festivo`, `es_puente` | true/false | `esFinDeSemana`, `esFestivo`, `esPuente` |
| `temporada` | `alta` / `normal` | `temporada` |
| `temperatura` (°C), `precipitacion` (mm), `viento` (km/h) | Número (puede faltar) | `clima.temperatura`, `clima.precipitacion`, `clima.viento` |
| `cantidad_personas` | Entero ≥ 0, ≤ capacidad | — (objetivo alternativo) |
| `porcentaje_ocupacion` | 0–100 | **objetivo** |

El modelo usa además la **categoría** y la **capacidad** del destino (de `datos/destinos.csv`) y la hora en forma cíclica. La API recalcula el calendario a partir de la fecha, con las mismas reglas del backend, así que el cliente solo envía destino, fecha, hora y (opcional) clima. `probLluvia` y `codigoClima` del backend no se usan: el modelo se entrena con lo que se puede medir en todos los datasets.

### Supuestos del dataset sintético

Los mismos de `supabase/seed.sql` (ver `docs/datos-sinteticos.md`): curva por categoría (playas al mediodía, cayos de 9 a 16, restaurantes al almuerzo y la cena…), fines de semana (+10 % a +30 %), festivos (+25 %), puentes (+10 %), temporada alta (+20 %), lluvia (−20 % a −75 % al aire libre, +10 % a +15 % en restaurantes y cultura), popularidad por destino y ruido ±10 %. El clima también es simulado (temporada seca de enero a abril, lluviosa de junio a noviembre). Rango por defecto: 1 oct 2025 – 30 sep 2026 (un año, para cubrir todas las temporadas).

## Modelo y métricas

- `RandomForestRegressor(n_estimators=100, random_state=42)`, con `min_samples_leaf=20` para que el archivo pese ~11 MB (cabe en un Web Service pequeño) sin perder precisión apreciable.
- **Validación temporal**: entrena con el 80 % más antiguo de las fechas y prueba con el 20 % más reciente; nunca mezcla fechas al azar.
- **Baseline**: promedio histórico del entrenamiento por destino y hora (el enfoque del predictor heurístico del backend, sin factores).
- Se guardan `modelos/modelo_ocupacion.joblib` (pipeline + destinos + metadatos) y `modelos/modelo_ocupacion.json` con: fecha, origen de los datos (`mock`/`real`), `datos_sinteticos`, métricas, columnas, semanas por destino, advertencias y `listo_para_produccion`.
- `listo_para_produccion` solo es `true` con datos **reales**, al menos **4 semanas por destino** y si el modelo supera al baseline.

Última corrida con el dataset **sintético** (prueba: 20 jul – 30 sep 2026, 20.440 filas):

| | MAE (puntos %) | RMSE | R² |
| --- | --- | --- | --- |
| Random Forest | 2,78 | 4,11 | 0,971 |
| Baseline (promedio por destino y hora) | 6,53 | 9,24 | 0,856 |

Con datos sintéticos el modelo solo aprende los supuestos con los que se generaron: estas cifras muestran que el sistema funciona, no la precisión que tendrá con datos reales.

## API

Todas las rutas de predicción exigen la cabecera `X-API-Key` con el valor de `ML_API_KEY`. Los niveles usan los mismos cortes del backend: **Bajo < 40 %**, **Medio 40–70 %**, **Alto > 70 %**. Fuera del horario del destino la respuesta es `estado: "Cerrado"` con 0 %.

```powershell
curl http://localhost:8000/health

curl -X POST http://localhost:8000/predict -H "X-API-Key: <clave>" -H "Content-Type: application/json" `
  -d '{"id_destino": 5, "fecha": "2026-12-26", "hora": "12:00", "clima": {"temperatura": 29, "precipitacion": 0, "viento": 20}}'
```

Respuesta:

```json
{
  "id_destino": 5, "fecha": "2026-12-26", "hora": "12:00", "estado": "Abierto",
  "porcentaje": 100.0, "nivel": "Alto", "personas_estimadas": 800,
  "origen_modelo": "mock", "datos_sinteticos": true,
  "mensaje_origen": "Estimación basada en datos simulados",
  "version_modelo": "2026-10-15T19:36:15+00:00", "listo_para_produccion": false
}
```

`POST /predict/lote` recibe `{"consultas": [ ... ]}` (hasta 500) y devuelve `resultados` con el mismo origen. Errores: `401` sin clave o clave incorrecta, `404` destino desconocido, `422` datos inválidos, `503` sin modelo entrenado (`MODELO_NO_ENTRENADO`) o sin `ML_API_KEY` configurada. Si el archivo del modelo cambia, se recarga en la siguiente petición.

## Cómo reemplazar el dataset mock por uno real

No hay que cambiar código: el dataset real va en otra ruta (`datos/procesado_real/`) y se elige con `--dataset real` o `DATASET=real`. El mock se puede seguir regenerando para pruebas. Los pasos están abajo.

## Cómo pasar a datos reales

1. Consigue el archivo con la entidad que mide la ocupación. Entrégale `datos/plantilla_ocupacion_real.csv` y `datos/LEEME_DATOS.md` (explica columnas, unidades, frecuencia y cantidad mínima de datos). Lo mínimo: `fecha_hora`, `id_destino` y `cantidad_personas`.
2. Borra las 2 filas de `EJEMPLO` si el archivo se armó sobre la plantilla (si no, se rechaza).
3. Copia el CSV en **`ml/datos/real/`** (esa carpeta no se sube a git).
4. Revísalo y normalízalo:
   ```powershell
   python cargar_datos_reales.py
   ```
   Valida, calcula lo que falte (calendario, porcentaje), muestra filas, rango de fechas, cobertura por destino y vacíos, y guarda `datos/procesado_real/dataset_ocupacion_san_andres.csv`. Si hay errores, dice en qué filas.
5. (Opcional) Guárdalo también en la base, marcado como real: aplica antes la migración `supabase/migrations/20261015120000_ocupacion_origen.sql`, pon `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `ml/.env` y corre `python cargar_datos_reales.py --subir-a-supabase` (pide confirmación; reemplaza la fila sintética de la misma hora por la real).
6. Entrena con los datos reales:
   ```powershell
   python entrenar_modelo.py --dataset real
   ```
   Si algún destino tiene menos de 4 semanas de datos, lo advierte y el modelo **no** queda `listo_para_produccion`.
7. Para que todo use los datos reales por defecto, pon `DATASET=real` en `ml/.env` (y en Render).
8. Publica el modelo (ver despliegue) y comprueba en `GET /health` que `origen_modelo` sea `"real"`. Desde ese momento el backend deja de mostrar "estimación basada en datos simulados".

## Despliegue en Render

Un **Web Service separado** del backend:

| Campo | Valor |
| --- | --- |
| Root Directory | `ml` |
| Runtime | Python 3 (fija la versión con la variable `PYTHON_VERSION=3.11.9`) |
| Build Command | `pip install -r requirements.txt && python exportar_destinos.py && python generar_mock_dataset.py && python entrenar_modelo.py` |
| Start Command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |

Variables de entorno:

| Variable | Valor |
| --- | --- |
| `ML_API_KEY` | Clave larga y aleatoria (la misma que `ML_API_KEY` del backend) |
| `DATASET` | `mock` (hasta tener datos reales) |
| `PYTHON_VERSION` | `3.11.9` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Opcionales: para exportar los destinos actuales en el build (sin ellas usa el respaldo) |

El build genera el dataset sintético y entrena el modelo (~1–2 minutos), porque los datos y modelos no están en git. **Con datos reales**: entrena en tu PC (`python entrenar_modelo.py --dataset real`), copia `modelos/modelo_ocupacion.joblib` a una carpeta versionada (por ejemplo `ml/modelo_publicado/`), define `ML_MODELO_PATH=modelo_publicado/modelo_ocupacion.joblib` y quita del Build Command los pasos de generar y entrenar. El modelo no contiene los datos crudos, solo los árboles entrenados.

Después, en el backend: `ML_SERVICE_URL=https://<servicio-ml>.onrender.com`, `ML_API_KEY` y `PREDICCION_PROVEEDOR=auto` (ver README principal).

> En el plan gratuito, Render apaga el servicio tras 15 minutos sin uso y la primera petición tarda en despertarlo; con `PREDICCION_PROVEEDOR=auto` el backend responde igual con el cálculo heurístico mientras tanto.
