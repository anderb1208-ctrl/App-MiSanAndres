# Servicio de predicción de ocupación (ML)

Predice el **porcentaje de ocupación** de un destino de San Andrés para una fecha y hora y lo expone como servicio HTTP (FastAPI) que consume el backend. Se **entrenaron y compararon tres modelos** (Ridge, Random Forest y gradient boosting con `HistGradientBoostingRegressor`, más un baseline de referencia) con validación temporal. **Los tres quedan guardados** en `artefactos/`: el **ganador** (hoy, **HistGradientBoosting**) atiende las predicciones y los otros dos quedan de respaldo y como evidencia (ver [`reportes/comparacion_modelos.md`](reportes/comparacion_modelos.md) y [`docs/seleccion-de-modelo.md`](../docs/seleccion-de-modelo.md)).

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

`requirements.txt` es lo que necesita el servicio (y lo que instala Render); `requirements-dev.txt` agrega matplotlib, que solo se usa para los gráficos de los reportes. Todos los comandos se corren **desde `ml/`**.

## Qué comando uso cuándo

| Quiero… | Comando | Tiempo |
| --- | --- | --- |
| Traer los destinos actuales de Supabase | `python -m misanandres_ml.datos.exportar_destinos` | segundos |
| Actualizar el clima real histórico (necesita internet) | `python -m misanandres_ml.datos.descargar_clima_historico` | ~10 s |
| Generar el dataset SIMULADO | `python -m misanandres_ml.datos.generar_dataset_simulado` | ~5 s |
| Revisar que el dataset no tenga errores | `python -m misanandres_ml.datos.validar_dataset` | segundos |
| Chequeos de coherencia y su reporte | `python -m misanandres_ml.datos.calidad_dataset` | ~10 s |
| Ver las features que se construyen | `python -m misanandres_ml.datos.preparar_dataset` | segundos |
| Cargar y normalizar un archivo de datos REALES | `python -m misanandres_ml.datos.cargar_datos_reales` | segundos |
| **Entrenar y comparar los tres modelos** (regenera `artefactos/`, `ganador.json` y los reportes) | `python entrenar_modelo.py --comparar` | ~10 min |
| Lo mismo, sin búsqueda de hiperparámetros | `python entrenar_modelo.py --comparar --sin-busqueda` | ~4 min |
| Reentrenar solo al ganador con sus hiperparámetros (rápido) | `python entrenar_modelo.py` | ~30 s |
| Levantar el servicio HTTP (necesita `ML_API_KEY`) | `uvicorn app:app --port 8000` | — |
| Correr las pruebas | `pytest` | ~15 s |

- Todos los scripts aceptan `--dataset simulado|real` (`mock` sigue valiendo como alias de `simulado`); si no se indica, usan la variable `DATASET` y, si tampoco está, `simulado`.
- Orden de la primera vez: exportar destinos → generar el dataset → validar → calidad → `entrenar_modelo.py --comparar` → `uvicorn`.
- `entrenar_modelo.py` es un lanzador delgado de `misanandres_ml/modelos/comparar.py`: se queda en la raíz para que el comando de siempre siga funcionando.

## Estructura

```text
ml/
├── app.py                    # API FastAPI que arranca Render (uvicorn app:app). No se mueve.
├── entrenar_modelo.py        # Lanzador: python entrenar_modelo.py [--comparar]
├── requirements.txt          # Dependencias del servicio (lo que instala Render). No se mueve.
├── requirements-dev.txt      # + matplotlib para los gráficos de los reportes
├── pytest.ini                # Configuración de pytest (pythonpath = .)
├── .env.example              # Variables de entorno de ejemplo (el .env nunca se sube)
├── misanandres_ml/           # TODO el código
│   ├── config.py             # Rutas, DATASET, columnas, modelos, criterio y límites de tamaño
│   ├── comun.py              # Lectura de destinos y del dataset, horario de atención
│   ├── calendario.py         # Festivos, puentes y temporadas de Colombia (copia de calendarioService del backend)
│   ├── datos/                # Todo lo que produce o revisa datos
│   │   ├── exportar_destinos.py          # Supabase → datos/destinos.csv (o el respaldo versionado)
│   │   ├── descargar_clima_historico.py  # Open-Meteo → datos/clima_historico_san_andres.csv
│   │   ├── generar_dataset_simulado.py   # Ocupación horaria simulada y calibrada (semilla 42)
│   │   ├── cargar_datos_reales.py        # Valida y normaliza el archivo real; opcional: lo sube a Supabase
│   │   ├── preparar_dataset.py           # Limpieza, features y transformadores (imputación por climatología)
│   │   ├── validar_dataset.py            # Columnas, rangos, capacidad, duplicados, horario, calendario
│   │   └── calidad_dataset.py            # Chequeos de coherencia → reportes/calidad_dataset.md
│   └── modelos/              # Un archivo por modelo y lo que los entrena, compara y guarda
│       ├── ridge.py                      # Pipeline, hiperparámetros y búsqueda de Ridge
│       ├── random_forest.py              # … de Random Forest (con reducciones de tamaño)
│       ├── gradient_boosting.py          # … de HistGradientBoosting
│       ├── evaluacion.py                 # Métricas, validación temporal, baseline, búsqueda, selección
│       ├── comparar.py                   # Compara los tres, guarda artefactos y reportes (main)
│       ├── artefactos.py                 # Lee y escribe artefactos/ (modelos, ganador.json, baseline.json)
│       └── graficos.py                   # Estilo y gráficos PNG de los reportes
├── datos/                    # SOLO archivos de datos
│   ├── clima_historico_san_andres.csv    # Clima real por hora (versionado)
│   ├── llegadas_turistas_mensuales.csv   # Llegadas oficiales (versionado)
│   ├── destinos_respaldo.csv             # Destinos si no hay acceso a Supabase (versionado)
│   ├── plantilla_ocupacion_real.csv, LEEME_DATOS.md, FUENTES.md
│   ├── real/                             # Aquí va el archivo real tal como llega (no se sube)
│   └── dataset_ocupacion_san_andres.csv  # Dataset simulado (~24 MB, no se sube: se regenera igual)
├── artefactos/               # Modelos entrenados: TODO versionado en git
│   ├── ridge.joblib / .json              # Pipeline + metadatos + destinos, y sus metadatos legibles
│   ├── random_forest.joblib / .json
│   ├── gradient_boosting.joblib / .json
│   ├── ganador.json                      # Cuál gana, por qué, orden de respaldo, tamaños y comparativa
│   └── baseline.json                     # Promedio por destino y hora (referencia de /comparar)
├── reportes/                 # Informes y gráficos (versionados; los de entrenamientos rápidos no)
└── tests/                    # Espejo del paquete: test_app.py, test_calendario.py, datos/, modelos/
```

Los `.joblib` guardan la ruta de los transformadores de `misanandres_ml/datos/preparar_dataset.py`: si se mueven o renombran, hay que volver a correr `python entrenar_modelo.py --comparar`.

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

| Modelo | Archivo | Pipeline |
| --- | --- | --- |
| Ridge | `modelos/ridge.py` | One-hot de destino, mes y categoría × hora; interacciones de la categoría con la hora cíclica (seno/coseno de 24 y 12 h), el calendario y el clima; `StandardScaler` |
| Random Forest | `modelos/random_forest.py` | One-hot de destino y categoría; profundidad y hojas limitadas; se guarda con compresión LZMA |
| Gradient boosting | `modelos/gradient_boosting.py` | `HistGradientBoostingRegressor` con destino y categoría como categóricas nativas |
| Baseline (referencia) | `modelos/evaluacion.py` | Promedio del entrenamiento por destino y hora |

Todos comparten un `ImputadorClimatologia`: si el backend manda clima nulo (fechas sin pronóstico), se rellena con el promedio de ese mes, y el entrenamiento incluye una copia del 20 % de las filas sin clima para que el modelo aprenda ese caso.

- **Validación temporal**: entrenamiento con los meses antiguos y prueba con los **últimos 3 meses** (19 jul – 18 oct 2026).
- **Hiperparámetros**: `RandomizedSearchCV` pequeña (semilla 42) con `TimeSeriesSplit` de 3 pliegues sobre una muestra ordenada de 60.000 filas.
- **Selección**: menor RMSE en la prueba entre los que cumplen las restricciones de despliegue (archivo ≤ 50 MB, predicción < 100 ms); si otro está a menos del 2 %, el más liviano.
- **Tamaño para git**: si un modelo pasa de 15 MB, se prueban reducciones (menos profundidad, más hojas mínimas) y compresión LZMA, y se acepta la más liviana que no empeore su RMSE más de un 2 %. Si aun así pasa de 30 MB, se versionan solo sus metadatos y métricas.
- **Salidas**: los tres modelos en `artefactos/` (cada uno reentrenado con todas las filas), `ganador.json`, `baseline.json`, y en `reportes/` `comparacion_modelos.md` y `.csv` con los gráficos (`comparacion_metricas.png`, `comparacion_real_vs_predicho.png`, `comparacion_importancia_variables.png`).

Resultados de la última comparación (datos **simulados**; prueba de 25.739 filas). Las cifras exactas están en el reporte; se regeneran con `python entrenar_modelo.py --comparar`:

<!-- RESULTADOS -->

Con datos simulados los modelos aprenden los supuestos del simulador: estas cifras comparan los modelos entre sí y muestran que el sistema funciona, no la precisión que tendrán con datos reales. `listo_para_produccion` solo es `true` con datos **reales**, al menos **4 semanas por destino** y si el modelo supera al baseline.

## API

Todo exige la cabecera `X-API-Key` con el valor de `ML_API_KEY`, **menos `/health`**, que es público (lo usa Render). Niveles: **Bajo < 40 %**, **Medio 40–70 %**, **Alto > 70 %** (los del backend). Fuera del horario del destino la respuesta es `estado: "Cerrado"` con 0 %.

| Endpoint | Qué hace |
| --- | --- |
| `GET /health` | Estado, modelo activo, si es respaldo, métricas y memoria del proceso (`memoria_mb`, en Linux) |
| `GET /modelo` | Los tres modelos con MAE, RMSE, R², tamaño, `ganador`, `activo` y `disponible`; el baseline; criterio y motivo; orden de respaldo |
| `POST /predict` | Una predicción. `modelo` opcional (`ridge`, `random_forest`, `gradient_boosting`); por defecto, el ganador. Otro valor: `422 MODELO_DESCONOCIDO` |
| `POST /predict/lote` | Hasta 500 consultas (lo que usa el backend), con el mismo `modelo` opcional |
| `POST /comparar` | La misma entrada que `/predict`; devuelve los tres modelos y el baseline lado a lado, con el ganador marcado |

```powershell
curl http://localhost:8000/health
curl http://localhost:8000/modelo -H "X-API-Key: <clave>"

curl -X POST http://localhost:8000/predict -H "X-API-Key: <clave>" -H "Content-Type: application/json" `
  -d '{"id_destino": 5, "fecha": "2026-12-26", "hora": "12:00", "clima": {"temperatura": 29, "precipitacion": 0, "viento": 20}}'
```

Respuesta de `/predict`:

```json
{
  "id_destino": 5, "fecha": "2026-12-26", "hora": "12:00", "estado": "Abierto",
  "porcentaje": 78.4, "nivel": "Alto", "personas_estimadas": 627,
  "origen_modelo": "simulado", "modelo": "HistGradientBoosting", "modelo_clave": "gradient_boosting",
  "modelo_usado": "gradient_boosting", "respaldo": false,
  "datos_sinteticos": true, "mensaje_origen": "Estimación basada en datos simulados",
  "version_modelo": "2026-10-20T00:00:00+00:00", "listo_para_produccion": false
}
```

### Memoria y respaldo

- **Al arrancar se carga solo el ganador** (`ganador.json`): es el único que queda en memoria y el que responde por defecto.
- **Respaldo automático**: si el archivo del ganador falta o no carga, se usa el siguiente mejor por RMSE (`orden_respaldo` de `ganador.json`), se registra un aviso en los logs y las respuestas traen `modelo_usado` con ese modelo y `respaldo: true`. Si ninguno carga, `503 MODELO_NO_ENTRENADO` (como siempre) y el backend usa su cálculo heurístico.
- **Candidatos bajo demanda**: `/predict` con `modelo` y `/comparar` cargan los otros modelos **uno a la vez** y los liberan al terminar, para no pasar de los 512 MB de Render gratis.
- Si un archivo cambia (reentrenamiento), se recarga en la siguiente petición.

Errores: `401` sin clave o clave incorrecta, `404` destino desconocido, `422` datos inválidos o modelo desconocido, `503` sin modelo (`MODELO_NO_ENTRENADO`), modelo pedido no disponible (`MODELO_NO_DISPONIBLE`) o sin `ML_API_KEY`.

## Cómo pasar a datos reales

No hay que cambiar código: el dataset real va en otra ruta (`datos/procesado_real/`) y se elige con `--dataset real` o `DATASET=real`. El simulado se puede seguir regenerando para pruebas.

1. Consigue el archivo con la entidad que mide la ocupación. Entrégale `datos/plantilla_ocupacion_real.csv` y `datos/LEEME_DATOS.md` (columnas, unidades, frecuencia y cantidad mínima de datos). Lo mínimo: `fecha_hora`, `id_destino` y `cantidad_personas`.
2. Borra las 2 filas de `EJEMPLO` si el archivo se armó sobre la plantilla (si no, se rechaza).
3. Copia el CSV en **`ml/datos/real/`** (esa carpeta no se sube a git).
4. Revísalo y normalízalo: `python -m misanandres_ml.datos.cargar_datos_reales`. Valida, calcula lo que falte (calendario, porcentaje), muestra el resumen y guarda `datos/procesado_real/dataset_ocupacion_san_andres.csv`. Si hay errores, dice en qué filas.
5. (Opcional) Guárdalo también en la base, marcado como real: aplica antes la migración `supabase/migrations/20261015120000_ocupacion_origen.sql`, pon `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `ml/.env` y corre `python -m misanandres_ml.datos.cargar_datos_reales --subir-a-supabase` (pide confirmación).
6. Compara y entrena con los datos reales: `python entrenar_modelo.py --comparar --dataset real`. Si algún destino tiene menos de 4 semanas de datos, lo advierte y el modelo **no** queda `listo_para_produccion`.
7. Pon `DATASET=real` en `ml/.env` (y en Render), sube a git la carpeta `artefactos/` regenerada y comprueba en `GET /modelo` que `origen_datos` sea `"real"`. Desde ese momento la app deja de decir "datos simulados".

## Despliegue en Render

Un **Web Service separado** del backend. Los tres modelos están **versionados** en `ml/artefactos/`, así que el build solo instala dependencias (sin generar datos ni entrenar). La configuración **no cambió** con la reorganización:

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
| `ML_ARTEFACTOS_DIR` | Opcional: otra carpeta de artefactos. `ML_MODELO_PATH` ya no se usa (si está, se ignora con un aviso en los logs) |

Ya no hacen falta `SUPABASE_URL` ni `SUPABASE_PUBLISHABLE_KEY` en Render (los destinos van dentro de cada modelo).

Si se agregan destinos o se prefiere entrenar en el build, alternativa (≈ 1 minuto, sin búsqueda, solo el ganador): `pip install -r requirements.txt && python -m misanandres_ml.datos.exportar_destinos && python -m misanandres_ml.datos.generar_dataset_simulado && python entrenar_modelo.py` (agrega `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` para exportar los destinos actuales).

Después, en el backend: `ML_SERVICE_URL=https://<servicio-ml>.onrender.com`, `ML_API_KEY` y `PREDICCION_PROVEEDOR=auto` (ver README principal). El panel del administrador de la app muestra la comparativa en **Panel → Modelos de ML** (`GET /v1/admin/modelos`).

> En el plan gratuito, Render apaga el servicio tras 15 minutos sin uso y la primera petición tarda en despertarlo; con `PREDICCION_PROVEEDOR=auto` el backend responde igual con el cálculo heurístico mientras tanto.
