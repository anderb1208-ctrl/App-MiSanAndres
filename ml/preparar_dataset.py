"""
Limpieza, features y pipelines de los tres modelos (lo usan entrenar_modelo.py y app.py).

Uso (para revisar el resultado):  python preparar_dataset.py [--dataset simulado|real]

Features (las del backend, FeaturesPrediccion, más datos del destino):
  - Destino: id_destino y categoria (categóricas) y capacidad.
  - Calendario: hora (y su forma cíclica: seno/coseno de 24 h y de 12 h), mes (y su forma
    cíclica), dia_semana, es_fin_de_semana, es_festivo, es_puente, temporada_alta.
  - Clima: temperatura, precipitacion, viento y clima_faltante (1 si la fila no traía clima).
    El backend no tiene pronóstico para fechas lejanas y manda clima nulo: se imputa con la
    CLIMATOLOGÍA MENSUAL aprendida al entrenar (promedio de ese mes), no con un valor fijo.
La imputación y la codificación viven dentro del Pipeline guardado: la API recibe los
valores tal cual y aplica exactamente la misma transformación que al entrenar.

Modelos (construir_pipeline):
  - ridge: regresión lineal regularizada. One-hot de destino, mes y categoría × hora, e
    interacciones de la categoría con la hora cíclica, el calendario y el clima.
  - random_forest: RandomForestRegressor con profundidad y hojas limitadas (tamaño del archivo).
  - hist_gradient_boosting: HistGradientBoostingRegressor con destino y categoría nativas.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler

import calendario
import config
from comun import a_fecha_hora_local, leer_dataset, leer_destinos
from validar_dataset import a_booleano

CATEGORICAS = ["id_destino", "categoria"]
CALENDARIO = [
    "hora", "hora_sin", "hora_cos", "hora_sin2", "hora_cos2", "mes", "mes_sin", "mes_cos",
    "dia_semana", "es_fin_de_semana", "es_festivo", "es_puente", "temporada_alta",
]
NUMERICAS = ["capacidad", *CALENDARIO, "clima_faltante"]
CLIMA = config.COLUMNAS_CLIMA
FEATURES = CATEGORICAS + NUMERICAS + CLIMA
# Variables que el modelo lineal cruza con la categoría (cada categoría tiene su propio efecto).
INTERACCIONES = ["hora_sin", "hora_cos", "hora_sin2", "hora_cos2", "es_fin_de_semana", "es_festivo",
                 "es_puente", "temporada_alta", "precipitacion", "viento", "temperatura", "clima_faltante"]
# Fracción de filas que se copian sin clima al entrenar: así el modelo aprende qué esperar
# cuando el backend no tiene pronóstico (fechas lejanas) en vez de suponer el clima promedio.
FRACCION_SIN_CLIMA = 0.2


# ---------------------------------------------------------------------------
# Limpieza y features
# ---------------------------------------------------------------------------
def limpiar(datos: pd.DataFrame) -> pd.DataFrame:
    """Tipos correctos, sin filas inválidas ni duplicadas, objetivo en 0–100, sin cierres
    administrativos (judiciales o de descanso: el backend los maneja como cierre temporal)."""
    df = datos.copy()
    df["fecha_hora"] = a_fecha_hora_local(df["fecha_hora"])
    for col in ["id_destino", "hora", "dia_semana", "cantidad_personas", config.OBJETIVO, *CLIMA]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in ["es_fin_de_semana", "es_festivo", "es_puente"]:
        df[col] = a_booleano(df[col])
    df["temporada"] = df["temporada"].astype("string").str.strip().str.lower()
    if "evento" in df.columns:
        df = df[~df["evento"].fillna("").astype(str).isin(config.EVENTOS_ADMINISTRATIVOS)]
    df = df.dropna(subset=["fecha_hora", "id_destino", config.OBJETIVO])
    df = df.drop_duplicates(subset=["id_destino", "fecha_hora"], keep="first")
    df[config.OBJETIVO] = df[config.OBJETIVO].clip(0, 100)
    df["id_destino"] = df["id_destino"].astype(int)
    return df.sort_values("fecha_hora", kind="stable").reset_index(drop=True)


def construir_features(df: pd.DataFrame, destinos: pd.DataFrame) -> pd.DataFrame:
    """Matriz de features (FEATURES) a partir de filas con id_destino, fecha_hora y clima."""
    info = destinos.set_index("id_destino")[["categoria", "capacidad"]]
    x = pd.DataFrame(index=df.index)
    x["id_destino"] = df["id_destino"].astype(int).astype(str)
    x["categoria"] = df["id_destino"].map(info["categoria"]).fillna("desconocida").astype(str)
    x["capacidad"] = df["id_destino"].map(info["capacidad"]).astype(float)
    hora = df["fecha_hora"].dt.hour
    x["hora"] = hora
    x["hora_sin"] = np.sin(2 * np.pi * hora / 24)
    x["hora_cos"] = np.cos(2 * np.pi * hora / 24)
    x["hora_sin2"] = np.sin(4 * np.pi * hora / 24)
    x["hora_cos2"] = np.cos(4 * np.pi * hora / 24)
    mes = df["fecha_hora"].dt.month
    x["mes"] = mes
    x["mes_sin"] = np.sin(2 * np.pi * (mes - 1) / 12)
    x["mes_cos"] = np.cos(2 * np.pi * (mes - 1) / 12)
    # El calendario se recalcula siempre desde la fecha (misma regla que el backend).
    fechas = df["fecha_hora"].dt.date
    por_dia = {f: calendario.info_del_dia(f) for f in fechas.unique()}
    cal = pd.DataFrame([por_dia[f] for f in fechas], index=df.index)
    x["dia_semana"] = cal["dia_semana"]
    x["es_fin_de_semana"] = cal["es_fin_de_semana"].astype(int)
    x["es_festivo"] = cal["es_festivo"].astype(int)
    x["es_puente"] = cal["es_puente"].astype(int)
    x["temporada_alta"] = (cal["temporada"] == "alta").astype(int)
    for col in CLIMA:
        x[col] = pd.to_numeric(df[col], errors="coerce") if col in df else np.nan
    x["clima_faltante"] = x[CLIMA].isna().any(axis=1).astype(int)
    return x[FEATURES]


def agregar_filas_sin_clima(x: pd.DataFrame, y: pd.Series, fraccion: float = FRACCION_SIN_CLIMA,
                            semilla: int = config.SEMILLA) -> tuple[pd.DataFrame, pd.Series]:
    """Agrega una copia de `fraccion` de las filas con el clima borrado (clima_faltante = 1),
    conservando el orden temporal. Solo para entrenar."""
    if fraccion <= 0 or len(x) == 0:
        return x, y
    rng = np.random.default_rng(semilla)
    elegidas = np.sort(rng.choice(len(x), max(1, int(len(x) * fraccion)), replace=False))
    copia = x.iloc[elegidas].copy()
    copia[CLIMA] = np.nan
    copia["clima_faltante"] = 1
    orden = np.argsort(np.concatenate([np.arange(len(x)), elegidas]), kind="stable")
    x_total = pd.concat([x, copia], ignore_index=True).iloc[orden].reset_index(drop=True)
    y_total = pd.concat([y.reset_index(drop=True), y.iloc[elegidas].reset_index(drop=True)], ignore_index=True)
    return x_total, y_total.iloc[orden].reset_index(drop=True)


def preparar(datos: pd.DataFrame, destinos: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """(X, y, fecha_hora) listos para entrenar."""
    df = limpiar(datos)
    df = df[df["id_destino"].isin(destinos["id_destino"])].reset_index(drop=True)
    return construir_features(df, destinos), df[config.OBJETIVO], df["fecha_hora"]


# ---------------------------------------------------------------------------
# Transformadores propios (deben vivir en un módulo que la API importa, para joblib)
# ---------------------------------------------------------------------------
class ImputadorClimatologia(BaseEstimator, TransformerMixin):
    """Rellena el clima faltante con el promedio de ese mes en el entrenamiento (climatología
    mensual); si un mes no tiene datos, con la mediana global; si no hay ningún dato de clima,
    con 0 (la columna clima_faltante le avisa al modelo)."""

    def fit(self, x: pd.DataFrame, y=None):
        datos = x[["mes", *CLIMA]]
        self.por_mes_ = datos.groupby("mes")[CLIMA].mean().to_dict()
        self.global_ = {c: (float(datos[c].median()) if datos[c].notna().any() else 0.0) for c in CLIMA}
        return self

    def transform(self, x: pd.DataFrame) -> pd.DataFrame:
        x = x.copy()
        for c in CLIMA:
            faltan = x[c].isna()
            if faltan.any():
                x.loc[faltan, c] = x.loc[faltan, "mes"].map(self.por_mes_.get(c, {})).fillna(self.global_[c]).to_numpy()
        return x

    def get_feature_names_out(self, nombres=None):
        return np.asarray(nombres if nombres is not None else FEATURES, dtype=object)


class InteraccionesCategoria(BaseEstimator, TransformerMixin):
    """Para el modelo lineal: por cada categoría, su indicador y su producto con cada variable de
    INTERACCIONES (cada categoría tiene su propio perfil horario y su propio efecto del clima)."""

    def fit(self, x: pd.DataFrame, y=None):
        self.categorias_ = sorted(x["categoria"].astype(str).unique())
        return self

    def transform(self, x: pd.DataFrame) -> np.ndarray:
        cat = x["categoria"].astype(str).to_numpy()
        valores = x[INTERACCIONES].to_numpy(dtype=float)
        columnas = []
        for c in self.categorias_:
            indicador = (cat == c).astype(float)[:, None]
            columnas += [indicador, indicador * valores]
        return np.hstack(columnas)


class CategoriaHora(BaseEstimator, TransformerMixin):
    """Texto "categoria_hora" para un one-hot de la categoría cruzada con la hora."""

    def fit(self, x, y=None):
        return self

    def transform(self, x: pd.DataFrame) -> pd.DataFrame:
        return pd.DataFrame({"categoria_hora": x["categoria"].astype(str) + "_" + x["hora"].astype(int).astype(str)})


# ---------------------------------------------------------------------------
# Pipelines
# ---------------------------------------------------------------------------
HIPERPARAMETROS_POR_DEFECTO = {
    "ridge": {"alpha": 1.0},
    "random_forest": {"n_estimators": 100, "max_depth": 14, "min_samples_leaf": 20, "max_features": 0.8},
    "hist_gradient_boosting": {"learning_rate": 0.1, "max_iter": 300, "max_leaf_nodes": 31,
                               "min_samples_leaf": 20, "l2_regularization": 0.0},
}
# Búsqueda pequeña y reproducible (RandomizedSearchCV, semilla 42). Profundidad y hojas
# acotadas en el bosque para que el archivo no pase de MAX_MB_MODELO.
ESPACIOS_BUSQUEDA = {
    "ridge": {"alpha": [0.1, 1.0, 10.0, 100.0]},
    "random_forest": {"n_estimators": [60, 100], "max_depth": [10, 14, 18], "min_samples_leaf": [10, 20, 40],
                      "max_features": [0.5, 0.8, 1.0]},
    "hist_gradient_boosting": {"learning_rate": [0.05, 0.1, 0.2], "max_iter": [200, 400], "max_leaf_nodes": [31, 63],
                               "min_samples_leaf": [20, 50], "l2_regularization": [0.0, 1.0]},
}
ITERACIONES_BUSQUEDA = {"ridge": 4, "random_forest": 6, "hist_gradient_boosting": 8}


def _resto() -> list[str]:
    return NUMERICAS + CLIMA


def construir_pipeline(modelo: str = "random_forest", **hiper) -> Pipeline:
    params = {**HIPERPARAMETROS_POR_DEFECTO[modelo], **hiper}
    if modelo == "ridge":
        columnas = ColumnTransformer([
            ("destino", OneHotEncoder(handle_unknown="ignore"), ["id_destino"]),
            ("mes", OneHotEncoder(handle_unknown="ignore"), ["mes"]),
            ("categoria_hora", Pipeline([("cruce", CategoriaHora()), ("onehot", OneHotEncoder(handle_unknown="ignore"))]),
             ["categoria", "hora"]),
            ("interacciones", Pipeline([("cruce", InteraccionesCategoria()), ("escala", StandardScaler())]),
             ["categoria", *INTERACCIONES]),
            ("numericas", StandardScaler(), _resto()),
        ])
        estimador = Ridge(alpha=params["alpha"])
    elif modelo == "random_forest":
        columnas = ColumnTransformer([
            ("categoricas", OneHotEncoder(handle_unknown="ignore"), CATEGORICAS),
            ("resto", "passthrough", _resto()),
        ])
        estimador = RandomForestRegressor(random_state=config.SEMILLA, n_jobs=-1, **params)
    elif modelo == "hist_gradient_boosting":
        columnas = ColumnTransformer([
            ("categoricas", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=np.nan, dtype=float), CATEGORICAS),
            ("resto", "passthrough", _resto()),
        ])
        estimador = HistGradientBoostingRegressor(random_state=config.SEMILLA, categorical_features=[0, 1], **params)
    else:
        raise ValueError(f"Modelo desconocido: {modelo}. Opciones: {', '.join(config.MODELOS)}.")
    return Pipeline([("clima", ImputadorClimatologia()), ("columnas", columnas), ("modelo", estimador)])


def fila_para_prediccion(
    id_destino: int, fecha: date, hora: int, clima: dict | None, destinos: pd.DataFrame
) -> pd.DataFrame:
    """Features de una sola consulta (la usa la API)."""
    fh = pd.Timestamp(year=fecha.year, month=fecha.month, day=fecha.day, hour=hora, tz=config.ZONA_HORARIA)
    df = pd.DataFrame({"id_destino": [id_destino], "fecha_hora": [fh]})
    for col in CLIMA:
        df[col] = [(clima or {}).get(col)]
    return construir_features(df, destinos)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Muestra las features construidas.")
    config.agregar_argumento_dataset(parser)
    args = parser.parse_args(argv)
    dataset = config.dataset_activo(args.dataset)
    x, y, fechas = preparar(leer_dataset(config.ruta_dataset(dataset)), leer_destinos())
    print(f"Dataset {dataset}: {len(x):,} filas, {len(FEATURES)} features, {fechas.min()} a {fechas.max()}")
    print(x.head().to_string())
    print(f"Objetivo: media {y.mean():.1f} %, máx {y.max():.1f} %")
    return 0


if __name__ == "__main__":
    sys.exit(main())
