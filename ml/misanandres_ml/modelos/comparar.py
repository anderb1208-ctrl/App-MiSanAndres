"""
Entrena y compara los modelos de ocupación y guarda el mejor.

Uso:
    python entrenar_modelo.py --comparar [--dataset simulado|real]
        Compara Ridge, Random Forest y HistGradientBoosting (más el baseline como referencia),
        elige al ganador y lo guarda con sus metadatos, los reportes y los gráficos.
    python entrenar_modelo.py [--dataset simulado|real] [--modelo hist_gradient_boosting]
        Entrenamiento rápido: SOLO el ganador de la última comparación (reportes/ganador.json)
        con sus hiperparámetros fijos, sin búsqueda (sirve para un build liviano).

Metodología (--comparar):
1. Valida el dataset (si tiene errores, no entrena).
2. Validación TEMPORAL: entrena con los meses antiguos y prueba con los últimos
   MESES_PRUEBA meses (nunca mezcla fechas al azar: así se mide cómo predice el futuro).
3. Hiperparámetros: RandomizedSearchCV pequeña y reproducible (semilla 42) con
   TimeSeriesSplit sobre una muestra ordenada del entrenamiento.
4. Cada modelo se reentrena con todo el entrenamiento (más una copia del 20 % de las filas
   sin clima, para que aprenda el caso "sin pronóstico") y se mide en la prueba: MAE, RMSE,
   R², MAE por categoría y por temporada, RMSE con clima nulo (como llega de fechas lejanas),
   tiempo de entrenamiento, tamaño del archivo, tiempo de una predicción y memoria al cargarlo.
5. Selección: entre los que cumplen las restricciones de despliegue (≤ MAX_MB_MODELO MB y
   < MAX_MS_PREDICCION ms por predicción), gana el de menor RMSE; si otro está a menos del
   TOLERANCIA_RMSE (2 %), gana el más liviano.
6. El ganador se reentrena con TODAS las filas y se guarda en ml/modelos/ con los metadatos
   (ganador, hiperparámetros, métricas de todos, origen del dato, fecha).

Un modelo solo queda "listo para producción" si se entrenó con datos REALES, cada destino
tiene al menos SEMANAS_MINIMAS_PRODUCCION semanas de datos y supera al baseline.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
import time
import tracemalloc
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit

import config
from comun import leer_dataset, leer_destinos
from preparar_dataset import (
    CLIMA,
    ESPACIOS_BUSQUEDA,
    FEATURES,
    HIPERPARAMETROS_POR_DEFECTO,
    ITERACIONES_BUSQUEDA,
    agregar_filas_sin_clima,
    construir_pipeline,
    preparar,
)
from validar_dataset import validar

COLUMNAS_COMPARACION = [
    "clave", "nombre", "mae", "rmse", "r2", "rmse_sin_clima", "tiempo_entrenamiento_s", "tamano_mb",
    "ms_prediccion", "memoria_mb", "cumple_restricciones", "ganador",
]


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


def predecir_baseline(x_entrena: pd.DataFrame, y_entrena: pd.Series, x_prueba: pd.DataFrame) -> np.ndarray:
    """Promedio histórico por destino y hora; si no hay, por destino; si no, el global."""
    entrena = x_entrena[["id_destino", "hora"]].assign(y=y_entrena.to_numpy())
    por_hora = entrena.groupby(["id_destino", "hora"])["y"].mean()
    por_destino = entrena.groupby("id_destino")["y"].mean()
    claves = pd.MultiIndex.from_frame(x_prueba[["id_destino", "hora"]])
    pred = pd.Series(por_hora.reindex(claves).to_numpy(), index=x_prueba.index)
    pred = pred.fillna(x_prueba["id_destino"].map(por_destino)).fillna(float(y_entrena.mean()))
    return pred.to_numpy()


def semanas_por_destino(x: pd.DataFrame, fechas: pd.Series) -> dict[str, float]:
    g = pd.DataFrame({"id": x["id_destino"], "fh": fechas}).groupby("id")["fh"]
    return {k: round(v, 1) for k, v in ((g.max() - g.min()).dt.days / 7).to_dict().items()}


def temporada_de(x: pd.DataFrame) -> pd.Series:
    return np.where(x["temporada_alta"] == 1, "alta", "normal")


def sin_clima(x: pd.DataFrame) -> pd.DataFrame:
    """Las mismas filas sin clima (como llegan del backend para fechas sin pronóstico)."""
    x = x.copy()
    x[CLIMA] = np.nan
    x["clima_faltante"] = 1
    return x


def predecir(pipeline, x: pd.DataFrame) -> np.ndarray:
    return np.clip(pipeline.predict(x), 0, 100)


# ---------------------------------------------------------------------------
# Búsqueda, evaluación y selección
# ---------------------------------------------------------------------------
def buscar_hiperparametros(modelo: str, x: pd.DataFrame, y: pd.Series) -> dict:
    """RandomizedSearchCV con TimeSeriesSplit sobre una muestra ordenada en el tiempo."""
    n = len(x)
    if n > config.MUESTRA_BUSQUEDA:
        indices = np.sort(np.random.default_rng(config.SEMILLA).choice(n, config.MUESTRA_BUSQUEDA, replace=False))
        x, y = x.iloc[indices], y.iloc[indices]
    x, y = agregar_filas_sin_clima(x, y)
    espacio = {f"modelo__{k}": v for k, v in ESPACIOS_BUSQUEDA[modelo].items()}
    total = int(np.prod([len(v) for v in espacio.values()]))
    busqueda = RandomizedSearchCV(
        construir_pipeline(modelo),
        espacio,
        n_iter=min(ITERACIONES_BUSQUEDA[modelo], total),
        cv=TimeSeriesSplit(n_splits=config.PLIEGUES_BUSQUEDA),
        scoring="neg_root_mean_squared_error",
        random_state=config.SEMILLA,
        n_jobs=1,
        refit=False,
    )
    busqueda.fit(x, y)
    return {k.removeprefix("modelo__"): _a_json(v) for k, v in busqueda.best_params_.items()}


def _a_json(valor):
    return valor.item() if hasattr(valor, "item") else valor


def preparar_para_servir(pipeline) -> None:
    """El bosque predice una fila por vez en la API: un solo hilo evita el costo de crear hilos."""
    estimador = pipeline.named_steps["modelo"]
    if hasattr(estimador, "n_jobs"):
        estimador.n_jobs = 1


def medir_despliegue(pipeline, fila: pd.DataFrame) -> dict:
    """Tamaño del archivo comprimido, memoria al cargarlo y tiempo de una predicción."""
    preparar_para_servir(pipeline)
    with tempfile.TemporaryDirectory() as tmp:
        ruta = Path(tmp) / "modelo.joblib"
        joblib.dump(pipeline, ruta, compress=3)
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


def evaluar(modelo: str, hiper: dict, x_e, y_e, x_p, y_p) -> tuple[dict, object]:
    pipeline = construir_pipeline(modelo, **hiper)
    inicio = time.perf_counter()
    pipeline.fit(*agregar_filas_sin_clima(x_e, y_e))
    tiempo = time.perf_counter() - inicio
    pred = predecir(pipeline, x_p)
    pred_sin_clima = predecir(pipeline, sin_clima(x_p))
    resultado = {
        "clave": modelo,
        "nombre": config.NOMBRES_MODELO[modelo],
        **metricas(y_p, pred),
        "rmse_sin_clima": metricas(y_p, pred_sin_clima)["rmse"],
        "mae_por_categoria": _mae_por(y_p, pred, x_p["categoria"]),
        "mae_por_temporada": _mae_por(y_p, pred, temporada_de(x_p)),
        "tiempo_entrenamiento_s": round(tiempo, 1),
        **medir_despliegue(pipeline, x_p.iloc[[0]]),
        "hiperparametros": hiper,
    }
    resultado["cumple_restricciones"] = bool(
        resultado["tamano_mb"] <= config.MAX_MB_MODELO and resultado["ms_prediccion"] < config.MAX_MS_PREDICCION
    )
    return resultado, pipeline


def _mae_por(real: pd.Series, pred: np.ndarray, grupos) -> dict:
    tabla = pd.DataFrame({"r": real.to_numpy(), "p": pred, "g": np.asarray(grupos)})
    return {str(g): round(float((d["r"] - d["p"]).abs().mean()), 3) for g, d in tabla.groupby("g")}


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


# ---------------------------------------------------------------------------
# Entrenamiento
# ---------------------------------------------------------------------------
def _cargar(dataset: str, ruta_datos: Path | None, destinos: pd.DataFrame | None):
    dataset = config.dataset_activo(dataset)
    ruta_datos = ruta_datos or config.ruta_dataset(dataset)
    destinos = destinos if destinos is not None else leer_destinos()
    datos = leer_dataset(ruta_datos)
    reporte = validar(datos, destinos)
    if not reporte.ok:
        print(reporte.texto())
        raise SystemExit("✘ El dataset tiene errores: no se entrenó el modelo.")
    x, y, fechas = preparar(datos, destinos)
    return dataset, ruta_datos, destinos, x, y, fechas


def _metadatos_base(dataset, ruta_datos, x, fechas, es_entrena, corte, metricas_ganador, metricas_base) -> dict:
    semanas = semanas_por_destino(x, fechas)
    minimo = min(semanas.values()) if semanas else 0.0
    advertencias: list[str] = []
    if dataset == "simulado":
        advertencias.append("Entrenado con datos SIMULADOS (calibrados con datos reales): las predicciones son una "
                            "demostración, no reflejan la afluencia real.")
    if minimo < config.SEMANAS_MINIMAS_PRODUCCION:
        pocos = [k for k, v in semanas.items() if v < config.SEMANAS_MINIMAS_PRODUCCION]
        advertencias.append(
            f"Pocos datos: {len(pocos)} destino(s) con menos de {config.SEMANAS_MINIMAS_PRODUCCION} semanas "
            f"(mínimo {minimo} semanas). El modelo NO queda listo para producción."
        )
    supera = metricas_ganador["mae"] < metricas_base["mae"]
    if not supera:
        advertencias.append("El modelo no mejora al baseline (MAE): conviene revisar los datos antes de usarlo.")
    return {
        "fecha_entrenamiento": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "origen_datos": dataset,
        "origen_dato": config.ORIGEN_SIMULADO if dataset == "simulado" else "real",
        "datos_sinteticos": dataset == "simulado",
        "listo_para_produccion": dataset == "real" and minimo >= config.SEMANAS_MINIMAS_PRODUCCION and supera,
        "advertencias": advertencias,
        "archivo_datos": str(ruta_datos.name),
        "filas": int(len(x)),
        "filas_entrenamiento": int(es_entrena.sum()),
        "filas_prueba": int((~es_entrena).sum()),
        "rango_fechas": [str(fechas.min()), str(fechas.max())],
        "corte_validacion": str(corte.date()),
        "metricas": {"modelo": metricas_ganador, "baseline": metricas_base},
        "semanas_por_destino": semanas,
        "columnas": FEATURES,
        "umbrales_nivel": {"bajo_menor_que": config.LIMITE_BAJO, "alto_mayor_que": config.LIMITE_ALTO},
    }


def _guardar_modelo(pipeline, metadatos: dict, destinos: pd.DataFrame, dir_modelos: Path) -> None:
    preparar_para_servir(pipeline)
    dir_modelos.mkdir(parents=True, exist_ok=True)
    paquete = {
        "pipeline": pipeline,
        "metadatos": metadatos,
        "destinos": destinos[["id_destino", "nombre", "capacidad", "categoria", "horario_apertura", "horario_cierre"]]
        .astype({"horario_apertura": "string", "horario_cierre": "string"})
        .to_dict("records"),
    }
    joblib.dump(paquete, dir_modelos / config.MODELO_ARCHIVO.name, compress=3)
    (dir_modelos / config.METADATOS_ARCHIVO.name).write_text(json.dumps(metadatos, indent=2, ensure_ascii=False), encoding="utf-8")


def comparar(
    dataset: str,
    ruta_datos: Path | None = None,
    destinos: pd.DataFrame | None = None,
    dir_modelos: Path = config.DIR_MODELOS,
    dir_reportes: Path = config.DIR_REPORTES,
    modelos: tuple[str, ...] = config.MODELOS,
    buscar: bool = True,
    hiperparametros: dict[str, dict] | None = None,
    graficos: bool = True,
) -> dict:
    dataset, ruta_datos, destinos, x, y, fechas = _cargar(dataset, ruta_datos, destinos)
    es_entrena, corte = division_temporal(fechas)
    x_e, y_e, x_p, y_p = x[es_entrena], y[es_entrena], x[~es_entrena], y[~es_entrena]

    resultados: list[dict] = []
    pipelines: dict[str, object] = {}
    for modelo in modelos:
        if hiperparametros and modelo in hiperparametros:
            hiper = hiperparametros[modelo]
        elif buscar:
            print(f"  Buscando hiperparámetros de {config.NOMBRES_MODELO[modelo]}…")
            hiper = buscar_hiperparametros(modelo, x_e, y_e)
        else:
            hiper = HIPERPARAMETROS_POR_DEFECTO[modelo]
        print(f"  Entrenando {config.NOMBRES_MODELO[modelo]} con {hiper}…")
        resultado, pipeline = evaluar(modelo, hiper, x_e, y_e, x_p, y_p)
        resultados.append(resultado)
        pipelines[modelo] = pipeline

    pred_base = predecir_baseline(x_e, y_e, x_p)
    baseline = {
        "clave": "baseline", "nombre": config.NOMBRES_MODELO["baseline"], **metricas(y_p, pred_base),
        "rmse_sin_clima": metricas(y_p, pred_base)["rmse"],
        "mae_por_categoria": _mae_por(y_p, pred_base, x_p["categoria"]),
        "mae_por_temporada": _mae_por(y_p, pred_base, temporada_de(x_p)),
        "tiempo_entrenamiento_s": None, "tamano_mb": None, "ms_prediccion": None, "memoria_mb": None,
        "cumple_restricciones": None, "hiperparametros": {},
    }

    clave, motivo = elegir_ganador(resultados)
    for r in resultados:
        r["ganador"] = r["clave"] == clave
    baseline["ganador"] = False
    ganador = next(r for r in resultados if r["clave"] == clave)
    comparacion = [*resultados, baseline]
    seleccion = {
        "ganador": clave,
        "nombre": ganador["nombre"],
        "motivo": motivo,
        "criterio": (f"Menor RMSE en la prueba (últimos {config.MESES_PRUEBA} meses); si la diferencia es menor al "
                     f"{config.TOLERANCIA_RMSE:.0%}, el más liviano. Restricciones: ≤ {config.MAX_MB_MODELO} MB y "
                     f"< {config.MAX_MS_PREDICCION} ms por predicción."),
    }

    print(f"  Reentrenando a {ganador['nombre']} con todas las filas…")
    final = construir_pipeline(clave, **ganador["hiperparametros"])
    final.fit(*agregar_filas_sin_clima(x, y))
    metadatos = _metadatos_base(dataset, ruta_datos, x, fechas, es_entrena, corte,
                                {k: ganador[k] for k in ("mae", "rmse", "r2")}, {k: baseline[k] for k in ("mae", "rmse", "r2")})
    metadatos.update({
        "modelo": {"clave": clave, "nombre": ganador["nombre"], "hiperparametros": ganador["hiperparametros"]},
        "algoritmo": f"{type(final.named_steps['modelo']).__name__}({ganador['hiperparametros']})",
        "comparacion": comparacion,
        "seleccion": seleccion,
        "fecha_comparacion": metadatos["fecha_entrenamiento"],
    })
    _guardar_modelo(final, metadatos, destinos, dir_modelos)

    dir_reportes.mkdir(parents=True, exist_ok=True)
    imagenes: list[str] = []
    if graficos:
        try:
            imagenes = graficar(comparacion, pipelines[clave], ganador["nombre"], x_p, y_p, fechas[~es_entrena], dir_reportes)
        except ImportError:
            print("  ⚠ Sin matplotlib no se generan los gráficos (pip install -r requirements-dev.txt).")
    pd.DataFrame(comparacion)[COLUMNAS_COMPARACION + ["hiperparametros"]].assign(
        hiperparametros=lambda d: d["hiperparametros"].map(lambda h: json.dumps(h, ensure_ascii=False))
    ).to_csv(dir_reportes / "comparacion_modelos.csv", index=False, encoding="utf-8")
    (dir_reportes / "comparacion_modelos.md").write_text(reporte_comparacion(metadatos, imagenes), encoding="utf-8")
    (dir_reportes / config.GANADOR_ARCHIVO.name).write_text(json.dumps({
        "modelo": clave, "hiperparametros": ganador["hiperparametros"], "fecha_comparacion": metadatos["fecha_comparacion"],
        "origen_datos": dataset, "seleccion": seleccion, "comparacion": comparacion,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    return metadatos


def entrenar(
    dataset: str,
    ruta_datos: Path | None = None,
    destinos: pd.DataFrame | None = None,
    dir_modelos: Path = config.DIR_MODELOS,
    dir_reportes: Path = config.DIR_REPORTES,
    modelo: str | None = None,
    hiperparametros: dict | None = None,
    archivo_ganador: Path = config.GANADOR_ARCHIVO,
) -> dict:
    """Entrenamiento rápido, sin búsqueda: el ganador de la última comparación (o `modelo`)
    con hiperparámetros fijos. Mide al modelo contra el baseline en la división temporal y
    guarda el modelo entrenado con todas las filas."""
    previo = json.loads(archivo_ganador.read_text(encoding="utf-8")) if archivo_ganador.exists() else None
    if modelo is None:
        modelo = previo["modelo"] if previo else "hist_gradient_boosting"
    if hiperparametros is None:
        hiperparametros = previo["hiperparametros"] if previo and previo["modelo"] == modelo else HIPERPARAMETROS_POR_DEFECTO[modelo]

    dataset, ruta_datos, destinos, x, y, fechas = _cargar(dataset, ruta_datos, destinos)
    es_entrena, corte = division_temporal(fechas)
    x_e, y_e, x_p, y_p = x[es_entrena], y[es_entrena], x[~es_entrena], y[~es_entrena]
    pipeline = construir_pipeline(modelo, **hiperparametros)
    pipeline.fit(*agregar_filas_sin_clima(x_e, y_e))
    m_modelo = metricas(y_p, predecir(pipeline, x_p))
    m_base = metricas(y_p, predecir_baseline(x_e, y_e, x_p))

    final = construir_pipeline(modelo, **hiperparametros)
    final.fit(*agregar_filas_sin_clima(x, y))
    metadatos = _metadatos_base(dataset, ruta_datos, x, fechas, es_entrena, corte, m_modelo, m_base)
    metadatos.update({
        "modelo": {"clave": modelo, "nombre": config.NOMBRES_MODELO[modelo], "hiperparametros": hiperparametros},
        "algoritmo": f"{type(final.named_steps['modelo']).__name__}({hiperparametros})",
        # La comparativa es la de la última corrida de --comparar (si existe).
        "comparacion": previo["comparacion"] if previo else [],
        "seleccion": previo["seleccion"] if previo else None,
        "fecha_comparacion": previo["fecha_comparacion"] if previo else None,
    })
    _guardar_modelo(final, metadatos, destinos, dir_modelos)
    dir_reportes.mkdir(parents=True, exist_ok=True)
    sello = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    (dir_reportes / f"entrenamiento_{dataset}_{sello}.md").write_text(reporte_markdown(metadatos), encoding="utf-8")
    return metadatos


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------
def _aviso(m: dict) -> str:
    return ("> ⚠ **Datos SIMULADOS** (`simulado_calibrado`): calibrados con datos reales, pero la ocupación no es una "
            "medición real. Las métricas muestran que el sistema funciona y comparan los modelos entre sí; no son la "
            "precisión que tendrán con datos reales.\n\n") if m["datos_sinteticos"] else ""


def reporte_markdown(m: dict) -> str:
    fila = lambda nombre, d: f"| {nombre} | {d['mae']} | {d['rmse']} | {d['r2']} |"  # noqa: E731
    return (
        f"# Reporte de entrenamiento ({m['fecha_entrenamiento']})\n\n{_aviso(m)}"
        f"- Datos: **{m['origen_datos']}** (`{m['archivo_datos']}`), {m['filas']:,} filas, {m['rango_fechas'][0]} a {m['rango_fechas'][1]}\n"
        f"- Validación temporal: entrenamiento antes de {m['corte_validacion']} ({m['filas_entrenamiento']:,} filas), "
        f"prueba desde esa fecha ({m['filas_prueba']:,} filas)\n"
        f"- Modelo: **{m['modelo']['nombre']}** `{m['algoritmo']}`\n"
        f"- Listo para producción: **{'sí' if m['listo_para_produccion'] else 'no'}**\n\n"
        "| Modelo | MAE (puntos %) | RMSE | R² |\n| --- | --- | --- | --- |\n"
        f"{fila(m['modelo']['nombre'], m['metricas']['modelo'])}\n{fila(config.NOMBRES_MODELO['baseline'], m['metricas']['baseline'])}\n\n"
        + ("## Advertencias\n\n" + "\n".join(f"- {a}" for a in m["advertencias"]) + "\n" if m["advertencias"] else "")
    )


def _num(v, decimales=2) -> str:
    return "—" if v is None else (f"{v:.{decimales}f}" if isinstance(v, float) else str(v))


def reporte_comparacion(m: dict, imagenes: list[str]) -> str:
    comp = m["comparacion"]
    categorias = sorted({c for r in comp for c in r["mae_por_categoria"]})
    temporadas = sorted({t for r in comp for t in r["mae_por_temporada"]})
    lineas = [
        "# Comparación de modelos de ocupación",
        "",
        _aviso(m).rstrip(),
        "",
        f"- Fecha: {m['fecha_comparacion']} · datos: **{m['origen_datos']}** (`{m['archivo_datos']}`), {m['filas']:,} filas, "
        f"{m['rango_fechas'][0][:10]} a {m['rango_fechas'][1][:10]}",
        f"- Validación temporal: entrenamiento hasta el {m['corte_validacion']} ({m['filas_entrenamiento']:,} filas); "
        f"prueba con los últimos {config.MESES_PRUEBA} meses ({m['filas_prueba']:,} filas).",
        f"- Hiperparámetros: RandomizedSearchCV (semilla {config.SEMILLA}) con TimeSeriesSplit de "
        f"{config.PLIEGUES_BUSQUEDA} pliegues sobre una muestra ordenada de hasta {config.MUESTRA_BUSQUEDA:,} filas del entrenamiento.",
        f"- Criterio: {m['seleccion']['criterio']}",
        "",
        "## Resultados en la prueba",
        "",
        "| Modelo | MAE | RMSE | R² | RMSE con clima nulo | Entrenamiento (s) | Archivo (MB) | Predicción (ms) | Memoria al cargar (MB) | Cumple restricciones |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for r in comp:
        nombre = f"**{r['nombre']}** 🏆" if r.get("ganador") else r["nombre"]
        cumple = "—" if r["cumple_restricciones"] is None else ("sí" if r["cumple_restricciones"] else "no")
        lineas.append(f"| {nombre} | {_num(r['mae'])} | {_num(r['rmse'])} | {_num(r['r2'], 3)} | {_num(r['rmse_sin_clima'])} | "
                      f"{_num(r['tiempo_entrenamiento_s'], 1)} | {_num(r['tamano_mb'])} | {_num(r['ms_prediccion'])} | "
                      f"{_num(r['memoria_mb'], 1)} | {cumple} |")
    lineas += [
        "",
        "MAE y RMSE en puntos porcentuales de ocupación (0–100).",
        "",
        f"## Ganador: {m['seleccion']['nombre']}",
        "",
        m["seleccion"]["motivo"],
        "",
        f"Hiperparámetros: `{json.dumps(m['modelo']['hiperparametros'], ensure_ascii=False)}`. "
        "El modelo guardado se reentrenó con todas las filas.",
        "",
        "## MAE por categoría",
        "",
        "| Modelo | " + " | ".join(categorias) + " |",
        "| --- | " + " | ".join("---" for _ in categorias) + " |",
        *[f"| {r['nombre']} | " + " | ".join(_num(r["mae_por_categoria"].get(c)) for c in categorias) + " |" for r in comp],
        "",
        "## MAE por temporada",
        "",
        "| Modelo | " + " | ".join(temporadas) + " |",
        "| --- | " + " | ".join("---" for _ in temporadas) + " |",
        *[f"| {r['nombre']} | " + " | ".join(_num(r["mae_por_temporada"].get(t)) for t in temporadas) + " |" for r in comp],
        "",
        "## Hiperparámetros elegidos",
        "",
        *[f"- {r['nombre']}: `{json.dumps(r['hiperparametros'], ensure_ascii=False)}`" for r in comp if r["clave"] != "baseline"],
        "",
    ]
    if imagenes:
        lineas += ["## Gráficos", ""] + [f"![{i}]({i})" for i in imagenes] + [""]
    if m["advertencias"]:
        lineas += ["## Advertencias", ""] + [f"- {a}" for a in m["advertencias"]] + [""]
    return "\n".join(lineas)


def graficar(comparacion: list[dict], pipeline, nombre_ganador: str, x_p: pd.DataFrame, y_p: pd.Series,
             fechas_p: pd.Series, dir_salida: Path) -> list[str]:
    import graficos
    from sklearn.inspection import permutation_importance

    plt = graficos.plt()
    imagenes = []

    # 1. MAE y RMSE por modelo (misma unidad: puntos porcentuales).
    nombres = [r["nombre"].split(" (")[0] for r in comparacion]
    fig, ax = plt.subplots(figsize=(8, 3.6))
    posiciones = np.arange(len(comparacion))
    for i, (clave, etiqueta) in enumerate((("mae", "MAE"), ("rmse", "RMSE"))):
        valores = [r[clave] for r in comparacion]
        barras = ax.bar(posiciones + (i - 0.5) * 0.36, valores, width=0.34, color=graficos.SERIES[i], label=etiqueta)
        ax.bar_label(barras, fmt="%.2f", fontsize=8, color=graficos.TEXTO_SECUNDARIO, padding=2)
    ax.set_xticks(posiciones, nombres)
    ax.set_ylabel("Error (puntos de ocupación)")
    ax.set_title("Error en la prueba por modelo (menor es mejor)")
    ax.legend(loc="upper left")
    graficos.guardar(fig, dir_salida / "comparacion_metricas.png")
    imagenes.append("comparacion_metricas.png")

    # 2. Real vs. predicho del ganador en una semana (destino con más ocupación media).
    prueba = x_p.assign(real=y_p.to_numpy(), pred=predecir(pipeline, x_p), fh=fechas_p.to_numpy())
    destino = prueba.groupby("id_destino")["real"].mean().idxmax()
    serie = prueba[prueba["id_destino"] == destino].set_index("fh").sort_index()
    inicio = serie.index.min().normalize()
    semana = serie[serie.index < inicio + pd.Timedelta(days=7)]
    horas = pd.date_range(inicio, inicio + pd.Timedelta(days=7), freq="h", inclusive="left")
    semana = semana.reindex(horas)  # horas cerradas en blanco: la línea no las une
    fig, ax = plt.subplots(figsize=(9, 3.6))
    ax.plot(semana.index, semana["real"], color=graficos.SERIES[0], label="Simulado (real del dataset)")
    ax.plot(semana.index, semana["pred"], color=graficos.SERIES[1], label=f"Predicho ({nombre_ganador})", linestyle="--")
    ax.set_ylabel("Ocupación (%)")
    ax.set_title(f"Real vs. predicho, destino {destino}, semana del {inicio.date()}")
    ax.set_ylim(0, 115)
    ax.legend(loc="upper left", ncol=2)
    fig.autofmt_xdate()
    graficos.guardar(fig, dir_salida / "comparacion_real_vs_predicho.png")
    imagenes.append("comparacion_real_vs_predicho.png")

    # 3. Importancia de variables del ganador (por permutación, sobre la prueba).
    muestra = x_p.sample(min(5000, len(x_p)), random_state=config.SEMILLA)
    imp = permutation_importance(pipeline, muestra, y_p.loc[muestra.index], n_repeats=3,
                                 random_state=config.SEMILLA, scoring="neg_root_mean_squared_error")
    orden = pd.Series(imp.importances_mean, index=muestra.columns).sort_values().tail(12)
    fig, ax = plt.subplots(figsize=(8, 4.2))
    ax.barh(orden.index, orden.to_numpy(), color=graficos.SERIES[0], height=0.6)
    ax.set_xlabel("Aumento del RMSE al desordenar la variable (puntos)")
    ax.set_title(f"Importancia de variables ({nombre_ganador})")
    graficos.guardar(fig, dir_salida / "comparacion_importancia_variables.png")
    imagenes.append("comparacion_importancia_variables.png")
    return imagenes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Entrena (y compara) los modelos de ocupación.")
    config.agregar_argumento_dataset(parser)
    parser.add_argument("--archivo", type=Path, help="CSV a usar en vez del del dataset activo.")
    parser.add_argument("--comparar", action="store_true", help="Compara los tres modelos y guarda al ganador.")
    parser.add_argument("--sin-busqueda", action="store_true", help="Con --comparar: hiperparámetros por defecto, sin búsqueda.")
    parser.add_argument("--modelo", choices=config.MODELOS, help="Sin --comparar: modelo a entrenar (por defecto, el último ganador).")
    args = parser.parse_args(argv)
    dataset = config.dataset_activo(args.dataset)
    if args.comparar:
        print(f"Comparando modelos con datos {dataset.upper()}…")
        m = comparar(dataset, args.archivo, buscar=not args.sin_busqueda)
        print(reporte_comparacion(m, []))
        print(f"Reportes en {config.DIR_REPORTES} (comparacion_modelos.md, .csv y gráficos).")
    else:
        print(f"Entrenando con datos {dataset.upper()} (sin búsqueda)…")
        m = entrenar(dataset, args.archivo, modelo=args.modelo)
        print(reporte_markdown(m))
    for a in m["advertencias"]:
        print(f"⚠ {a}")
    print(f"Modelo guardado en {config.MODELO_ARCHIVO} (metadatos: {config.METADATOS_ARCHIVO.name}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
