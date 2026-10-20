"""
Entrena y compara los tres modelos de ocupación y guarda los tres artefactos y el ganador.

Uso (desde ml/; entrenar_modelo.py es un lanzador de este módulo):
    python entrenar_modelo.py --comparar [--dataset simulado|real] [--sin-busqueda]
        Entrena Ridge, Random Forest y gradient boosting (más el baseline como referencia),
        elige al ganador y guarda en ml/artefactos/ los TRES modelos con sus metadatos,
        ganador.json y baseline.json; en ml/reportes/, comparacion_modelos.md, .csv y gráficos.
    python entrenar_modelo.py [--dataset simulado|real] [--modelo gradient_boosting]
        Entrenamiento rápido: SOLO el ganador de la última comparación (ganador.json) con sus
        hiperparámetros fijos, sin búsqueda. Los otros dos artefactos no se tocan.

Metodología (--comparar):
1. Valida el dataset (si tiene errores, no entrena).
2. Validación TEMPORAL: entrena con los meses antiguos y prueba con los últimos
   MESES_PRUEBA meses (nunca mezcla fechas al azar: así se mide cómo predice el futuro).
3. Hiperparámetros: RandomizedSearchCV pequeña y reproducible (semilla 42) con
   TimeSeriesSplit sobre una muestra ordenada del entrenamiento.
4. Cada modelo se entrena (más una copia del 20 % de las filas sin clima, para que aprenda el
   caso "sin pronóstico") y se mide en la prueba: MAE, RMSE, R², MAE por categoría y por
   temporada, RMSE con clima nulo, tiempo de entrenamiento, tamaño, tiempo de una predicción y
   memoria al cargarlo. Si un modelo pasa de MB_OBJETIVO_VERSIONADO se intenta reducir sin
   empeorar su RMSE más de TOLERANCIA_REDUCCION (evaluacion.reducir_si_pesa).
5. Selección: entre los que cumplen las restricciones de despliegue (≤ MAX_MB_MODELO MB y
   < MAX_MS_PREDICCION ms por predicción), gana el de menor RMSE; si otro está a menos del
   TOLERANCIA_RMSE (2 %), gana el más liviano.
6. Los TRES modelos se reentrenan con TODAS las filas y se guardan en ml/artefactos/. El
   ganador atiende en producción; los otros dos quedan de respaldo (por RMSE) y como evidencia.

Un modelo solo queda "listo para producción" si se entrenó con datos REALES, cada destino
tiene al menos SEMANAS_MINIMAS_PRODUCCION semanas de datos y supera al baseline.
"""
from __future__ import annotations

import argparse
import gc
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from misanandres_ml import config
from misanandres_ml.comun import leer_dataset, leer_destinos
from misanandres_ml.datos.preparar_dataset import FEATURES, agregar_filas_sin_clima, preparar
from misanandres_ml.datos.validar_dataset import validar
from misanandres_ml.modelos import HIPERPARAMETROS_POR_DEFECTO, construir_pipeline, normalizar_clave
from misanandres_ml.modelos.artefactos import escribir_json, guardar_modelo, leer_ganador
from misanandres_ml.modelos.evaluacion import (
    buscar_hiperparametros,
    division_temporal,
    elegir_ganador,
    evaluar,
    mae_por,
    metricas,
    orden_respaldo,
    predecir,
    predecir_baseline,
    reducir_si_pesa,
    semanas_por_destino,
    tabla_baseline,
    temporada_de,
)

COLUMNAS_COMPARACION = [
    "clave", "nombre", "mae", "rmse", "r2", "rmse_sin_clima", "tiempo_entrenamiento_s", "tamano_mb",
    "ms_prediccion", "memoria_mb", "cumple_restricciones", "ganador",
]


# ---------------------------------------------------------------------------
# Carga y metadatos
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


def _metadatos_base(dataset, ruta_datos, x, fechas, es_entrena, corte, metricas_modelo, metricas_base) -> dict:
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
    supera = metricas_modelo["mae"] < metricas_base["mae"]
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
        "metricas": {"modelo": metricas_modelo, "baseline": metricas_base},
        "columnas": FEATURES,
        "umbrales_nivel": {"bajo_menor_que": config.LIMITE_BAJO, "alto_mayor_que": config.LIMITE_ALTO},
    }


def _metadatos_modelo(base: dict, resultado: dict, es_ganador: bool, seleccion: dict | None, pipeline) -> dict:
    return {
        **base,
        "metricas": {"modelo": {k: resultado[k] for k in ("mae", "rmse", "r2")}, "baseline": base["metricas"]["baseline"]},
        "modelo": {"clave": resultado["clave"], "nombre": resultado["nombre"], "hiperparametros": resultado["hiperparametros"]},
        "algoritmo": f"{type(pipeline.named_steps['modelo']).__name__}({resultado['hiperparametros']})",
        "es_ganador": es_ganador,
        "seleccion": seleccion,
        "reduccion": resultado.get("reduccion"),
    }


# ---------------------------------------------------------------------------
# Comparación completa
# ---------------------------------------------------------------------------
def comparar(
    dataset: str,
    ruta_datos: Path | None = None,
    destinos: pd.DataFrame | None = None,
    dir_artefactos: Path = config.DIR_ARTEFACTOS,
    dir_reportes: Path = config.DIR_REPORTES,
    modelos: tuple[str, ...] = config.MODELOS,
    buscar: bool = True,
    hiperparametros: dict[str, dict] | None = None,
    graficos: bool = True,
) -> dict:
    """Entrena y mide los modelos, elige al ganador y guarda los tres artefactos.
    Devuelve el contenido de ganador.json."""
    dataset, ruta_datos, destinos, x, y, fechas = _cargar(dataset, ruta_datos, destinos)
    es_entrena, corte = division_temporal(fechas)
    x_e, y_e, x_p, y_p = x[es_entrena], y[es_entrena], x[~es_entrena], y[~es_entrena]

    resultados: list[dict] = []
    pipelines: dict[str, object] = {}
    for clave in modelos:
        if hiperparametros and clave in hiperparametros:
            hiper = hiperparametros[clave]
        elif buscar:
            print(f"  Buscando hiperparámetros de {config.NOMBRES_MODELO[clave]}…")
            hiper = buscar_hiperparametros(clave, x_e, y_e)
        else:
            hiper = HIPERPARAMETROS_POR_DEFECTO[clave]
        print(f"  Entrenando {config.NOMBRES_MODELO[clave]} con {hiper}…")
        resultado, pipeline = evaluar(clave, hiper, x_e, y_e, x_p, y_p)
        resultado, pipeline, reduccion = reducir_si_pesa(resultado, pipeline, x_e, y_e, x_p, y_p)
        resultado["reduccion"] = reduccion
        if reduccion:
            print(f"    {reduccion['motivo']}")
        resultados.append(resultado)
        pipelines[clave] = pipeline

    pred_base = predecir_baseline(x_e, y_e, x_p)
    baseline = {
        "clave": "baseline", "nombre": config.NOMBRES_MODELO["baseline"], **metricas(y_p, pred_base),
        "rmse_sin_clima": metricas(y_p, pred_base)["rmse"],
        "mae_por_categoria": mae_por(y_p, pred_base, x_p["categoria"]),
        "mae_por_temporada": mae_por(y_p, pred_base, temporada_de(x_p)),
        "tiempo_entrenamiento_s": None, "tamano_mb": None, "ms_prediccion": None, "memoria_mb": None,
        "cumple_restricciones": None, "hiperparametros": {}, "reduccion": None,
    }

    clave_ganador, motivo = elegir_ganador(resultados)
    for r in resultados:
        r["ganador"] = r["clave"] == clave_ganador
    baseline["ganador"] = False
    ganador = next(r for r in resultados if r["clave"] == clave_ganador)
    comparacion = [*resultados, baseline]
    seleccion = {
        "ganador": clave_ganador,
        "nombre": ganador["nombre"],
        "motivo": motivo,
        "criterio": (f"Menor RMSE en la prueba (últimos {config.MESES_PRUEBA} meses); si la diferencia es menor al "
                     f"{config.TOLERANCIA_RMSE:.0%}, el más liviano. Restricciones: ≤ {config.MAX_MB_MODELO} MB y "
                     f"< {config.MAX_MS_PREDICCION} ms por predicción."),
    }
    metricas_base = {k: baseline[k] for k in ("mae", "rmse", "r2")}
    base = _metadatos_base(dataset, ruta_datos, x, fechas, es_entrena, corte,
                           {k: ganador[k] for k in ("mae", "rmse", "r2")}, metricas_base)

    # Solo el ganador de la prueba se necesita para los gráficos: liberar los otros baja el pico de memoria.
    pipelines = {clave_ganador: pipelines[clave_ganador]}
    gc.collect()

    # Los tres se reentrenan con todas las filas y se guardan (el ganador atiende; los otros, respaldo).
    artefactos: dict[str, dict] = {}
    for r in resultados:
        print(f"  Reentrenando {r['nombre']} con todas las filas…")
        final = construir_pipeline(r["clave"], **r["hiperparametros"])
        final.fit(*agregar_filas_sin_clima(x, y))
        meta = _metadatos_modelo(base, r, r["ganador"], seleccion if r["ganador"] else None, final)
        artefactos[r["clave"]] = guardar_modelo(r["clave"], final, meta, destinos, dir_artefactos)
        del final
        gc.collect()

    escribir_json(dir_artefactos / config.NOMBRE_BASELINE, {
        "descripcion": "Promedio histórico de ocupación por destino y hora (todas las filas). Referencia de /comparar.",
        "metricas_prueba": metricas_base,
        **tabla_baseline(x, y),
    })
    indice = {
        "modelo": clave_ganador,
        "nombre": ganador["nombre"],
        "hiperparametros": ganador["hiperparametros"],
        "fecha_comparacion": base["fecha_entrenamiento"],
        "origen_datos": dataset,
        "origen_dato": base["origen_dato"],
        "datos_sinteticos": base["datos_sinteticos"],
        "listo_para_produccion": base["listo_para_produccion"],
        "advertencias": base["advertencias"],
        "corte_validacion": base["corte_validacion"],
        "orden_respaldo": [c for c in orden_respaldo(comparacion, clave_ganador) if artefactos[c]["versionado"]],
        "artefactos": artefactos,
        "seleccion": seleccion,
        "comparacion": comparacion,
    }
    escribir_json(dir_artefactos / config.NOMBRE_GANADOR, indice)

    dir_reportes.mkdir(parents=True, exist_ok=True)
    imagenes: list[str] = []
    if graficos:
        try:
            from misanandres_ml.modelos.graficos import graficar

            imagenes = graficar(comparacion, pipelines[clave_ganador], ganador["nombre"], x_p, y_p, fechas[~es_entrena], dir_reportes)
        except ImportError:
            print("  ⚠ Sin matplotlib no se generan los gráficos (pip install -r requirements-dev.txt).")
    pd.DataFrame(comparacion)[COLUMNAS_COMPARACION + ["hiperparametros"]].assign(
        hiperparametros=lambda d: d["hiperparametros"].map(lambda h: json.dumps(h, ensure_ascii=False))
    ).to_csv(dir_reportes / "comparacion_modelos.csv", index=False, encoding="utf-8")
    (dir_reportes / "comparacion_modelos.md").write_text(reporte_comparacion(indice, base, imagenes), encoding="utf-8")
    return indice


# ---------------------------------------------------------------------------
# Entrenamiento rápido (solo el ganador)
# ---------------------------------------------------------------------------
def entrenar(
    dataset: str,
    ruta_datos: Path | None = None,
    destinos: pd.DataFrame | None = None,
    dir_artefactos: Path = config.DIR_ARTEFACTOS,
    dir_reportes: Path = config.DIR_REPORTES,
    modelo: str | None = None,
    hiperparametros: dict | None = None,
) -> dict:
    """Sin búsqueda: el ganador de la última comparación (o `modelo`) con hiperparámetros fijos.
    Lo mide contra el baseline y reemplaza solo su artefacto. Devuelve sus metadatos."""
    previo = leer_ganador(dir_artefactos)
    modelo = normalizar_clave(modelo) if modelo else (previo["modelo"] if previo else "gradient_boosting")
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
    base = _metadatos_base(dataset, ruta_datos, x, fechas, es_entrena, corte, m_modelo, m_base)
    es_ganador = bool(previo and previo["modelo"] == modelo)
    resultado = {"clave": modelo, "nombre": config.NOMBRES_MODELO[modelo], **m_modelo, "hiperparametros": hiperparametros}
    metadatos = _metadatos_modelo(base, resultado, es_ganador, previo.get("seleccion") if es_ganador else None, final)
    info = guardar_modelo(modelo, final, metadatos, destinos, dir_artefactos)
    if previo:
        previo.setdefault("artefactos", {})[modelo] = info
        escribir_json(dir_artefactos / config.NOMBRE_GANADOR, previo)
    dir_reportes.mkdir(parents=True, exist_ok=True)
    sello = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    (dir_reportes / f"entrenamiento_{dataset}_{sello}.md").write_text(reporte_markdown(metadatos), encoding="utf-8")
    return metadatos


# ---------------------------------------------------------------------------
# Reportes
# ---------------------------------------------------------------------------
def _aviso(sintetico: bool) -> str:
    return ("> ⚠ **Datos SIMULADOS** (`simulado_calibrado`): calibrados con datos reales, pero la ocupación no es una "
            "medición real. Las métricas muestran que el sistema funciona y comparan los modelos entre sí; no son la "
            "precisión que tendrán con datos reales.\n\n") if sintetico else ""


def reporte_markdown(m: dict) -> str:
    fila = lambda nombre, d: f"| {nombre} | {d['mae']} | {d['rmse']} | {d['r2']} |"  # noqa: E731
    return (
        f"# Reporte de entrenamiento ({m['fecha_entrenamiento']})\n\n{_aviso(m['datos_sinteticos'])}"
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


def reporte_comparacion(indice: dict, base: dict, imagenes: list[str]) -> str:
    comp = indice["comparacion"]
    categorias = sorted({c for r in comp for c in r["mae_por_categoria"]})
    temporadas = sorted({t for r in comp for t in r["mae_por_temporada"]})
    lineas = [
        "# Comparación de modelos de ocupación",
        "",
        _aviso(indice["datos_sinteticos"]).rstrip(),
        "",
        f"- Fecha: {indice['fecha_comparacion']} · datos: **{indice['origen_datos']}** (`{base['archivo_datos']}`), {base['filas']:,} filas, "
        f"{base['rango_fechas'][0][:10]} a {base['rango_fechas'][1][:10]}",
        f"- Validación temporal: entrenamiento hasta el {base['corte_validacion']} ({base['filas_entrenamiento']:,} filas); "
        f"prueba con los últimos {config.MESES_PRUEBA} meses ({base['filas_prueba']:,} filas).",
        f"- Hiperparámetros: RandomizedSearchCV (semilla {config.SEMILLA}) con TimeSeriesSplit de "
        f"{config.PLIEGUES_BUSQUEDA} pliegues sobre una muestra ordenada de hasta {config.MUESTRA_BUSQUEDA:,} filas del entrenamiento.",
        f"- Criterio: {indice['seleccion']['criterio']}",
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
        f"## Ganador: {indice['seleccion']['nombre']}",
        "",
        indice["seleccion"]["motivo"],
        "",
        f"Hiperparámetros: `{json.dumps(indice['hiperparametros'], ensure_ascii=False)}`. "
        "Los tres modelos se reentrenaron con todas las filas y se guardaron en `ml/artefactos/`.",
        "",
        "## Producción y respaldo",
        "",
        f"- En uso: **{indice['seleccion']['nombre']}** (el único que el servicio carga al arrancar).",
        "- Orden de respaldo si el ganador no carga: "
        + " → ".join(config.NOMBRES_MODELO[c] for c in indice["orden_respaldo"]) + ".",
        "",
        "| Modelo | Archivo | Tamaño (MB) | Versionado |",
        "| --- | --- | --- | --- |",
        *[f"| {config.NOMBRES_MODELO[c]} | {a['archivo'] or '—'} | {_num(a['tamano_mb'])} | "
          f"{'sí' if a['versionado'] else 'solo metadatos'} |" for c, a in indice["artefactos"].items()],
        "",
    ]
    reducidos = [r for r in comp if r.get("reduccion")]
    if reducidos:
        lineas += ["## Reducción de tamaño", ""]
        for r in reducidos:
            red = r["reduccion"]
            lineas.append(f"- {r['nombre']}: {red['motivo']} Objetivo {red['objetivo_mb']} MB; RMSE máximo aceptado {red['limite_rmse']}.")
            lineas += [f"  - {p['ajuste']}: RMSE {p['rmse']}, {p['tamano_mb']} MB" for p in red["probadas"]]
        lineas.append("")
    lineas += [
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
    if indice["advertencias"]:
        lineas += ["## Advertencias", ""] + [f"- {a}" for a in indice["advertencias"]] + [""]
    return "\n".join(lineas)


# ---------------------------------------------------------------------------
# Línea de comandos
# ---------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Entrena (y compara) los modelos de ocupación.")
    config.agregar_argumento_dataset(parser)
    parser.add_argument("--archivo", type=Path, help="CSV a usar en vez del del dataset activo.")
    parser.add_argument("--comparar", action="store_true", help="Entrena y compara los tres modelos y guarda los tres artefactos.")
    parser.add_argument("--sin-busqueda", action="store_true", help="Con --comparar: hiperparámetros por defecto, sin búsqueda.")
    parser.add_argument("--modelo", choices=(*config.MODELOS, *config.ALIAS_MODELO),
                        help="Sin --comparar: modelo a entrenar (por defecto, el último ganador).")
    args = parser.parse_args(argv)
    dataset = config.dataset_activo(args.dataset)
    if args.comparar:
        print(f"Comparando modelos con datos {dataset.upper()}…")
        indice = comparar(dataset, args.archivo, buscar=not args.sin_busqueda)
        print(f"\nGanador: {indice['nombre']} — {indice['seleccion']['motivo']}")
        for clave, info in indice["artefactos"].items():
            estado = f"{info['tamano_mb']} MB" if info["versionado"] else f"solo metadatos ({info['motivo']})"
            print(f"  {config.NOMBRES_MODELO[clave]}: {estado}")
        print(f"Artefactos en {config.DIR_ARTEFACTOS}; reportes en {config.DIR_REPORTES}.")
        advertencias = indice["advertencias"]
    else:
        print(f"Entrenando con datos {dataset.upper()} (sin búsqueda)…")
        m = entrenar(dataset, args.archivo, modelo=args.modelo)
        print(reporte_markdown(m))
        print(f"Modelo guardado en {config.ruta_modelo(m['modelo']['clave'])}.")
        advertencias = m["advertencias"]
    for a in advertencias:
        print(f"⚠ {a}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
