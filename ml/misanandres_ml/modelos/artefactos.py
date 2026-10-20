"""
Lectura y escritura de ml/artefactos/:

    ridge.joblib / ridge.json                       un archivo por modelo (pipeline +
    random_forest.joblib / random_forest.json       metadatos + destinos) y sus metadatos
    gradient_boosting.joblib / gradient_boosting.json   legibles
    ganador.json     cuál gana, orden de respaldo por RMSE, comparativa y tamaños
    baseline.json    promedios por destino y hora (para /comparar)

Los .joblib guardan la ruta de los transformadores de misanandres_ml.datos.preparar_dataset:
si se mueven, hay que reentrenar (python entrenar_modelo.py --comparar).
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

from misanandres_ml import config
from misanandres_ml.modelos import modulo, normalizar_clave
from misanandres_ml.modelos.evaluacion import preparar_para_servir

COLUMNAS_DESTINOS = ["id_destino", "nombre", "capacidad", "categoria", "horario_apertura", "horario_cierre"]


def escribir_json(ruta: Path, datos: dict) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(datos, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def leer_json(ruta: Path) -> dict | None:
    if not ruta.exists():
        return None
    return json.loads(ruta.read_text(encoding="utf-8"))


def guardar_modelo(clave: str, pipeline, metadatos: dict, destinos: pd.DataFrame,
                   directorio: Path = config.DIR_ARTEFACTOS) -> dict:
    """Guarda <clave>.joblib (si no pasa de MB_MAXIMO_VERSIONADO) y <clave>.json.
    Devuelve {archivo, tamano_mb, versionado, motivo}."""
    preparar_para_servir(pipeline)
    directorio.mkdir(parents=True, exist_ok=True)
    paquete = {
        "pipeline": pipeline,
        "metadatos": metadatos,
        "destinos": destinos[COLUMNAS_DESTINOS]
        .astype({"horario_apertura": "string", "horario_cierre": "string"})
        .to_dict("records"),
    }
    ruta = config.ruta_modelo(clave, directorio)
    joblib.dump(paquete, ruta, compress=modulo(clave).COMPRESION)
    tamano = round(ruta.stat().st_size / 1e6, 2)
    info = {"archivo": ruta.name, "tamano_mb": tamano, "versionado": True, "motivo": None}
    if tamano > config.MB_MAXIMO_VERSIONADO:
        ruta.unlink()
        info.update(versionado=False, archivo=None, motivo=(
            f"Pesa {tamano} MB (más de {config.MB_MAXIMO_VERSIONADO} MB) aun reducido: se versionan solo sus "
            "metadatos y métricas. Se regenera con python entrenar_modelo.py --comparar."))
    escribir_json(config.ruta_metadatos(clave, directorio), {**metadatos, "artefacto": info})
    return info


def cargar_paquete(ruta: Path) -> dict:
    """Carga un .joblib y prepara los índices que usa la API."""
    paquete = joblib.load(ruta)
    paquete["destinos_df"] = pd.DataFrame(paquete["destinos"])
    paquete["destinos_por_id"] = {int(d["id_destino"]): d for d in paquete["destinos"]}
    modelo = paquete["metadatos"].get("modelo") or {}
    if modelo.get("clave"):
        modelo["clave"] = normalizar_clave(modelo["clave"])
    return paquete


def leer_ganador(directorio: Path = config.DIR_ARTEFACTOS) -> dict | None:
    """ganador.json con las claves normalizadas (acepta la clave anterior hist_gradient_boosting)."""
    datos = leer_json(directorio / config.NOMBRE_GANADOR)
    if datos is None:
        return None
    datos["modelo"] = normalizar_clave(datos["modelo"])
    for r in datos.get("comparacion", []):
        if r["clave"] != "baseline":
            r["clave"] = normalizar_clave(r["clave"])
    if datos.get("seleccion"):
        datos["seleccion"]["ganador"] = normalizar_clave(datos["seleccion"]["ganador"])
    if "orden_respaldo" in datos:
        datos["orden_respaldo"] = [normalizar_clave(c) for c in datos["orden_respaldo"]]
    return datos


def leer_baseline(directorio: Path = config.DIR_ARTEFACTOS) -> dict | None:
    return leer_json(directorio / config.NOMBRE_BASELINE)
