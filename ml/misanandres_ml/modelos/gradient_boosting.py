"""
Gradient boosting: HistGradientBoostingRegressor con destino y categoría como variables
categóricas nativas. Liviano (< 1 MB) y el más preciso en la última comparación.
"""
from __future__ import annotations

import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder

from misanandres_ml import config
from misanandres_ml.datos.preparar_dataset import CATEGORICAS, ImputadorClimatologia, columnas_resto

CLAVE = "gradient_boosting"
NOMBRE = config.NOMBRES_MODELO[CLAVE]
HIPERPARAMETROS_POR_DEFECTO = {"learning_rate": 0.1, "max_iter": 300, "max_leaf_nodes": 31,
                               "min_samples_leaf": 20, "l2_regularization": 0.0}
ESPACIO_BUSQUEDA = {
    "learning_rate": [0.05, 0.1, 0.2],
    "max_iter": [200, 400],
    "max_leaf_nodes": [31, 63],
    "min_samples_leaf": [20, 50],
    "l2_regularization": [0.0, 1.0],
}
ITERACIONES_BUSQUEDA = 8
COMPRESION: int | tuple[str, int] = 3
REDUCCIONES: list[dict] = []


def construir_pipeline(**hiper) -> Pipeline:
    params = {**HIPERPARAMETROS_POR_DEFECTO, **hiper}
    columnas = ColumnTransformer([
        ("categoricas", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=np.nan, dtype=float), CATEGORICAS),
        ("resto", "passthrough", columnas_resto()),
    ])
    estimador = HistGradientBoostingRegressor(random_state=config.SEMILLA, categorical_features=[0, 1], **params)
    return Pipeline([("clima", ImputadorClimatologia()), ("columnas", columnas), ("modelo", estimador)])
