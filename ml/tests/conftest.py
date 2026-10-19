"""Datos pequeños y rápidos para las pruebas (3 destinos, pocas semanas, modelos chicos)."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from entrenar_modelo import comparar  # noqa: E402
from generar_dataset_simulado import generar, guardar  # noqa: E402

API_KEY = "clave-de-prueba"
# Hiperparámetros chicos para que las pruebas sean rápidas.
HIPER_RAPIDOS = {
    "ridge": {"alpha": 1.0},
    "random_forest": {"n_estimators": 10, "max_depth": 8, "min_samples_leaf": 20, "max_features": 0.8},
    "hist_gradient_boosting": {"max_iter": 30},
}


@pytest.fixture(scope="session")
def destinos() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"id_destino": 1, "nombre": "Playa de Spratt Bight", "capacidad": 100, "categoria": "playa",
             "horario_apertura": "06:00", "horario_cierre": "19:00"},
            {"id_destino": 5, "nombre": "Johnny Cay", "capacidad": 50, "categoria": "cayo",
             "horario_apertura": "09:00", "horario_cierre": "16:00"},
            {"id_destino": 8, "nombre": "La Regatta", "capacidad": 40, "categoria": "gastronomia",
             "horario_apertura": "12:00", "horario_cierre": "22:30"},
        ]
    )


@pytest.fixture(scope="session")
def dataset(destinos) -> pd.DataFrame:
    """8 semanas que incluyen festivos (12 ene) y Semana Santa no; temporada alta hasta el 15 ene."""
    return generar(destinos, date(2026, 1, 5), date(2026, 3, 1), semilla=7)


@pytest.fixture(scope="session")
def archivo_dataset(dataset, tmp_path_factory) -> Path:
    ruta = tmp_path_factory.mktemp("datos") / "dataset_ocupacion_san_andres.csv"
    guardar(dataset, ruta)
    return ruta


@pytest.fixture(scope="session")
def dir_modelo(archivo_dataset, destinos, tmp_path_factory) -> Path:
    directorio = tmp_path_factory.mktemp("modelos")
    comparar("mock", archivo_dataset, destinos, directorio, directorio, hiperparametros=HIPER_RAPIDOS, graficos=False)
    return directorio
