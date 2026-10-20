"""
Random Forest: RandomForestRegressor con one-hot de destino y categoría.

Es el modelo más pesado: el archivo crece con la profundidad y el número de hojas. Si pasa de
config.MB_OBJETIVO_VERSIONADO, la comparación prueba las REDUCCIONES de abajo (en orden) con
compresión LZMA y se queda con la primera que entra en el objetivo sin empeorar el RMSE más de
config.TOLERANCIA_REDUCCION.
"""
from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from misanandres_ml import config
from misanandres_ml.datos.preparar_dataset import CATEGORICAS, ImputadorClimatologia, columnas_resto

CLAVE = "random_forest"
NOMBRE = config.NOMBRES_MODELO[CLAVE]
HIPERPARAMETROS_POR_DEFECTO = {"n_estimators": 100, "max_depth": 14, "min_samples_leaf": 20, "max_features": 0.8}
# Profundidad y hojas acotadas para que el archivo no pase de config.MAX_MB_MODELO.
ESPACIO_BUSQUEDA = {
    "n_estimators": [60, 100],
    "max_depth": [10, 14, 18],
    "min_samples_leaf": [10, 20, 40],
    "max_features": [0.5, 0.8, 1.0],
}
ITERACIONES_BUSQUEDA = 6
# LZMA comprime mucho mejor los árboles que zlib; cargar es algo más lento, pero este modelo
# solo se carga bajo demanda (o como respaldo).
COMPRESION: int | tuple[str, int] = ("lzma", 6)
# Ajustes que achican el bosque, del más suave al más fuerte (se combinan con los elegidos).
REDUCCIONES: list[dict] = [
    {"max_depth": 16},
    {"max_depth": 14},
    {"max_depth": 14, "min_samples_leaf": 20},
    {"max_depth": 12, "min_samples_leaf": 20},
    {"max_depth": 12, "min_samples_leaf": 40},
]


def construir_pipeline(**hiper) -> Pipeline:
    params = {**HIPERPARAMETROS_POR_DEFECTO, **hiper}
    columnas = ColumnTransformer([
        ("categoricas", OneHotEncoder(handle_unknown="ignore"), CATEGORICAS),
        ("resto", "passthrough", columnas_resto()),
    ])
    estimador = RandomForestRegressor(random_state=config.SEMILLA, n_jobs=-1, **params)
    return Pipeline([("clima", ImputadorClimatologia()), ("columnas", columnas), ("modelo", estimador)])
