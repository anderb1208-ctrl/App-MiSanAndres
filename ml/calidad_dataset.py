"""
Chequeos de coherencia del dataset simulado (además de validar_dataset.py) y reporte
ml/reportes/calidad_dataset.md con gráficos simples.

Uso:  python calidad_dataset.py [--archivo datos/dataset_ocupacion_san_andres.csv] [--sin-graficos]

Chequeos:
  1. Capacidad: nunca más personas que la capacidad; muy pocos casos ≥ 95 % y casi todos
     en temporada alta, festivo o puente.
  2. Promedios por categoría y mes plausibles (entre 5 % y 80 %).
  3. La lluvia correlaciona negativamente con la ocupación al aire libre.
  4. La ocupación mensual sigue proporcionalmente la curva oficial de llegadas.
  5. Sin huecos: cada destino tiene todas las horas de su horario, todos los días.
Termina con código 1 si algún chequeo falla.
"""
from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

import config
import graficos
from comun import horas_abiertas, leer_dataset, leer_destinos
from generar_dataset_simulado import EVENTOS_ADMINISTRATIVOS, leer_llegadas
from validar_dataset import a_booleano, validar

MAX_FRACCION_TOPE = 0.005       # ≤ 0,5 % de las filas en 95 % o más
MIN_TOPE_EN_ALTA = 0.8          # y al menos el 80 % de ellas en temporada alta, festivo o puente
RANGO_PROMEDIO_MES = (5.0, 80.0)
MAX_CORRELACION_LLUVIA = -0.05  # aire libre (playas y cayos, 10:00–15:00)
MIN_CORRELACION_LLEGADAS = 0.75
MAX_DESVIO_MES = 0.25           # ocupación del mes vs. llegadas del mes (ambas indexadas a media 1)
CATEGORIAS_AIRE_LIBRE = ("playa", "cayo")


@dataclass
class Chequeo:
    nombre: str
    ok: bool
    detalle: str


def _preparar(datos: pd.DataFrame) -> pd.DataFrame:
    df = datos.copy()
    df["fecha"] = df["fecha_hora"].astype(str).str[:10]
    df["mes"] = df["fecha"].str[:7]
    for col in ("es_festivo", "es_puente", "es_fin_de_semana"):
        df[col] = a_booleano(df[col]).astype(bool)
    if "evento" not in df.columns:
        df["evento"] = ""
    df["evento"] = df["evento"].fillna("").astype(str)
    return df


def curva_mensual(df: pd.DataFrame, llegadas: pd.Series) -> pd.DataFrame:
    """Personas por día de cada mes (sin cierres administrativos) frente a las llegadas por día,
    ambas indexadas a su media para compararlas en la misma escala."""
    sin_admin = df[~df["evento"].isin(EVENTOS_ADMINISTRATIVOS)]
    por_mes = sin_admin.groupby("mes").agg(personas=("cantidad_personas", "sum"), dias=("fecha", "nunique"))
    por_mes["personas_dia"] = por_mes["personas"] / por_mes["dias"]
    por_mes["llegadas_dia"] = por_mes.index.map(llegadas)
    por_mes = por_mes.dropna()
    por_mes["indice_ocupacion"] = por_mes["personas_dia"] / por_mes["personas_dia"].mean()
    por_mes["indice_llegadas"] = por_mes["llegadas_dia"] / por_mes["llegadas_dia"].mean()
    return por_mes


def chequear(datos: pd.DataFrame, destinos: pd.DataFrame, llegadas: pd.Series) -> tuple[list[Chequeo], dict]:
    df = _preparar(datos)
    resultados: list[Chequeo] = []
    tablas: dict = {}

    capacidad = df["id_destino"].map(destinos.set_index("id_destino")["capacidad"])
    sobrecupo = int((df["cantidad_personas"] > capacidad).sum())
    resultados.append(Chequeo("Nunca supera la capacidad", sobrecupo == 0, f"{sobrecupo} filas por encima de la capacidad"))
    tope = df[df["porcentaje_ocupacion"] >= 95]
    fraccion = len(tope) / len(df)
    en_alta = float(((tope["temporada"] == "alta") | tope["es_festivo"] | tope["es_puente"]).mean()) if len(tope) else 1.0
    resultados.append(Chequeo(
        "Muy pocos casos cerca del 100 %, en temporada alta",
        fraccion <= MAX_FRACCION_TOPE and en_alta >= MIN_TOPE_EN_ALTA,
        f"{len(tope)} filas ≥ 95 % ({fraccion:.3%}); {en_alta:.0%} de ellas en temporada alta, festivo o puente",
    ))

    abiertas = df[df["evento"] == ""]
    promedio = abiertas.pivot_table(index="mes", columns="categoria", values="porcentaje_ocupacion", aggfunc="mean")
    tablas["promedio_categoria_mes"] = promedio
    minimo, maximo = float(promedio.min().min()), float(promedio.max().max())
    resultados.append(Chequeo(
        "Promedios por categoría y mes plausibles",
        RANGO_PROMEDIO_MES[0] <= minimo and maximo <= RANGO_PROMEDIO_MES[1],
        f"entre {minimo:.1f} % y {maximo:.1f} % (rango aceptado {RANGO_PROMEDIO_MES[0]:.0f}–{RANGO_PROMEDIO_MES[1]:.0f} %)",
    ))

    pico = abiertas[abiertas["hora"].between(10, 15)]
    correlaciones = pico.groupby("categoria").apply(
        lambda g: g["precipitacion"].corr(g["porcentaje_ocupacion"]), include_groups=False
    )
    tablas["correlacion_lluvia"] = correlaciones
    aire = pico[pico["categoria"].isin(CATEGORIAS_AIRE_LIBRE)]
    # Correlación dentro de cada destino (quita las diferencias de nivel entre lugares).
    centrado = aire["porcentaje_ocupacion"] - aire.groupby(["id_destino", "hora"])["porcentaje_ocupacion"].transform("mean")
    r_lluvia = float(aire["precipitacion"].corr(centrado))
    resultados.append(Chequeo(
        "La lluvia reduce la ocupación al aire libre",
        r_lluvia <= MAX_CORRELACION_LLUVIA,
        f"correlación lluvia–ocupación en playas y cayos (10:00–15:00) = {r_lluvia:.2f}",
    ))

    curva = curva_mensual(df, llegadas)
    tablas["curva_mensual"] = curva
    r_llegadas = float(curva["indice_ocupacion"].corr(curva["indice_llegadas"]))
    desvio = float((curva["indice_ocupacion"] / curva["indice_llegadas"] - 1).abs().max())
    resultados.append(Chequeo(
        "La ocupación mensual sigue la curva oficial de llegadas",
        r_llegadas >= MIN_CORRELACION_LLEGADAS and desvio <= MAX_DESVIO_MES,
        f"correlación = {r_llegadas:.2f}; mayor desvío mensual = {desvio:.0%} (lluvia, viento y cierres)",
    ))

    dias = df["fecha"].nunique()
    faltan = []
    for d in destinos.itertuples():
        esperadas = dias * len(horas_abiertas(d.horario_apertura, d.horario_cierre))
        reales = int((df["id_destino"] == d.id_destino).sum())
        if reales != esperadas:
            faltan.append(f"{d.nombre}: {reales}/{esperadas}")
    duplicados = int(df.duplicated(["id_destino", "fecha_hora"]).sum())
    resultados.append(Chequeo(
        "Sin huecos ni duplicados",
        not faltan and duplicados == 0,
        "todas las horas de atención de todos los días" if not faltan and not duplicados
        else f"incompletos: {', '.join(faltan[:5])}; duplicados: {duplicados}",
    ))
    tablas["eventos"] = df["evento"].replace("", "normal").value_counts()
    return resultados, tablas


def graficar(datos: pd.DataFrame, tablas: dict, dir_salida: Path) -> list[str]:
    plt = graficos.plt()
    df = _preparar(datos)
    nombres = []

    curva = tablas["curva_mensual"]
    fig, ax = plt.subplots(figsize=(8, 3.6))
    x = np.arange(len(curva))
    ax.plot(x, curva["indice_llegadas"], color=graficos.SERIES[0], label="Llegadas oficiales de turistas (por día)")
    ax.plot(x, curva["indice_ocupacion"], color=graficos.SERIES[1], label="Personas simuladas (por día)")
    ax.axhline(1, color=graficos.TEXTO_SECUNDARIO, linewidth=0.8, linestyle=":")
    ax.set_xticks(x[::2], curva.index[::2], rotation=45, ha="right")
    ax.set_ylabel("Índice (media del periodo = 1)")
    ax.set_title("Ocupación simulada frente a la curva oficial de llegadas")
    ax.legend(loc="upper left")
    graficos.guardar(fig, dir_salida / "calidad_curva_mensual.png")
    nombres.append("calidad_curva_mensual.png")

    abiertas = df[df["evento"] == ""]
    perfil = abiertas.groupby(["categoria", "hora"])["porcentaje_ocupacion"].mean().unstack(0)
    fig, ax = plt.subplots(figsize=(8, 3.6))
    for i, categoria in enumerate(sorted(perfil.columns)):
        ax.plot(perfil.index, perfil[categoria], color=graficos.SERIES[i], label=categoria, marker="o", markersize=3)
    ax.set_xlabel("Hora")
    ax.set_ylabel("Ocupación promedio (%)")
    ax.set_title("Perfil horario por categoría")
    ax.legend(ncol=3, loc="upper left")
    graficos.guardar(fig, dir_salida / "calidad_perfil_horario.png")
    nombres.append("calidad_perfil_horario.png")

    pico = abiertas[abiertas["hora"].between(10, 15)].copy()
    pico["lluvia"] = pd.cut(pico["precipitacion"], [-0.1, 0.1, 0.5, 2, 1000], labels=["Seco", "< 0,5 mm", "0,5–2 mm", "> 2 mm"])
    tabla = pico.pivot_table(index="categoria", columns="lluvia", values="porcentaje_ocupacion", aggfunc="mean", observed=False)
    fig, ax = plt.subplots(figsize=(8, 3.6))
    ancho = 0.2
    for i, nivel in enumerate(tabla.columns):
        ax.bar(np.arange(len(tabla)) + (i - 1.5) * ancho, tabla[nivel], width=ancho - 0.02,
               color=graficos.SERIES[i], label=str(nivel))
    ax.set_xticks(np.arange(len(tabla)), tabla.index)
    ax.set_ylabel("Ocupación promedio (%)")
    ax.set_title("Efecto de la lluvia (10:00–15:00)")
    ax.set_ylim(0, float(np.nanmax(tabla.to_numpy())) * 1.35)
    ax.legend(ncol=4, loc="upper left", title="Lluvia en la hora")
    graficos.guardar(fig, dir_salida / "calidad_efecto_lluvia.png")
    nombres.append("calidad_efecto_lluvia.png")
    return nombres


def reporte_markdown(datos: pd.DataFrame, chequeos: list[Chequeo], tablas: dict, imagenes: list[str]) -> str:
    fechas = datos["fecha_hora"].astype(str)
    lineas = [
        "# Calidad del dataset simulado",
        "",
        "> ⚠ **Datos SIMULADOS** (`origen_dato = simulado_calibrado`): calibrados con datos reales "
        "(clima observado, festivos, llegadas oficiales de turistas, cierres oficiales), pero la ocupación "
        "no es una medición real. Fuentes y supuestos en [`ml/datos/FUENTES.md`](../datos/FUENTES.md).",
        "",
        f"- Filas: **{len(datos):,}** · destinos: **{datos['id_destino'].nunique()}** · "
        f"desde {fechas.min()[:10]} hasta {fechas.max()[:10]}",
        f"- Generado con `python generar_dataset_simulado.py` (semilla {config.SEMILLA}); "
        "este reporte con `python calidad_dataset.py`.",
        "",
        "## Chequeos",
        "",
        "| Chequeo | Resultado | Detalle |",
        "| --- | --- | --- |",
        *[f"| {c.nombre} | {'✔' if c.ok else '✘'} | {c.detalle} |" for c in chequeos],
        "",
        "## Días atípicos (filas)",
        "",
        "| Evento | Filas |",
        "| --- | --- |",
        *[f"| {k} | {v:,} |" for k, v in tablas["eventos"].items()],
        "",
        "## Ocupación promedio por categoría y mes (%, sin días cerrados)",
        "",
        graficos.tabla_markdown(tablas["promedio_categoria_mes"].round(1)),
        "",
        "## Correlación lluvia–ocupación por categoría (10:00–15:00)",
        "",
        graficos.tabla_markdown(tablas["correlacion_lluvia"].round(2).rename("correlación").to_frame()),
        "",
        "## Curva mensual",
        "",
        graficos.tabla_markdown(tablas["curva_mensual"][["llegadas_dia", "personas_dia", "indice_llegadas", "indice_ocupacion"]].round(2)),
        "",
    ]
    if imagenes:
        lineas += ["## Gráficos", ""] + [f"![{img}]({img})" for img in imagenes] + [""]
    return "\n".join(lineas)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Chequeos de coherencia y reporte de calidad del dataset simulado.")
    parser.add_argument("--archivo", type=Path, default=config.RUTAS_DATASET["simulado"])
    parser.add_argument("--salida", type=Path, default=config.DIR_REPORTES)
    parser.add_argument("--sin-graficos", action="store_true")
    args = parser.parse_args(argv)

    datos, destinos = leer_dataset(args.archivo), leer_destinos()
    validacion = validar(datos, destinos)
    chequeos, tablas = chequear(datos, destinos, leer_llegadas())
    chequeos.insert(0, Chequeo("validar_dataset.py", validacion.ok,
                               "sin errores" if validacion.ok else "; ".join(validacion.errores[:3])))
    imagenes = [] if args.sin_graficos else graficar(datos, tablas, args.salida)
    args.salida.mkdir(parents=True, exist_ok=True)
    (args.salida / "calidad_dataset.md").write_text(reporte_markdown(datos, chequeos, tablas, imagenes), encoding="utf-8")
    for c in chequeos:
        print(f"{'✔' if c.ok else '✘'} {c.nombre}: {c.detalle}")
    print(f"Reporte: {args.salida / 'calidad_dataset.md'}")
    return 0 if all(c.ok for c in chequeos) else 1


if __name__ == "__main__":
    sys.exit(main())
