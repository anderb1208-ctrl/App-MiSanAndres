"""Utilidades compartidas: lectura de destinos y del dataset, y horario de atención."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from misanandres_ml import config

COLUMNAS_DESTINO = ["id_destino", "nombre", "capacidad", "categoria", "horario_apertura", "horario_cierre"]


def leer_destinos(ruta: Path | None = None) -> pd.DataFrame:
    """destinos.csv (exportado de Supabase) o, si no existe, el respaldo versionado."""
    if ruta is None:
        ruta = config.DESTINOS_CSV if config.DESTINOS_CSV.exists() else config.DESTINOS_RESPALDO_CSV
    destinos = pd.read_csv(ruta, dtype={"horario_apertura": "string", "horario_cierre": "string"})
    faltan = [c for c in COLUMNAS_DESTINO if c not in destinos.columns]
    if faltan:
        raise ValueError(f"{ruta} no tiene las columnas {faltan}.")
    if "estado" in destinos.columns:
        destinos = destinos[destinos["estado"] != "inactivo"]
    return destinos.reset_index(drop=True)


def _minutos(hhmm: str | None) -> int | None:
    if hhmm is None or pd.isna(hhmm) or str(hhmm).strip() == "":
        return None
    h, m = str(hhmm).split(":")[:2]
    return int(h) * 60 + int(m)


def horas_abiertas(apertura: str | None, cierre: str | None) -> list[int]:
    """Horas enteras (0–23) en que el destino atiende: HH:00 dentro de [apertura, cierre).
    Igual que el backend: sin horario = abierto todo el día."""
    a, c = _minutos(apertura), _minutos(cierre)
    if a is None or c is None:
        return list(range(24))
    return [h for h in range(24) if a <= h * 60 < c]


def abierto_a_las(destino: pd.Series | dict, hora: int) -> bool:
    return hora in horas_abiertas(destino["horario_apertura"], destino["horario_cierre"])


def leer_dataset(ruta: Path) -> pd.DataFrame:
    """Lee un CSV del dataset; las líneas que empiezan por '#' son comentarios (aviso de datos sintéticos)."""
    if not ruta.exists():
        raise FileNotFoundError(
            f"No existe {ruta}. Para datos simulados: python -m misanandres_ml.datos.generar_dataset_simulado. "
            "Para datos reales: python -m misanandres_ml.datos.cargar_datos_reales."
        )
    return pd.read_csv(ruta, comment="#", dtype={"fecha_hora": "string", "temporada": "string"})


def a_fecha_hora_local(serie: pd.Series) -> pd.Series:
    """Texto → fecha y hora en hora de Colombia. Sin zona se asume hora local de Colombia."""
    valores = pd.to_datetime(serie, errors="coerce", utc=False, format="mixed")
    if getattr(valores.dt, "tz", None) is None:
        return valores.dt.tz_localize(config.ZONA_HORARIA, ambiguous="NaT", nonexistent="NaT")
    return valores.dt.tz_convert(config.ZONA_HORARIA)
