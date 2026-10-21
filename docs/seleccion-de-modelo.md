# Selección del modelo de predicción de ocupación

> **Aviso:** los datos de ocupación usados para entrenar y comparar los modelos son **simulados** (calibrados con datos reales). Las métricas de este documento comparan los modelos entre sí y validan el sistema; no son la precisión que tendrá el modelo con mediciones reales de afluencia.

## 1. Objetivo

MiSanAndrés muestra, para cada destino turístico de San Andrés, el nivel de ocupación esperado (Bajo < 40 %, Medio 40–70 %, Alto > 70 %) para una fecha y hora. Se busca un modelo de regresión que estime el **porcentaje de ocupación** (0–100) de un destino a partir de:

- **Destino**: identificador, categoría (playa, cayo, gastronomía, actividad, naturaleza, cultura) y capacidad.
- **Calendario**: hora, día de la semana, mes, fin de semana, festivo, puente y temporada alta (las mismas reglas del backend: festivos de la Ley Emiliani, temporadas de fin de año, mitad de año, Semana Santa y receso escolar de octubre).
- **Clima**: temperatura, precipitación y viento de esa hora (opcionales: el backend no tiene pronóstico para fechas lejanas).

El modelo debe poder desplegarse en el plan gratuito de Render (512 MB de memoria), responder en menos de 100 ms por predicción y pesar como máximo 50 MB.

## 2. Datos

No existen mediciones públicas de cuántas personas hay por hora en cada lugar de San Andrés, así que se construyó un **dataset simulado calibrado con datos reales** (`ml/datos/dataset_ocupacion_san_andres.csv`, generado con semilla fija por `ml/misanandres_ml/datos/generar_dataset_simulado.py`):

- **Cobertura**: los 30 destinos del catálogo, hora por hora y solo dentro de su horario de atención, del 1 de octubre de 2024 al 18 de octubre de 2026 (24,5 meses, 209.440 filas, sin huecos).
- **Datos reales usados como ancla**:
  - Clima histórico **observado** hora por hora de San Andrés (temperatura, precipitación y viento), de la API de archivo de Open-Meteo (licencia CC BY 4.0).
  - Festivos de Colombia, puentes y temporadas altas reales (mismo calendario del backend).
  - **Llegadas oficiales de turistas** de la Secretaría de Turismo departamental y la Gobernación (totales de 2024 y 2025, primer semestre de 2025 y 2026, y los meses publicados: julio, octubre y diciembre de 2025 y junio de 2026). Los meses sin cifra se repartieron para cuadrar con los totales oficiales.
  - **Capacidad de carga de Johnny Cay** (800 personas simultáneas, plan de manejo de CORALINA y fallo judicial) y el **cierre judicial de El Acuario** (23 de agosto de 2025, seis meses), con los descansos trimestrales ordenados para Haynes Cay.
- **Supuestos explícitos** para lo que no se encontró: perfil horario por categoría (playas con pico al mediodía, cayos atados a las salidas de lanchas, restaurantes en almuerzo y cena), efecto del día de la semana, festivos y puentes, efecto de la lluvia (fuerte al aire libre, mínimo bajo techo), viento y mar picado en cayos y actividades en el mar, cierres por mal tiempo, ruido con autocorrelación y saturación suave cerca del 100 %.

La coherencia del dataset se verificó con `ml/misanandres_ml/datos/validar_dataset.py` y `calidad_dataset.py` ([reporte](../ml/reportes/calidad_dataset.md)): nunca supera la capacidad (14 filas de 209.440 llegan al 95 %, todas en temporada alta), los promedios por categoría y mes están entre 18 % y 58 %, la lluvia correlaciona negativamente con la ocupación al aire libre (r = −0,53) y la ocupación mensual sigue la curva oficial de llegadas (r = 0,87). La tabla completa de parámetros, con su tipo (real, estimado o inventado coherente) y su fuente, está en [`ml/datos/FUENTES.md`](../ml/datos/FUENTES.md).

## 3. Metodología

### Modelos comparados

| Modelo | Por qué se incluye | Preprocesamiento |
| --- | --- | --- |
| **Ridge** (regresión lineal regularizada) | Referencia interpretable y muy liviana | One-hot de destino, mes y categoría × hora; interacciones de la categoría con la hora cíclica (seno y coseno de 24 y 12 horas), el calendario y el clima; estandarización |
| **Random Forest** (`RandomForestRegressor`) | El modelo usado hasta ahora; captura relaciones no lineales sin ajuste fino | One-hot de destino y categoría; profundidad y tamaño de hoja acotados para limitar el tamaño del archivo |
| **HistGradientBoosting** (`HistGradientBoostingRegressor`) | Boosting por histogramas de scikit-learn: suele ser el más preciso en datos tabulares y es liviano | Destino y categoría como variables categóricas nativas |
| Baseline | Solo como referencia: el enfoque del cálculo heurístico del backend | Promedio del entrenamiento por destino y hora |

Los tres modelos son pipelines de scikit-learn (`Pipeline` + `ColumnTransformer`), así la API aplica exactamente la misma transformación que en el entrenamiento. Todos comparten un **imputador por climatología mensual**: cuando falta el clima, se usa el promedio de ese mes del entrenamiento y se marca `clima_faltante = 1`. Para que el modelo aprenda ese caso, el entrenamiento incluye una copia del 20 % de las filas con el clima borrado.

### Validación

- **Temporal**, nunca aleatoria: entrenamiento con los meses antiguos (1 oct 2024 – 18 jul 2026, 182.329 filas) y **prueba con los últimos 3 meses** (19 jul – 18 oct 2026, 25.739 filas). Así se mide cómo predice el futuro, que es el uso real.
- **Hiperparámetros**: búsqueda aleatoria pequeña y reproducible (`RandomizedSearchCV`, semilla 42) con `TimeSeriesSplit` de 3 pliegues sobre una muestra ordenada de 60.000 filas del entrenamiento (4 combinaciones para Ridge, 6 para Random Forest y 8 para HistGradientBoosting).
- **Métricas**: MAE, RMSE y R² en la prueba; MAE por categoría y por temporada; RMSE con el clima nulo (como llega para fechas lejanas); tiempo de entrenamiento; tamaño del archivo comprimido; tiempo de una predicción y memoria al cargar el modelo.

### Criterio de selección

Entre los modelos que cumplen las restricciones de despliegue (≤ 50 MB y < 100 ms por predicción), gana el de **menor RMSE en la prueba**; si otro queda a menos del 2 % de ese RMSE, gana el **más liviano**. Se usa RMSE porque penaliza más los errores grandes, que son los que cambian el nivel que ve el turista (por ejemplo, "Bajo" cuando en realidad es "Alto").

## 4. Resultados

Prueba: últimos 3 meses (25.739 filas). MAE y RMSE en puntos porcentuales de ocupación. Tiempos medidos en un portátil con Windows (varían según la máquina); la predicción es de una sola fila, con el modelo ya cargado.

| Modelo | MAE | RMSE | R² | RMSE con clima nulo | Entrenamiento | Archivo | Predicción | Memoria al cargar |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ridge | 6,39 | 8,94 | 0,809 | 10,48 | 4 s | 0,01 MB | ~8 ms | 1 MB |
| Random Forest (reducido para versionarlo) | 4,61 | 6,72 | 0,892 | 9,93 | 73 s | 15,1 MB | ~16 ms | 74 MB |
| **HistGradientBoosting** | **4,49** | **6,48** | **0,899** | 9,61 | 7 s | 0,65 MB | ~11 ms | 4 MB |
| Baseline (promedio por destino y hora) | 5,97 | 9,50 | 0,784 | 9,50 | — | — | — | — |

Hiperparámetros elegidos: Ridge `alpha = 1`; Random Forest 100 árboles, profundidad 16 (la búsqueda eligió 18; se redujo para que el archivo quepa en git, ver abajo), hojas de al menos 10 filas, todas las variables por división; HistGradientBoosting 400 iteraciones, tasa de aprendizaje 0,1, 31 hojas por árbol, hojas de al menos 50 filas y regularización L2 = 1.

**Ganador: HistGradientBoosting.** Tiene el menor RMSE (6,48 frente a 6,65 del Random Forest sin reducir, una diferencia del 2,6 %, mayor que la tolerancia del 2 %; 6,72 con el bosque reducido) y, además, es más de 20 veces más liviano que el bosque, entrena unas 10 veces más rápido y cabe con holgura en la memoria de Render.

**Reducción del Random Forest.** Con profundidad 18 el archivo pesaba 27,9 MB (zlib). Para versionarlo se probó, en orden, menos profundidad y compresión LZMA, aceptando solo cambios que no empeoraran su RMSE más de un 2 %: con profundidad 16 y LZMA pesa 15,1 MB y su RMSE pasa de 6,65 a 6,72 (+1,0 %). El ganador no cambia. Ridge queda claramente atrás (no captura bien la interacción entre la lluvia y el tipo de lugar), aunque supera al baseline en RMSE.

Por categoría (MAE), HistGradientBoosting y Random Forest quedan muy parejos: HistGradientBoosting es mejor en playas (3,63), restaurantes (4,89) y cultura (2,98), y Random Forest por pocas centésimas en actividades, cayos y naturaleza. En cultura, donde la ocupación casi no depende del clima, el baseline (2,85) es tan bueno como los modelos. El error es mayor en cayos (6,7) y actividades en el mar, que dependen del viento y de los cierres por mal tiempo. En temporada alta (en la prueba, el receso de octubre) el error sube porque son pocos días y la demanda de ese año fue mayor que la de los anteriores. El reporte completo, con el MAE por categoría y por temporada y los gráficos (métricas por modelo, real frente a predicho en una semana e importancia de variables), está en [`ml/reportes/comparacion_modelos.md`](../ml/reportes/comparacion_modelos.md).

Las variables más importantes del ganador (por permutación) son el destino, la hora y su forma cíclica, seguidas de la precipitación, el viento y el día de la semana.

## 5. Integración

**Los tres modelos se entrenaron, se compararon y quedan guardados.** Cada uno se reentrena con todas las filas y se guarda en `ml/artefactos/` (versionado en git como evidencia): `ridge.joblib`, `random_forest.joblib` y `gradient_boosting.joblib`, cada uno con su `.json` de metadatos, más `ganador.json` (cuál gana, por qué, orden de respaldo y comparativa) y `baseline.json`.

- **En producción atiende solo el ganador, HistGradientBoosting**, porque tiene el menor RMSE y es el más liviano de los dos mejores. Es el único que el servicio carga al arrancar (~175 MB de memoria en total).
- **Los otros dos quedan de respaldo y como evidencia.** Si el archivo del ganador falta o no carga, el servicio usa automáticamente el siguiente mejor por RMSE (Random Forest y luego Ridge), lo registra en los logs y responde `respaldo: true`. También se pueden consultar bajo demanda (`POST /predict` con `modelo`, o `POST /comparar`, que devuelve los tres y el baseline lado a lado); se cargan uno a la vez y se liberan, para no pasar los 512 MB de Render gratis.
- El administrador ve la comparativa en la app (Panel → Modelos de ML, vía `GET /v1/admin/modelos`), y el turista solo ve "Estimado con HistGradientBoosting · datos simulados".

El servicio de ML (FastAPI) expone `POST /predict` y `POST /predict/lote`, que indican qué modelo respondió (`modelo_usado`), y `GET /modelo`, que lista los tres con sus métricas, el ganador y el activo. El backend pasa el nombre del modelo en cada predicción (`modelo`) y la app lo muestra en el detalle del destino: "Estimado con HistGradientBoosting · datos simulados". Si el servicio de ML no responde, el backend usa el cálculo heurístico (promedio histórico más factores) y la app lo indica igual.

Todo se reproduce con dos comandos desde `ml/`: `python -m misanandres_ml.datos.generar_dataset_simulado` y `python entrenar_modelo.py --comparar`.

## 6. Limitaciones

- **Datos simulados.** El modelo aprende los supuestos del simulador; el buen desempeño muestra que el sistema funciona y permite comparar modelos, pero no garantiza la misma precisión con datos reales, que tendrán patrones y ruido que el simulador no contempla (eventos, cruceros, vuelos cancelados, decisiones de los operadores).
- **Clima observado frente a clima pronosticado.** En la prueba se usó el clima **observado** (reanálisis). En producción el backend envía el **pronóstico** de Open-Meteo, que tiene error, y para fechas a más de 16 días no hay pronóstico: con clima nulo el RMSE sube a ~9,6 puntos, similar al baseline, porque el modelo solo puede usar el promedio climatológico del mes. La precisión real dependerá de la calidad del pronóstico.
- **Llegadas mensuales parcialmente estimadas.** Solo algunos meses tienen cifra oficial publicada; los demás se repartieron para cuadrar con los totales. Las fechas exactas de los descansos de Haynes Cay y del receso escolar de octubre también son estimadas.
- **Capacidades.** Solo la de Johnny Cay tiene respaldo oficial; las demás son estimaciones del proyecto.
- **Cierres administrativos.** El modelo no predice cierres judiciales ni de descanso: el backend los maneja con el estado "cerrado temporalmente" del destino.
- **Extrapolación.** Los árboles no extrapolan tendencias: si el turismo crece más rápido que en los datos de entrenamiento, el modelo subestimará la ocupación hasta reentrenarse.

## 7. Trabajo futuro

- Conseguir **mediciones reales** (conteos de lanchas a los cayos, torniquetes, reservas de restaurantes, datos agregados de operadores) con la plantilla `ml/datos/plantilla_ocupacion_real.csv` y reentrenar con `python entrenar_modelo.py --comparar --dataset real`; el código no cambia.
- Guardar los pronósticos de clima que recibe el backend para **entrenar con clima pronosticado**, no observado, y medir el error real.
- Agregar variables de demanda conocidas con anticipación: vuelos programados, llegadas de cruceros, eventos (Green Moon Festival, regatas).
- Usar las interacciones de la app (vistas, favoritos) como señal adicional de interés por destino.
- Reentrenar periódicamente (por ejemplo, cada mes) y monitorear el error frente a las mediciones reales.
- Calibrar con la entidad ambiental (CORALINA) las capacidades de carga de los demás cayos.
