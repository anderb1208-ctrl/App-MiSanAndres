"""
Evaluación de los modelos: métricas, validación temporal, baseline, búsqueda de
hiperparámetros, medición de despliegue, reducción de tamaño y selección del ganador.
"""
from __future__ import annotations

import tempfile
import time
import tracemalloc
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit

from misanandres_ml import config
from misanandres_ml.datos.preparar_dataset import CLIMA, agregar_filas_sin_clima
from misanandres_ml.modelos import ESPACIOS_BUSQUEDA, ITERACIONES_BUSQUEDA, construir_pipeline, modulo


# ---------------------------------------------------------------------------
# Métricas y división temporal
# ---------------------------------------------------------------------------
def metricas(real: pd.Series, predicho: np.ndarray) -> dict:
    return {
        "mae": round(float(mean_absolute_error(real, predicho)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(real, predicho))), 3),
        "r2": round(float(r2_score(real, predicho)), 4),
    }


def division_temporal(fechas: pd.Series, meses: int = config.MESES_PRUEBA,
                      fraccion_prueba: float = config.FRACCION_PRUEBA) -> tuple[pd.Series, pd.Timestamp]:
    """Máscara de entrenamiento y fecha de corte. Prueba = últimos `meses` meses; si el dataset
    no tiene al menos el doble de ese tiempo, la última `fraccion_prueba` de los días."""
    dias = np.sort(fechas.dt.normalize().unique())
    if len(dias) < 2:
        raise ValueError("Se necesitan al menos 2 días distintos para la validación temporal.")
    ultimo = pd.Timestamp(dias[-1])
    corte = (ultimo - pd.DateOffset(months=meses)).normalize() + pd.Timedelta(days=1)
    entrenamiento, prueba = corte - pd.Timestamp(dias[0]), ultimo - corte
    if entrenamiento < 2 * prueba:
        indice = min(len(dias) - 1, max(1, int(round(len(dias) * (1 - fraccion_prueba)))))
        corte = pd.Timestamp(dias[indice])
    return fechas < corte, corte


# ---------------------------------------------------------------------------
# Baseline: promedio histórico por destino y hora
# ---------------------------------------------------------------------------
def tabla_baseline(x: pd.DataFrame, y: pd.Series) -> dict:
    """Promedios por destino y hora, por destino y global (se guarda en baseline.json)."""
    datos = x[["id_destino", "hora"]].assign(y=y.to_numpy())
    por_hora = datos.groupby(["id_destino", "hora"])["y"].mean()
    por_destino = datos.groupby("id_destino")["y"].mean()
    return {
        "por_hora": {f"{d}|{int(h)}": round(float(v), 3) for (d, h), v in por_hora.items()},
        "por_destino": {str(d): round(float(v), 3) for d, v in por_destino.items()},
        "global": round(float(y.mean()), 3),
    }


def prediccion_baseline(tabla: dict, id_destino: int | str, hora: int) -> float:
    """Valor del baseline para una consulta: por destino y hora; si no hay, por destino; si no, global."""
    clave = f"{id_destino}|{int(hora)}"
    if clave in tabla["por_hora"]:
        return float(tabla["por_hora"][clave])
    return float(tabla["por_destino"].get(str(id_destino), tabla["global"]))


def predecir_baseline(x_entrena: pd.DataFrame, y_entrena: pd.Series, x_prueba: pd.DataFrame) -> np.ndarray:
    tabla = tabla_baseline(x_entrena, y_entrena)
    return np.array([prediccion_baseline(tabla, d, h) for d, h in zip(x_prueba["id_destino"], x_prueba["hora"])])


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def semanas_por_destino(x: pd.DataFrame, fechas: pd.Series) -> dict[str, float]:
    g = pd.DataFrame({"id": x["id_destino"], "fh": fechas}).groupby("id")["fh"]
    return {k: round(v, 1) for k, v in ((g.max() - g.min()).dt.days / 7).to_dict().items()}


def temporada_de(x: pd.DataFrame) -> np.ndarray:
    return np.where(x["temporada_alta"] == 1, "alta", "normal")


def sin_clima(x: pd.DataFrame) -> pd.DataFrame:
    """Las mismas filas sin clima (como llegan del backend para fechas sin pronóstico)."""
    x = x.copy()
    x[CLIMA] = np.nan
    x["clima_faltante"] = 1
    return x


def predecir(pipeline, x: pd.DataFrame) -> np.ndarray:
    return np.clip(pipeline.predict(x), 0, 100)


def mae_por(real: pd.Series, pred: np.ndarray, grupos) -> dict:
    tabla = pd.DataFrame({"r": real.to_numpy(), "p": pred, "g": np.asarray(grupos)})
    return {str(g): round(float((d["r"] - d["p"]).abs().mean()), 3) for g, d in tabla.groupby("g")}


def _a_json(valor):
    return valor.item() if hasattr(valor, "item") else valor


# ---------------------------------------------------------------------------
# Búsqueda de hiperparámetros
# ---------------------------------------------------------------------------
def buscar_hiperparametros(clave: str, x: pd.DataFrame, y: pd.Series) -> dict:
    """RandomizedSearchCV con TimeSeriesSplit sobre una muestra ordenada en el tiempo."""
    n = len(x)
    if n > config.MUESTRA_BUSQUEDA:
        indices = np.sort(np.random.default_rng(config.SEMILLA).choice(n, config.MUESTRA_BUSQUEDA, replace=False))
        x, y = x.iloc[indices], y.iloc[indices]
    x, y = agregar_filas_sin_clima(x, y)
    espacio = {f"modelo__{k}": v for k, v in ESPACIOS_BUSQUEDA[clave].items()}
    total = int(np.prod([len(v) for v in espacio.values()]))
    busqueda = RandomizedSearchCV(
        construir_pipeline(clave),
        espacio,
        n_iter=min(ITERACIONES_BUSQUEDA[clave], total),
        cv=TimeSeriesSplit(n_splits=config.PLIEGUES_BUSQUEDA),
        scoring="neg_root_mean_squared_error",
        random_state=config.SEMILLA,
        n_jobs=1,
        refit=False,
    )
    busqueda.fit(x, y)
    return {k.removeprefix("modelo__"): _a_json(v) for k, v in busqueda.best_params_.items()}


# ---------------------------------------------------------------------------
# Despliegue: tamaño, memoria y tiempo de predicción
# ---------------------------------------------------------------------------
def preparar_para_servir(pipeline) -> None:
    """El bosque predice una fila por vez en la API: un solo hilo evita el costo de crear hilos."""
    estimador = pipeline.named_steps["modelo"]
    if hasattr(estimador, "n_jobs"):
        estimador.n_jobs = 1


def medir_despliegue(pipeline, fila: pd.DataFrame, compresion=3) -> dict:
    """Tamaño del archivo comprimido (con la compresión del modelo), memoria al cargarlo y
    tiempo de una predicción."""
    preparar_para_servir(pipeline)
    with tempfile.TemporaryDirectory() as tmp:
        ruta = Path(tmp) / "modelo.joblib"
        joblib.dump(pipeline, ruta, compress=compresion)
        tamano = ruta.stat().st_size / 1e6
        tracemalloc.start()
        cargado = joblib.load(ruta)
        _, pico = tracemalloc.get_traced_memory()
        tracemalloc.stop()
    cargado.predict(fila)  # calentamiento
    tiempos = []
    for _ in range(30):
        inicio = time.perf_counter()
        cargado.predict(fila)
        tiempos.append((time.perf_counter() - inicio) * 1000)
    return {"tamano_mb": round(tamano, 2), "memoria_mb": round(pico / 1e6, 1), "ms_prediccion": round(float(np.median(tiempos)), 2)}


def evaluar(clave: str, hiper: dict, x_e, y_e, x_p, y_p) -> tuple[dict, object]:
    """Entrena con x_e y mide en x_p: métricas, errores por grupo y despliegue."""
    pipeline = construir_pipeline(clave, **hiper)
    inicio = time.perf_counter()
    pipeline.fit(*agregar_filas_sin_clima(x_e, y_e))
    tiempo = time.perf_counter() - inicio
    pred = predecir(pipeline, x_p)
    pred_sin_clima = predecir(pipeline, sin_clima(x_p))
    resultado = {
        "clave": clave,
        "nombre": config.NOMBRES_MODELO[clave],
        **metricas(y_p, pred),
        "rmse_sin_clima": metricas(y_p, pred_sin_clima)["rmse"],
        "mae_por_categoria": mae_por(y_p, pred, x_p["categoria"]),
        "mae_por_temporada": mae_por(y_p, pred, temporada_de(x_p)),
        "tiempo_entrenamiento_s": round(tiempo, 1),
        **medir_despliegue(pipeline, x_p.iloc[[0]], modulo(clave).COMPRESION),
        "hiperparametros": hiper,
    }
    resultado["cumple_restricciones"] = bool(
        resultado["tamano_mb"] <= config.MAX_MB_MODELO and resultado["ms_prediccion"] < config.MAX_MS_PREDICCION
    )
    return resultado, pipeline


def reducir_si_pesa(resultado: dict, pipeline, x_e, y_e, x_p, y_p, imprimir=print) -> tuple[dict, object, dict | None]:
    """Si el modelo pasa de MB_OBJETIVO_VERSIONADO, prueba sus REDUCCIONES (en orden) y se queda
    con la primera que entra en el objetivo sin empeorar el RMSE más de TOLERANCIA_REDUCCION.
    Si ninguna entra, la más liviana dentro de la tolerancia (o el original). Devuelve el
    resultado elegido, su pipeline y un resumen de la reducción (None si no hizo falta)."""
    if resultado["tamano_mb"] <= config.MB_OBJETIVO_VERSIONADO or not modulo(resultado["clave"]).REDUCCIONES:
        return resultado, pipeline, None
    limite_rmse = resultado["rmse"] * (1 + config.TOLERANCIA_REDUCCION)
    original = {k: resultado[k] for k in ("rmse", "tamano_mb", "hiperparametros")}
    probadas, mejor = [], None
    for ajuste in modulo(resultado["clave"]).REDUCCIONES:
        hiper = {**resultado["hiperparametros"], **ajuste}
        imprimir(f"    Reduciendo {resultado['nombre']}: {ajuste}…")
        candidato, pipe = evaluar(resultado["clave"], hiper, x_e, y_e, x_p, y_p)
        probadas.append({"ajuste": ajuste, "rmse": candidato["rmse"], "tamano_mb": candidato["tamano_mb"]})
        if candidato["rmse"] > limite_rmse:
            continue
        if mejor is None or candidato["tamano_mb"] < mejor[0]["tamano_mb"]:
            mejor = (candidato, pipe)
        if candidato["tamano_mb"] <= config.MB_OBJETIVO_VERSIONADO:
            break
    resumen = {"original": original, "probadas": probadas, "limite_rmse": round(limite_rmse, 3),
               "objetivo_mb": config.MB_OBJETIVO_VERSIONADO, "aplicada": mejor is not None}
    if mejor is None:
        resumen["motivo"] = f"Ninguna reducción mantuvo el RMSE dentro del {config.TOLERANCIA_REDUCCION:.0%}: se conserva el original."
        return resultado, pipeline, resumen
    elegido, pipe = mejor
    resumen["motivo"] = (f"De {original['tamano_mb']} MB a {elegido['tamano_mb']} MB con RMSE {elegido['rmse']} "
                         f"(antes {original['rmse']}; límite {resumen['limite_rmse']}).")
    return elegido, pipe, resumen


# ---------------------------------------------------------------------------
# Selección
# ---------------------------------------------------------------------------
def elegir_ganador(resultados: list[dict], tolerancia: float = config.TOLERANCIA_RMSE) -> tuple[str, str]:
    """Menor RMSE entre los que cumplen las restricciones; si otro está a menos de `tolerancia`
    (relativa), el más liviano (archivo más pequeño)."""
    candidatos = [r for r in resultados if r.get("cumple_restricciones", True) and r["clave"] != "baseline"]
    if not candidatos:
        raise SystemExit("✘ Ningún modelo cumple las restricciones de despliegue (tamaño y tiempo de predicción).")
    mejor = min(candidatos, key=lambda r: r["rmse"])
    cercanos = [r for r in candidatos if r["rmse"] <= mejor["rmse"] * (1 + tolerancia)]
    ganador = min(cercanos, key=lambda r: (r["tamano_mb"], r["rmse"]))
    if ganador["clave"] == mejor["clave"]:
        otros = [r for r in cercanos if r is not ganador]
        motivo = (f"Menor RMSE en la prueba ({mejor['rmse']:.2f} puntos)."
                  + (f" {', '.join(o['nombre'] for o in otros)} quedó a menos del {tolerancia:.0%}, pero pesa más." if otros else
                     f" Ningún otro modelo quedó a menos del {tolerancia:.0%}."))
    else:
        dif = ganador["rmse"] / mejor["rmse"] - 1
        motivo = (f"{mejor['nombre']} tuvo el menor RMSE ({mejor['rmse']:.2f}), pero {ganador['nombre']} quedó a solo "
                  f"{dif:.1%} ({ganador['rmse']:.2f}) y es más liviano ({ganador['tamano_mb']} MB frente a {mejor['tamano_mb']} MB).")
    return ganador["clave"], motivo


def orden_respaldo(comparacion: list[dict], ganador: str) -> list[str]:
    """El ganador primero y luego los demás modelos por RMSE (el baseline no es un modelo cargable)."""
    otros = sorted((r for r in comparacion if r["clave"] not in ("baseline", ganador)), key=lambda r: r["rmse"])
    return [ganador, *(r["clave"] for r in otros)]
