"""
Configuración central del servicio de predicción de ocupación.

DATASET elige con qué datos se trabaja:
  - "mock": dataset SINTÉTICO generado por generar_mock_dataset.py (valor por defecto).
  - "real": dataset real normalizado por cargar_datos_reales.py.
Se toma de la variable de entorno DATASET o del argumento --dataset de cada script
(el argumento gana). Cambiar de mock a real no requiere tocar código.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from dotenv import load_dotenv

RAIZ = Path(__file__).resolve().parent
# ml/.env (opcional) con DATASET, ML_API_KEY y credenciales de Supabase. Nunca se sube.
load_dotenv(RAIZ / ".env")

DATASETS_VALIDOS = ("mock", "real")
DATASET_POR_DEFECTO = "mock"

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
DIR_REAL_ENTRADA = DIR_DATOS / "real"  # aquí se coloca el archivo real tal como llega

RUTAS_DATASET = {
    "mock": DIR_DATOS / "mock" / NOMBRE_DATASET,
    "real": DIR_DATOS / "procesado_real" / NOMBRE_DATASET,
}

MODELO_ARCHIVO = DIR_MODELOS / "modelo_ocupacion.joblib"
METADATOS_ARCHIVO = DIR_MODELOS / "modelo_ocupacion.json"

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
N_ESTIMADORES = 100
# Hojas con al menos 20 filas: el modelo pesa decenas de MB en vez de cientos y cabe en
# la memoria de un Web Service pequeño de Render, sin pérdida apreciable de precisión.
MIN_MUESTRAS_HOJA = 20
FRACCION_PRUEBA = 0.2  # última parte del rango de fechas (validación temporal)
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
    """Dataset elegido: --dataset, si no la variable DATASET, si no "mock"."""
    valor = (argumento or os.getenv("DATASET") or DATASET_POR_DEFECTO).strip().lower()
    if valor not in DATASETS_VALIDOS:
        raise ValueError(f'DATASET debe ser "mock" o "real" (recibido: "{valor}").')
    return valor


def ruta_dataset(dataset: str) -> Path:
    return RUTAS_DATASET[dataset_activo(dataset)]


def agregar_argumento_dataset(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--dataset",
        choices=DATASETS_VALIDOS,
        default=None,
        help='Datos a usar: "mock" (sintéticos) o "real". Por defecto, la variable DATASET o "mock".',
    )
