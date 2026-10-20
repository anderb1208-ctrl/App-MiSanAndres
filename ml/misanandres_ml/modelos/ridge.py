"""
Ridge: regresión lineal regularizada.

One-hot de destino, mes y categoría × hora, e interacciones de la categoría con la hora
cíclica, el calendario y el clima (cada categoría tiene su propio perfil horario).
Es el modelo más liviano (KB) y el más rápido de entrenar.
"""
from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from misanandres_ml import config
from misanandres_ml.datos.preparar_dataset import (
    INTERACCIONES,
    CategoriaHora,
    ImputadorClimatologia,
    InteraccionesCategoria,
    columnas_resto,
)

CLAVE = "ridge"
NOMBRE = config.NOMBRES_MODELO[CLAVE]
HIPERPARAMETROS_POR_DEFECTO = {"alpha": 1.0}
ESPACIO_BUSQUEDA = {"alpha": [0.1, 1.0, 10.0, 100.0]}
ITERACIONES_BUSQUEDA = 4
# Compresión de joblib al guardar (nivel de zlib).
COMPRESION: int | tuple[str, int] = 3
# Sin reducciones: el archivo pesa KB.
REDUCCIONES: list[dict] = []


def construir_pipeline(**hiper) -> Pipeline:
    params = {**HIPERPARAMETROS_POR_DEFECTO, **hiper}
    columnas = ColumnTransformer([
        ("destino", OneHotEncoder(handle_unknown="ignore"), ["id_destino"]),
        ("mes", OneHotEncoder(handle_unknown="ignore"), ["mes"]),
        ("categoria_hora", Pipeline([("cruce", CategoriaHora()), ("onehot", OneHotEncoder(handle_unknown="ignore"))]),
         ["categoria", "hora"]),
        ("interacciones", Pipeline([("cruce", InteraccionesCategoria()), ("escala", StandardScaler())]),
         ["categoria", *INTERACCIONES]),
        ("numericas", StandardScaler(), columnas_resto()),
    ])
    return Pipeline([("clima", ImputadorClimatologia()), ("columnas", columnas), ("modelo", Ridge(alpha=params["alpha"]))])
