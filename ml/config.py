"""
Configuración central del servicio de predicción de ocupación.

DATASET elige con qué datos se trabaja:
  - "simulado": dataset SIMULADO calibrado con datos reales (clima observado, festivos,
    llegadas oficiales de turistas), generado por generar_dataset_simulado.py. Es el valor
    por defecto. "mock" se sigue aceptando como alias de "simulado".
  - "real": dataset real normalizado por cargar_datos_reales.py.
Se toma de la variable de entorno DATASET o del argumento --dataset de cada script
(el argumento gana). Cambiar de simulado a real no requiere tocar código.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
# ml/.env (opcional) con DATASET, ML_API_KEY y credenciales de Supabase. Nunca se sube.
load_dotenv(RAIZ / ".env")

DATASETS_VALIDOS = ("simulado", "real")
# Nombres anteriores que se siguen aceptando.
ALIAS_DATASET = {"mock": "simulado"}
DATASET_POR_DEFECTO = "simulado"
# Valor de la columna origen_dato del dataset simulado.
ORIGEN_SIMULADO = "simulado_calibrado"

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------
DIR_DATOS = RAIZ / "datos"
DIR_MODELOS = RAIZ / "modelos"
DIR_REPORTES = RAIZ / "reportes"

NOMBRE_DATASET = "dataset_ocupacion_san_andres.csv"
DESTINOS_CSV = DIR_DATOS / "destinos.csv"
DESTINOS_RESPALDO_CSV = DIR_DATOS / "destinos_respaldo.csv"
PLANTILLA_REAL_CSV = DIR_DATOS / "plantilla_ocupacion_real.csv"
CLIMA_HISTORICO_CSV = DIR_DATOS / "clima_historico_san_andres.csv"
LLEGADAS_CSV = DIR_DATOS / "llegadas_turistas_mensuales.csv"
DIR_REAL_ENTRADA = DIR_DATOS / "real"  # aquí se coloca el archivo real tal como llega

RUTAS_DATASET = {
    "simulado": DIR_DATOS / NOMBRE_DATASET,
    "real": DIR_DATOS / "procesado_real" / NOMBRE_DATASET,
}

MODELO_ARCHIVO = DIR_MODELOS / "modelo_ocupacion.joblib"
METADATOS_ARCHIVO = DIR_MODELOS / "modelo_ocupacion.json"
# Ganador e hiperparámetros de la última comparación (versionado): lo usa el
# entrenamiento rápido (sin búsqueda) para reentrenar solo al ganador.
GANADOR_ARCHIVO = DIR_REPORTES / "ganador.json"

# ---------------------------------------------------------------------------
# Esquema del dataset (coincide con FeaturesPrediccion del backend; ver README)
# ---------------------------------------------------------------------------
COLUMNAS_DATASET = [
    "fecha_hora",
    "id_destino",
    "hora",
    "dia_semana",
    "es_fin_de_semana",
    "es_festivo",
    "es_puente",
    "temporada",
    "temperatura",
    "precipitacion",
    "viento",
    "cantidad_personas",
    "porcentaje_ocupacion",
]
# Columnas opcionales: el dataset simulado las trae; si están, el validador las revisa.
COLUMNAS_EXTRA = ["categoria", "capacidad", "origen_dato", "evento"]
# Eventos del dataset simulado con ocupación 0 que NO se entrenan: cierres administrativos
# (judiciales o de descanso), que el backend maneja como "cerrado temporalmente".
EVENTOS_ADMINISTRATIVOS = ("cierre_judicial", "cierre_descanso")
COLUMNAS_CLIMA = ["temperatura", "precipitacion", "viento"]
COLUMNAS_OBLIGATORIAS_REAL = ["fecha_hora", "id_destino", "cantidad_personas"]
OBJETIVO = "porcentaje_ocupacion"
TEMPORADAS = ("alta", "normal")
ZONA_HORARIA = "America/Bogota"

# Marca de las filas de ejemplo de la plantilla: el validador las rechaza.
MARCA_EJEMPLO = "EJEMPLO"

# ---------------------------------------------------------------------------
# Modelo
# ---------------------------------------------------------------------------
SEMILLA = 42
MODELOS = ("ridge", "random_forest", "hist_gradient_boosting")
NOMBRES_MODELO = {
    "ridge": "Ridge (regresión lineal regularizada)",
    "random_forest": "Random Forest",
    "hist_gradient_boosting": "HistGradientBoosting",
    "baseline": "Baseline (promedio por destino y hora)",
}
# Validación temporal: se prueba con los últimos MESES_PRUEBA meses. Si el dataset es corto
# (menos de 2 × MESES_PRUEBA meses), con la última FRACCION_PRUEBA de las fechas.
MESES_PRUEBA = 3
FRACCION_PRUEBA = 0.2
# Búsqueda de hiperparámetros: TimeSeriesSplit sobre una muestra del entrenamiento.
PLIEGUES_BUSQUEDA = 3
MUESTRA_BUSQUEDA = 60_000
# Selección: gana el menor RMSE; si otro está a menos del 2 %, gana el más liviano.
TOLERANCIA_RMSE = 0.02
# Restricciones de despliegue (Render gratis: 512 MB de memoria).
MAX_MB_MODELO = 50
MAX_MS_PREDICCION = 100
SEMANAS_MINIMAS_PRODUCCION = 4

# Mismos cortes que backend/src/utils/nivelOcupacion.ts: Bajo < 40, Medio 40–70, Alto > 70.
LIMITE_BAJO = 40
LIMITE_ALTO = 70


def nivel_desde_porcentaje(porcentaje: float) -> str:
    if porcentaje < LIMITE_BAJO:
        return "Bajo"
    if porcentaje <= LIMITE_ALTO:
        return "Medio"
    return "Alto"


def dataset_activo(argumento: str | None = None) -> str:
    """Dataset elegido: --dataset, si no la variable DATASET, si no "simulado" ("mock" = "simulado")."""
    valor = (argumento or os.getenv("DATASET") or DATASET_POR_DEFECTO).strip().lower()
    valor = ALIAS_DATASET.get(valor, valor)
    if valor not in DATASETS_VALIDOS:
        raise ValueError(f'DATASET debe ser "simulado" (o "mock") o "real" (recibido: "{valor}").')
    return valor


def ruta_dataset(dataset: str) -> Path:
    return RUTAS_DATASET[dataset_activo(dataset)]


def agregar_argumento_dataset(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--dataset",
        choices=(*DATASETS_VALIDOS, *ALIAS_DATASET),
        default=None,
        help='Datos a usar: "simulado" ("mock") o "real". Por defecto, la variable DATASET o "simulado".',
    )
