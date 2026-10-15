"""
Limpieza y construcción de features (lo usan entrenar_modelo.py y app.py).

Uso (para revisar el resultado):  python preparar_dataset.py [--dataset mock|real]

Features del modelo (las del backend: FeaturesPrediccion, más datos del destino):
  - Destino: id_destino y categoria (codificadas one-hot) y capacidad.
  - Calendario: hora (y su forma cíclica sen/cos), dia_semana, es_fin_de_semana,
    es_festivo, es_puente, temporada_alta.
  - Clima: temperatura, precipitacion, viento (vacíos → mediana del entrenamiento)
    y clima_faltante (1 si la fila no traía clima).
La codificación y la imputación viven dentro del Pipeline guardado, así la API recibe
los valores tal cual y aplica exactamente la misma transformación que al entrenar.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

import calendario
import config
from comun import a_fecha_hora_local, leer_dataset, leer_destinos
from validar_dataset import a_booleano

CATEGORICAS = ["id_destino", "categoria"]
NUMERICAS = [
    "capacidad", "hora", "hora_sin", "hora_cos", "dia_semana",
    "es_fin_de_semana", "es_festivo", "es_puente", "temporada_alta", "clima_faltante",
]
CLIMA = config.COLUMNAS_CLIMA
FEATURES = CATEGORICAS + NUMERICAS + CLIMA


def limpiar(datos: pd.DataFrame) -> pd.DataFrame:
    """Tipos correctos, sin filas inválidas ni duplicadas, objetivo en 0–100."""
    df = datos.copy()
    df["fecha_hora"] = a_fecha_hora_local(df["fecha_hora"])
    for col in ["id_destino", "hora", "dia_semana", "cantidad_personas", config.OBJETIVO, *CLIMA]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    for col in ["es_fin_de_semana", "es_festivo", "es_puente"]:
        df[col] = a_booleano(df[col])
    df["temporada"] = df["temporada"].astype("string").str.strip().str.lower()
    df = df.dropna(subset=["fecha_hora", "id_destino", config.OBJETIVO])
    df = df.drop_duplicates(subset=["id_destino", "fecha_hora"], keep="first")
    df[config.OBJETIVO] = df[config.OBJETIVO].clip(0, 100)
    df["id_destino"] = df["id_destino"].astype(int)
    return df.sort_values("fecha_hora").reset_index(drop=True)


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


def preparar(datos: pd.DataFrame, destinos: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """(X, y, fecha_hora) listos para entrenar."""
    df = limpiar(datos)
    df = df[df["id_destino"].isin(destinos["id_destino"])]
    return construir_features(df, destinos), df[config.OBJETIVO], df["fecha_hora"]


def construir_pipeline(n_estimadores: int = config.N_ESTIMADORES) -> Pipeline:
    transformador = ColumnTransformer(
        [
            ("categoricas", OneHotEncoder(handle_unknown="ignore"), CATEGORICAS),
            ("numericas", "passthrough", NUMERICAS),
            # keep_empty_features: si un dataset real llega sin clima, la columna se conserva (en 0)
            # y el modelo sigue recibiendo las mismas columnas que la API le envía.
            ("clima", SimpleImputer(strategy="median", keep_empty_features=True), CLIMA),
        ]
    )
    modelo = RandomForestRegressor(
        n_estimators=n_estimadores,
        random_state=config.SEMILLA,
        min_samples_leaf=config.MIN_MUESTRAS_HOJA,
        n_jobs=-1,
    )
    return Pipeline([("transformador", transformador), ("modelo", modelo)])


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
