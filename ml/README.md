# Servicio de predicción de ocupación (ML)

Predice el **porcentaje de ocupación** de un destino de San Andrés para una fecha y hora y lo expone como servicio HTTP (FastAPI) que consume el backend. Se **compararon tres modelos** (Ridge, Random Forest y HistGradientBoosting, más un baseline de referencia) con validación temporal, y el servicio usa **el ganador**: hoy, **HistGradientBoosting** (ver [`reportes/comparacion_modelos.md`](reportes/comparacion_modelos.md) y [`docs/seleccion-de-modelo.md`](../docs/seleccion-de-modelo.md)).

> ⚠ **Los datos de ocupación son SIMULADOS** (`origen_dato = simulado_calibrado`): no existen mediciones públicas de cuántas personas hay por hora en cada lugar. El simulador se **calibra con datos reales** (clima observado hora por hora de Open-Meteo, festivos y puentes de Colombia, temporadas, llegadas oficiales de turistas por mes, capacidad de Johnny Cay y el cierre judicial de El Acuario), y lo que no se encontró se simula con supuestos explícitos ([`datos/FUENTES.md`](datos/FUENTES.md)). El servicio lo dice en cada respuesta (`origen_modelo: "simulado"`, `mensaje_origen`) y la app muestra "Estimado con HistGradientBoosting · datos simulados". Cuando lleguen datos reales, el cambio es poner un archivo y correr dos comandos: ver [Cómo pasar a datos reales](#cómo-pasar-a-datos-reales).

## Instalación

Requiere Python 3.11 o superior.

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # en macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt # requirements.txt + matplotlib para los gráficos de los reportes
Copy-Item .env.example .env         # opcional: DATASET, ML_API_KEY y Supabase
```

`requirements.txt` es lo que necesita el servicio (y lo que instala Render); `requirements-dev.txt` agrega matplotlib, que solo se usa para los gráficos de los reportes.

## Orden de ejecución

```powershell
python exportar_destinos.py          # 1. destinos de Supabase → datos/destinos.csv (o el respaldo)
python generar_dataset_simulado.py   # 2. dataset SIMULADO → datos/dataset_ocupacion_san_andres.csv (~5 s)
python validar_dataset.py            # 3. revisa el dataset (código 1 si hay errores)
python calidad_dataset.py            # 4. chequeos de coherencia → reportes/calidad_dataset.md (+ gráficos)
python entrenar_modelo.py --comparar # 5. compara los 3 modelos, guarda al ganador y los reportes (~5 min)
uvicorn app:app --port 8000          # 6. servicio HTTP (necesita ML_API_KEY)
pytest                               # pruebas (~15 s)
```

- `python entrenar_modelo.py` (sin `--comparar`) es el **entrenamiento rápido**: reentrena solo al ganador de la última comparación (`reportes/ganador.json`) con sus hiperparámetros fijos, sin búsqueda (~30 s).
- `generar_mock_dataset.py` sigue funcionando como alias de `generar_dataset_simulado.py`.
- `descargar_clima_historico.py` vuelve a descargar el clima real de Open-Meteo (solo si se quiere actualizar; el CSV está versionado y el generador funciona sin internet).
- Todos los scripts aceptan `--dataset simulado|real` (`mock` es alias de `simulado`); si no se indica, usan la variable `DATASET` y, si tampoco está, `simulado`.

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `config.py` | Rutas, columnas, `DATASET` (simulado/real), modelos, criterio de selección y restricciones de despliegue |
| `calendario.py` | Festivos de Colombia (Ley Emiliani), puentes y temporadas (incluido el receso de octubre): copia fiel de `calendarioService` del backend |
| `comun.py` | Lectura de destinos y del dataset, horario de atención |
| `exportar_destinos.py` | Destinos de Supabase a CSV, con respaldo versionado `datos/destinos_respaldo.csv` |
| `descargar_clima_historico.py` | Clima real por hora de Open-Meteo → `datos/clima_historico_san_andres.csv` (versionado) |
| `generar_dataset_simulado.py` | Ocupación horaria **simulada y calibrada**, reproducible (semilla 42), para todos los destinos |
| `validar_dataset.py` | Columnas, vacíos, rangos, capacidad, duplicados, horario, calendario y cobertura |
| `calidad_dataset.py` | Chequeos de coherencia (capacidad, estacionalidad, lluvia, curva oficial, huecos) y reporte |
| `preparar_dataset.py` | Limpieza, features, imputación por climatología mensual y pipelines de los 3 modelos |
| `entrenar_modelo.py` | Comparación (`--comparar`) o entrenamiento rápido del ganador; métricas, reportes y modelo |
| `graficos.py` | Estilo común de los gráficos PNG |
| `cargar_datos_reales.py` | Valida y normaliza el archivo real; opcionalmente lo sube a Supabase |
| `app.py` | API FastAPI: `/health`, `/modelo`, `/predict`, `/predict/lote` |
| `datos/` | Clima real, llegadas oficiales, `FUENTES.md`, plantilla y guía de datos reales. El dataset simulado (~24 MB) no se sube: se regenera igual |
| `modelos/` | Modelo ganador (`modelo_ocupacion.joblib`, < 1 MB) y sus metadatos (`.json`): **versionados** |
| `reportes/` | `calidad_dataset.md`, `comparacion_modelos.md` y `.csv`, `ganador.json` y gráficos (versionados) |

## Dataset

`datos/dataset_ocupacion_san_andres.csv`: una fila por destino y hora de atención, del 1 oct 2024 al último día del clima descargado (hoy, 18 oct 2026: **209.440 filas**, 30 destinos, 24,5 meses). La primera línea es un comentario que avisa que los datos son simulados.

| Columna | Tipo | Equivale en el backend (`FeaturesPrediccion`) |
| --- | --- | --- |
| `fecha_hora` | Fecha y hora local de Colombia (`2026-03-14T15:00:00-05:00`) | `ocupacion.fecha_hora` |
| `id_destino` | Entero | id del destino |
| `hora` | 0–23 | `hora` |
| `dia_semana` | 1 = lunes … 7 = domingo | `diaSemana` |
| `es_fin_de_semana`, `es_festivo`, `es_puente` | true/false | `esFinDeSemana`, `esFestivo`, `esPuente` |
| `temporada` | `alta` / `normal` | `temporada` |
| `temperatura` (°C), `precipitacion` (mm), `viento` (km/h) | Número (puede faltar) | `clima.temperatura`, `clima.precipitacion`, `clima.viento` |
| `cantidad_personas` | Entero ≥ 0, ≤ capacidad | — |
| `porcentaje_ocupacion` | 0–100 | **objetivo** |
| `categoria`, `capacidad` | Del destino | — |
| `origen_dato` | `simulado_calibrado` | — |
| `evento` | vacío, `cierre_mal_tiempo`, `cierre_judicial` o `cierre_descanso` (ocupación 0) | — |

Los cierres administrativos (judicial y descanso) no se usan para entrenar: el backend ya los maneja como "cerrado temporalmente". Los cierres por mal tiempo sí, porque se explican con el clima.

### Cómo se simula

`ocupación = nivel del destino × perfil horario × llegadas oficiales del mes × calendario × lluvia × viento × ruido`, con saturación suave cerca del 100 %. El calendario (día de la semana, festivo, puente, temporada) se normaliza dentro de cada mes para que el volumen mensual siga la curva oficial de llegadas. Detalle de cada parámetro, su tipo (real, estimado o inventado coherente) y su fuente: [`datos/FUENTES.md`](datos/FUENTES.md). Resultado de los chequeos: [`reportes/calidad_dataset.md`](reportes/calidad_dataset.md).

## Modelos y comparación

| Modelo | Pipeline |
| --- | --- |
| Ridge | One-hot de destino, mes y categoría × hora; interacciones de la categoría con la hora cíclica (seno/coseno de 24 y 12 h), el calendario y el clima; `StandardScaler` |
| Random Forest | One-hot de destino y categoría; profundidad ≤ 18 y hojas ≥ 10 para limitar el tamaño |
| HistGradientBoosting | Destino y categoría como categóricas nativas |
| Baseline (referencia) | Promedio del entrenamiento por destino y hora |

Todos comparten un `ImputadorClimatologia`: si el backend manda clima nulo (fechas sin pronóstico), se rellena con el promedio de ese mes, y el entrenamiento incluye una copia del 20 % de las filas sin clima para que el modelo aprenda ese caso.

- **Validación temporal**: entrenamiento con los meses antiguos y prueba con los **últimos 3 meses** (19 jul – 18 oct 2026).
- **Hiperparámetros**: `RandomizedSearchCV` pequeña (semilla 42) con `TimeSeriesSplit` de 3 pliegues sobre una muestra ordenada de 60.000 filas.
- **Selección**: menor RMSE en la prueba entre los que cumplen las restricciones de despliegue (archivo ≤ 50 MB, predicción < 100 ms); si otro está a menos del 2 %, el más liviano.
- **Salidas**: `reportes/comparacion_modelos.md` y `.csv`, gráficos (`comparacion_metricas.png`, `comparacion_real_vs_predicho.png`, `comparacion_importancia_variables.png`), `reportes/ganador.json` y los metadatos en `modelos/modelo_ocupacion.json` (ganador, hiperparámetros, métricas de todos, origen del dato, fecha).

Resultados de la última comparación (datos **simulados**; prueba de 25.739 filas). Las cifras exactas están en el reporte; se regeneran con `python entrenar_modelo.py --comparar`:

| Modelo | MAE | RMSE | R² | RMSE con clima nulo | Archivo |
| --- | --- | --- | --- | --- | --- |
| Ridge | 6,39 | 8,94 | 0,808 | 10,48 | 0,01 MB |
| Random Forest | 4,60 | 6,65 | 0,894 | 9,88 | 27,9 MB |
| **HistGradientBoosting** 🏆 | **4,49** | **6,48** | **0,899** | 9,61 | 0,64 MB |
| Baseline | 5,97 | 9,50 | 0,784 | 9,50 | — |

Con datos simulados los modelos aprenden los supuestos del simulador: estas cifras comparan los modelos entre sí y muestran que el sistema funciona, no la precisión que tendrán con datos reales. `listo_para_produccion` solo es `true` con datos **reales**, al menos **4 semanas por destino** y si el modelo supera al baseline.

## API

`/predict` y `/predict/lote` exigen la cabecera `X-API-Key` con el valor de `ML_API_KEY`; `/health` y `/modelo` son públicos. Niveles: **Bajo < 40 %**, **Medio 40–70 %**, **Alto > 70 %** (los del backend). Fuera del horario del destino la respuesta es `estado: "Cerrado"` con 0 %.

```powershell
curl http://localhost:8000/health
curl http://localhost:8000/modelo

curl -X POST http://localhost:8000/predict -H "X-API-Key: <clave>" -H "Content-Type: application/json" `
  -d '{"id_destino": 5, "fecha": "2026-12-26", "hora": "12:00", "clima": {"temperatura": 29, "precipitacion": 0, "viento": 20}}'
```

Respuesta de `/predict`:

```json
{
  "id_destino": 5, "fecha": "2026-12-26", "hora": "12:00", "estado": "Abierto",
  "porcentaje": 78.4, "nivel": "Alto", "personas_estimadas": 627,
  "origen_modelo": "simulado", "modelo": "HistGradientBoosting", "modelo_clave": "hist_gradient_boosting",
  "datos_sinteticos": true, "mensaje_origen": "Estimación basada en datos simulados",
  "version_modelo": "2026-10-19T22:00:00+00:00", "listo_para_produccion": false
}
```

`GET /modelo` devuelve `ganador` (clave, nombre, hiperparámetros), `seleccion` (criterio y motivo), `comparacion` (métricas de los tres modelos y el baseline), `metricas`, `origen_datos`, `origen_dato`, `datos_sinteticos`, fechas y advertencias. `POST /predict/lote` recibe `{"consultas": [ ... ]}` (hasta 500) y devuelve `resultados` con el mismo origen y modelo. Errores: `401` sin clave o clave incorrecta, `404` destino desconocido, `422` datos inválidos, `503` sin modelo entrenado (`MODELO_NO_ENTRENADO`) o sin `ML_API_KEY`. Si el archivo del modelo cambia, se recarga en la siguiente petición.

## Cómo pasar a datos reales

No hay que cambiar código: el dataset real va en otra ruta (`datos/procesado_real/`) y se elige con `--dataset real` o `DATASET=real`. El simulado se puede seguir regenerando para pruebas.

1. Consigue el archivo con la entidad que mide la ocupación. Entrégale `datos/plantilla_ocupacion_real.csv` y `datos/LEEME_DATOS.md` (columnas, unidades, frecuencia y cantidad mínima de datos). Lo mínimo: `fecha_hora`, `id_destino` y `cantidad_personas`.
2. Borra las 2 filas de `EJEMPLO` si el archivo se armó sobre la plantilla (si no, se rechaza).
3. Copia el CSV en **`ml/datos/real/`** (esa carpeta no se sube a git).
4. Revísalo y normalízalo: `python cargar_datos_reales.py`. Valida, calcula lo que falte (calendario, porcentaje), muestra el resumen y guarda `datos/procesado_real/dataset_ocupacion_san_andres.csv`. Si hay errores, dice en qué filas.
5. (Opcional) Guárdalo también en la base, marcado como real: aplica antes la migración `supabase/migrations/20261015120000_ocupacion_origen.sql`, pon `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `ml/.env` y corre `python cargar_datos_reales.py --subir-a-supabase` (pide confirmación).
6. Compara y entrena con los datos reales: `python entrenar_modelo.py --comparar --dataset real`. Si algún destino tiene menos de 4 semanas de datos, lo advierte y el modelo **no** queda `listo_para_produccion`.
7. Pon `DATASET=real` en `ml/.env` (y en Render), sube a git el nuevo `modelos/modelo_ocupacion.joblib` y comprueba en `GET /modelo` que `origen_datos` sea `"real"`. Desde ese momento la app deja de decir "datos simulados".

## Despliegue en Render

Un **Web Service separado** del backend. El modelo ganador pesa menos de 1 MB y **está versionado** en `ml/modelos/`, así que el build solo instala dependencias (sin generar datos ni entrenar):

| Campo | Valor |
| --- | --- |
| Root Directory | `ml` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |

Variables de entorno:

| Variable | Valor |
| --- | --- |
| `ML_API_KEY` | Clave larga y aleatoria (la misma que `ML_API_KEY` del backend) |
| `DATASET` | `simulado` (hasta tener datos reales; `mock` también vale) |
| `PYTHON_VERSION` | `3.11.9` |

Ya no hacen falta `SUPABASE_URL` ni `SUPABASE_PUBLISHABLE_KEY` en Render (los destinos van dentro del modelo). Memoria: el modelo ocupa ~4 MB al cargarse y una predicción tarda ~10–20 ms, muy por debajo de los 512 MB del plan gratuito.

Si se agregan destinos o se prefiere entrenar en el build, alternativa (≈ 1 minuto, sin búsqueda): `pip install -r requirements.txt && python exportar_destinos.py && python generar_dataset_simulado.py && python entrenar_modelo.py` (agrega `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para exportar los destinos actuales).

Después, en el backend: `ML_SERVICE_URL=https://<servicio-ml>.onrender.com`, `ML_API_KEY` y `PREDICCION_PROVEEDOR=auto` (ver README principal).

> En el plan gratuito, Render apaga el servicio tras 15 minutos sin uso y la primera petición tarda en despertarlo; con `PREDICCION_PROVEEDOR=auto` el backend responde igual con el cálculo heurístico mientras tanto.
