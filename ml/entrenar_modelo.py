"""
Entrena el modelo de ocupación (RandomForestRegressor) y lo compara con un baseline.

Uso:  python entrenar_modelo.py [--dataset mock|real]

1. Valida el dataset (si tiene errores, no entrena).
2. Validación TEMPORAL: entrena con el primer 80 % de las fechas y prueba con el 20 %
   más reciente (nunca se mezclan fechas al azar: así se mide cómo predice el futuro).
3. Baseline: promedio histórico del entrenamiento por destino y hora (el mismo enfoque
   del predictor heurístico del backend, sin factores).
4. Reporta MAE, RMSE y R² de ambos.
5. Reentrena con todas las filas y guarda en ml/modelos/ el modelo (joblib) con sus
   metadatos (fecha, métricas, columnas, destinos, si los datos eran sintéticos o reales
   y si está listo para producción) y el reporte en ml/reportes/.

Un modelo solo queda "listo para producción" si se entrenó con datos REALES, cada destino
tiene al menos SEMANAS_MINIMAS_PRODUCCION semanas de datos y supera al baseline.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

import config
from comun import leer_dataset, leer_destinos
from preparar_dataset import FEATURES, construir_pipeline, preparar
from validar_dataset import validar


def metricas(real: pd.Series, predicho: np.ndarray) -> dict:
    return {
        "mae": round(float(mean_absolute_error(real, predicho)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(real, predicho))), 3),
        "r2": round(float(r2_score(real, predicho)), 4),
    }


def division_temporal(fechas: pd.Series, fraccion_prueba: float) -> tuple[pd.Series, pd.Timestamp]:
    """Máscara de entrenamiento (fechas anteriores al corte) y fecha de corte."""
    dias = np.sort(fechas.dt.normalize().unique())
    if len(dias) < 2:
        raise ValueError("Se necesitan al menos 2 días distintos para la validación temporal.")
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


def entrenar(
    dataset: str,
    ruta_datos: Path | None = None,
    destinos: pd.DataFrame | None = None,
    dir_modelos: Path = config.DIR_MODELOS,
    dir_reportes: Path = config.DIR_REPORTES,
    n_estimadores: int = config.N_ESTIMADORES,
) -> dict:
    dataset = config.dataset_activo(dataset)
    ruta_datos = ruta_datos or config.ruta_dataset(dataset)
    destinos = destinos if destinos is not None else leer_destinos()
    datos = leer_dataset(ruta_datos)

    reporte_validacion = validar(datos, destinos)
    if not reporte_validacion.ok:
        print(reporte_validacion.texto())
        raise SystemExit("✘ El dataset tiene errores: no se entrenó el modelo.")

    x, y, fechas = preparar(datos, destinos)
    es_entrena, corte = division_temporal(fechas, config.FRACCION_PRUEBA)
    x_e, y_e, x_p, y_p = x[es_entrena], y[es_entrena], x[~es_entrena], y[~es_entrena]

    pipeline = construir_pipeline(n_estimadores)
    pipeline.fit(x_e, y_e)
    pred_modelo = np.clip(pipeline.predict(x_p), 0, 100)
    pred_base = predecir_baseline(x_e, y_e, x_p)
    resultado = {"modelo": metricas(y_p, pred_modelo), "baseline": metricas(y_p, pred_base)}

    # Modelo final: todas las filas (las métricas anteriores vienen de la validación temporal).
    final = construir_pipeline(n_estimadores)
    final.fit(x, y)

    semanas = semanas_por_destino(x, fechas)
    minimo_semanas = min(semanas.values()) if semanas else 0.0
    advertencias: list[str] = []
    if dataset == "mock":
        advertencias.append("Entrenado con datos SINTÉTICOS: las predicciones son una demostración, no reflejan la afluencia real.")
    if minimo_semanas < config.SEMANAS_MINIMAS_PRODUCCION:
        pocos = [k for k, v in semanas.items() if v < config.SEMANAS_MINIMAS_PRODUCCION]
        advertencias.append(
            f"Pocos datos: {len(pocos)} destino(s) con menos de {config.SEMANAS_MINIMAS_PRODUCCION} semanas "
            f"(mínimo {minimo_semanas} semanas). El modelo NO queda listo para producción."
        )
    supera_baseline = resultado["modelo"]["mae"] < resultado["baseline"]["mae"]
    if not supera_baseline:
        advertencias.append("El modelo no mejora al baseline (MAE): conviene revisar los datos antes de usarlo.")
    listo = dataset == "real" and minimo_semanas >= config.SEMANAS_MINIMAS_PRODUCCION and supera_baseline

    ahora = datetime.now(timezone.utc)
    metadatos = {
        "fecha_entrenamiento": ahora.isoformat(timespec="seconds"),
        "origen_datos": dataset,
        "datos_sinteticos": dataset == "mock",
        "listo_para_produccion": listo,
        "advertencias": advertencias,
        "archivo_datos": str(ruta_datos.name),
        "filas": int(len(x)),
        "filas_entrenamiento": int(es_entrena.sum()),
        "filas_prueba": int((~es_entrena).sum()),
        "rango_fechas": [str(fechas.min()), str(fechas.max())],
        "corte_validacion": str(corte.date()),
        "metricas": resultado,
        "semanas_por_destino": semanas,
        "columnas": FEATURES,
        "algoritmo": f"RandomForestRegressor(n_estimators={n_estimadores}, random_state={config.SEMILLA}, "
                     f"min_samples_leaf={config.MIN_MUESTRAS_HOJA})",
        "umbrales_nivel": {"bajo_menor_que": config.LIMITE_BAJO, "alto_mayor_que": config.LIMITE_ALTO},
    }

    dir_modelos.mkdir(parents=True, exist_ok=True)
    dir_reportes.mkdir(parents=True, exist_ok=True)
    paquete = {
        "pipeline": final,
        "metadatos": metadatos,
        "destinos": destinos[["id_destino", "nombre", "capacidad", "categoria", "horario_apertura", "horario_cierre"]]
        .astype({"horario_apertura": "string", "horario_cierre": "string"})
        .to_dict("records"),
    }
    joblib.dump(paquete, dir_modelos / config.MODELO_ARCHIVO.name, compress=3)
    (dir_modelos / config.METADATOS_ARCHIVO.name).write_text(json.dumps(metadatos, indent=2, ensure_ascii=False), encoding="utf-8")
    sello = ahora.strftime("%Y%m%d-%H%M%S")
    (dir_reportes / f"entrenamiento_{dataset}_{sello}.md").write_text(reporte_markdown(metadatos), encoding="utf-8")
    return metadatos


def reporte_markdown(m: dict) -> str:
    fila = lambda nombre, d: f"| {nombre} | {d['mae']} | {d['rmse']} | {d['r2']} |"  # noqa: E731
    aviso = "> ⚠ **Datos SINTÉTICOS**: métricas de demostración, no de la afluencia real.\n\n" if m["datos_sinteticos"] else ""
    return (
        f"# Reporte de entrenamiento ({m['fecha_entrenamiento']})\n\n{aviso}"
        f"- Datos: **{m['origen_datos']}** (`{m['archivo_datos']}`), {m['filas']:,} filas, {m['rango_fechas'][0]} a {m['rango_fechas'][1]}\n"
        f"- Validación temporal: entrenamiento antes de {m['corte_validacion']} ({m['filas_entrenamiento']:,} filas), "
        f"prueba desde esa fecha ({m['filas_prueba']:,} filas)\n"
        f"- Algoritmo: `{m['algoritmo']}`\n"
        f"- Listo para producción: **{'sí' if m['listo_para_produccion'] else 'no'}**\n\n"
        "| Modelo | MAE (puntos %) | RMSE | R² |\n| --- | --- | --- | --- |\n"
        f"{fila('Random Forest', m['metricas']['modelo'])}\n{fila('Baseline (promedio por destino y hora)', m['metricas']['baseline'])}\n\n"
        + ("## Advertencias\n\n" + "\n".join(f"- {a}" for a in m["advertencias"]) + "\n" if m["advertencias"] else "")
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Entrena el modelo de ocupación.")
    config.agregar_argumento_dataset(parser)
    parser.add_argument("--archivo", type=Path, help="CSV a usar en vez del del dataset activo.")
    args = parser.parse_args(argv)
    dataset = config.dataset_activo(args.dataset)
    print(f"Entrenando con datos {dataset.upper()}…")
    m = entrenar(dataset, args.archivo)
    print(reporte_markdown(m))
    for a in m["advertencias"]:
        print(f"⚠ {a}")
    print(f"Modelo guardado en {config.MODELO_ARCHIVO} (metadatos: {config.METADATOS_ARCHIVO.name}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
