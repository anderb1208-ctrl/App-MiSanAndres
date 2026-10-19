"""Estilo común de los gráficos PNG de los reportes (matplotlib, sin pantalla).

matplotlib solo se necesita para generar reportes (requirements-dev.txt); el servicio
HTTP no lo importa.
"""
from __future__ import annotations

from pathlib import Path

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
