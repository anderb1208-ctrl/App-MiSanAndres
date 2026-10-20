"""Gráficos PNG de los reportes (matplotlib, sin pantalla): estilo común y gráficos de la
comparación de modelos.

matplotlib solo se necesita para generar reportes (requirements-dev.txt); el servicio
HTTP no importa este módulo.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from misanandres_ml import config

# Paleta categórica validada (orden fijo; ver la guía de visualización del proyecto).
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]
TEXTO = "#0b0b0b"
TEXTO_SECUNDARIO = "#52514e"
GRILLA = "#e4e3df"
FONDO = "#fcfcfb"


def plt():
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as pyplot

    pyplot.rcParams.update({
        "figure.facecolor": FONDO, "axes.facecolor": FONDO, "savefig.facecolor": FONDO,
        "axes.edgecolor": GRILLA, "axes.labelcolor": TEXTO_SECUNDARIO, "axes.titlecolor": TEXTO,
        "axes.titlesize": 12, "axes.titleweight": "bold", "axes.titlelocation": "left",
        "axes.grid": True, "grid.color": GRILLA, "grid.linewidth": 0.6, "axes.axisbelow": True,
        "axes.spines.top": False, "axes.spines.right": False,
        "xtick.color": TEXTO_SECUNDARIO, "ytick.color": TEXTO_SECUNDARIO, "font.size": 9,
        "legend.frameon": False, "lines.linewidth": 2,
    })
    return pyplot


def guardar(figura, ruta: Path) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    figura.tight_layout()
    figura.savefig(ruta, dpi=120)
    import matplotlib.pyplot as pyplot

    pyplot.close(figura)


def tabla_markdown(tabla) -> str:
    """DataFrame → tabla Markdown (sin depender de tabulate)."""
    indice = tabla.index.name or ""
    columnas = [str(c) for c in tabla.columns]
    lineas = ["| " + " | ".join([indice, *columnas]) + " |", "| " + " | ".join(["---"] * (len(columnas) + 1)) + " |"]
    for clave, fila in tabla.iterrows():
        lineas.append("| " + " | ".join([str(clave), *("" if v != v else str(v) for v in fila.tolist())]) + " |")
    return "\n".join(lineas)


def graficar(comparacion: list[dict], pipeline, nombre_ganador: str, x_p: pd.DataFrame, y_p: pd.Series,
             fechas_p: pd.Series, dir_salida: Path) -> list[str]:
    """Gráficos de la comparación: métricas por modelo, real vs. predicho e importancia de variables."""
    from sklearn.inspection import permutation_importance

    from misanandres_ml.modelos.evaluacion import predecir

    pyplot = plt()
    imagenes = []

    # 1. MAE y RMSE por modelo (misma unidad: puntos porcentuales).
    nombres = [r["nombre"].split(" (")[0] for r in comparacion]
    fig, ax = pyplot.subplots(figsize=(8, 3.6))
    posiciones = np.arange(len(comparacion))
    for i, (clave, etiqueta) in enumerate((("mae", "MAE"), ("rmse", "RMSE"))):
        valores = [r[clave] for r in comparacion]
        barras = ax.bar(posiciones + (i - 0.5) * 0.36, valores, width=0.34, color=SERIES[i], label=etiqueta)
        ax.bar_label(barras, fmt="%.2f", fontsize=8, color=TEXTO_SECUNDARIO, padding=2)
    ax.set_xticks(posiciones, nombres)
    ax.set_ylabel("Error (puntos de ocupación)")
    ax.set_title("Error en la prueba por modelo (menor es mejor)")
    ax.legend(loc="upper left")
    guardar(fig, dir_salida / "comparacion_metricas.png")
    imagenes.append("comparacion_metricas.png")

    # 2. Real vs. predicho del ganador en una semana (destino con más ocupación media).
    prueba = x_p.assign(real=y_p.to_numpy(), pred=predecir(pipeline, x_p), fh=fechas_p.to_numpy())
    destino = prueba.groupby("id_destino")["real"].mean().idxmax()
    serie = prueba[prueba["id_destino"] == destino].set_index("fh").sort_index()
    inicio = serie.index.min().normalize()
    semana = serie[serie.index < inicio + pd.Timedelta(days=7)]
    horas = pd.date_range(inicio, inicio + pd.Timedelta(days=7), freq="h", inclusive="left")
    semana = semana.reindex(horas)  # horas cerradas en blanco: la línea no las une
    fig, ax = pyplot.subplots(figsize=(9, 3.6))
    ax.plot(semana.index, semana["real"], color=SERIES[0], label="Simulado (real del dataset)")
    ax.plot(semana.index, semana["pred"], color=SERIES[1], label=f"Predicho ({nombre_ganador})", linestyle="--")
    ax.set_ylabel("Ocupación (%)")
    ax.set_title(f"Real vs. predicho, destino {destino}, semana del {inicio.date()}")
    ax.set_ylim(0, 115)
    ax.legend(loc="upper left", ncol=2)
    fig.autofmt_xdate()
    guardar(fig, dir_salida / "comparacion_real_vs_predicho.png")
    imagenes.append("comparacion_real_vs_predicho.png")

    # 3. Importancia de variables del ganador (por permutación, sobre la prueba).
    muestra = x_p.sample(min(5000, len(x_p)), random_state=config.SEMILLA)
    imp = permutation_importance(pipeline, muestra, y_p.loc[muestra.index], n_repeats=3,
                                 random_state=config.SEMILLA, scoring="neg_root_mean_squared_error")
    orden = pd.Series(imp.importances_mean, index=muestra.columns).sort_values().tail(12)
    fig, ax = pyplot.subplots(figsize=(8, 4.2))
    ax.barh(orden.index, orden.to_numpy(), color=SERIES[0], height=0.6)
    ax.set_xlabel("Aumento del RMSE al desordenar la variable (puntos)")
    ax.set_title(f"Importancia de variables ({nombre_ganador})")
    guardar(fig, dir_salida / "comparacion_importancia_variables.png")
    imagenes.append("comparacion_importancia_variables.png")
    return imagenes
