"""
Los tres modelos candidatos (un archivo por modelo) y su registro.

    from misanandres_ml.modelos import construir_pipeline, REGISTRO
    construir_pipeline("gradient_boosting", max_iter=200)
"""
from __future__ import annotations

from types import ModuleType

from sklearn.pipeline import Pipeline

from misanandres_ml import config
from misanandres_ml.modelos import gradient_boosting, random_forest, ridge

REGISTRO: dict[str, ModuleType] = {m.CLAVE: m for m in (ridge, random_forest, gradient_boosting)}
assert tuple(REGISTRO) == config.MODELOS, "El registro debe seguir el orden de config.MODELOS."

# Diccionarios por clave (las pruebas pueden cambiarlos con monkeypatch).
HIPERPARAMETROS_POR_DEFECTO = {c: m.HIPERPARAMETROS_POR_DEFECTO for c, m in REGISTRO.items()}
ESPACIOS_BUSQUEDA = {c: m.ESPACIO_BUSQUEDA for c, m in REGISTRO.items()}
ITERACIONES_BUSQUEDA = {c: m.ITERACIONES_BUSQUEDA for c, m in REGISTRO.items()}


def normalizar_clave(clave: str) -> str:
    """Clave canónica ("hist_gradient_boosting" → "gradient_boosting"); ValueError si no existe."""
    clave = config.ALIAS_MODELO.get(clave, clave)
    if clave not in REGISTRO:
        raise ValueError(f"Modelo desconocido: {clave}. Opciones: {', '.join(config.MODELOS)}.")
    return clave


def modulo(clave: str) -> ModuleType:
    return REGISTRO[normalizar_clave(clave)]


def construir_pipeline(clave: str, **hiper) -> Pipeline:
    return modulo(clave).construir_pipeline(**hiper)
