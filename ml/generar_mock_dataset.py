"""
Genera un dataset de ocupación horaria SINTÉTICO (simulado) para todos los destinos.

    ⚠ DATOS SINTÉTICOS: no son mediciones reales. Sirven para construir y probar el
      modelo mientras no existan datos reales (ver "Cómo pasar a datos reales" en README).

Uso:  python generar_mock_dataset.py [--desde 2025-10-01] [--hasta 2026-09-30] [--semilla 42]

Es reproducible: con la misma semilla, rango y destinos produce exactamente el mismo
archivo. Solo genera las horas en que cada destino atiende (horario_apertura ≤ HH:00 <
horario_cierre), y nunca supera su capacidad.

Supuestos (los mismos de supabase/seed.sql y docs/datos-sinteticos.md):
  porcentaje = curva de la categoría[hora] × factor del día × popularidad del destino
               × festivo (+25 %) × puente (+10 %) × temporada alta (+20 %)
               × efecto de la lluvia × ruido (0,90–1,10), limitado a 0–100.
El calendario (festivos de Colombia, puentes, temporada) es el de calendario.py, igual
al calendarioService del backend. El clima también es simulado: temporada seca de enero
a abril, lluviosa de junio a noviembre (más en octubre y noviembre), lluvia por la tarde.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

import calendario
import config
from comun import horas_abiertas, leer_destinos

AVISO = (
    "# DATOS SINTÉTICOS (simulados) generados por ml/generar_mock_dataset.py. "
    "No son mediciones reales; no sacar conclusiones sobre la afluencia real con ellos."
)

# Curvas por categoría (índice = hora 0–23), iguales a las de supabase/seed.sql.
CURVAS = {
    "playa": [0, 0, 0, 0, 0, 0, .08, .15, .25, .40, .55, .70, .80, .82, .75, .65, .55, .42, .25, 0, 0, 0, 0, 0],
    "cayo": [0, 0, 0, 0, 0, 0, 0, 0, 0, .35, .60, .78, .85, .85, .75, .50, 0, 0, 0, 0, 0, 0, 0, 0],
    "gastronomia": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, .15, .65, .85, .60, .20, .12, .18, .35, .70, .85, .60, .25, 0],
    "actividad": [0, 0, 0, 0, 0, 0, 0, 0, .20, .45, .70, .80, .65, .60, .70, .55, .30, 0, 0, 0, 0, 0, 0, 0],
    "naturaleza": [0, 0, 0, 0, 0, 0, 0, .10, .25, .45, .60, .70, .65, .60, .65, .60, .45, .25, 0, 0, 0, 0, 0, 0],
    "cultura": [0, 0, 0, 0, 0, 0, 0, 0, .15, .35, .55, .60, .40, .35, .50, .55, .35, 0, 0, 0, 0, 0, 0, 0],
}
CURVAS["buceo_snorkel"] = CURVAS["actividad"]

# Multiplicador con lluvia (≥ 0,5 mm) y con aguacero fuerte (≥ 6 mm), como en el seed.
EFECTO_LLUVIA = {
    "playa": (0.65, 0.40), "cayo": (0.55, 0.25), "actividad": (0.65, 0.40), "buceo_snorkel": (0.65, 0.40),
    "naturaleza": (0.80, 0.60), "gastronomia": (1.15, 1.10), "cultura": (1.15, 1.10),
}
FACTOR_DIA = {1: 1.00, 2: 1.00, 3: 1.00, 4: 1.00, 5: 1.10, 6: 1.30, 7: 1.25}
FACTOR_FESTIVO, FACTOR_PUENTE, FACTOR_TEMPORADA_ALTA = 1.25, 1.10, 1.20

# Popularidad por destino (supuesto, igual que el seed); los destinos nuevos usan 0,75.
POPULARIDAD = {
    "Playa de Spratt Bight": 1.00, "Playa de San Luis": 0.70, "Rocky Cay": 0.75, "Playa de Sound Bay": 0.55,
    "Johnny Cay": 1.10, "El Acuario (Rose Cay)": 1.00, "Haynes Cay": 0.85, "La Regatta": 1.10,
    "Miss Celia": 0.90, "Donde Francesca": 0.95, "West View": 0.95, "La Piscinita": 0.90,
    "Kayak en el Manglar de Old Point": 0.70, "Hoyo Soplador": 0.80, "Primera Iglesia Bautista": 0.50,
    "Cocoplum Bay": 0.75, "Playa Los Charquitos": 0.45, "Bahía Sardina": 0.80, "Cayo Bolívar": 0.60,
    "Fishermen's Place": 0.90, "Gourmet Shop Assho": 0.75, "Capitán Mandy": 0.95,
    "Paseo en semisubmarino": 0.85, "Aquanautas (caminata submarina)": 0.80, "Buceo con Karibik Diver": 0.65,
    "Vuelta a la isla": 0.80, "Laguna Big Pond": 0.55, "Jardín Botánico de San Andrés": 0.45,
    "Cueva de Morgan": 0.85, "Casa Museo Isleña": 0.60,
}
POPULARIDAD_POR_DEFECTO = 0.75
# Horas (enteras) en que el lugar no atiende dentro de su horario, como en el seed.
PAUSAS = {"La Regatta": range(15, 18), "Paseo en semisubmarino": range(12, 15), "Aquanautas (caminata submarina)": range(12, 14)}

# Clima simulado por mes: probabilidad de día lluvioso, temperatura media (°C), viento medio (km/h).
CLIMA_MES = {
    1: (0.15, 27.0, 26), 2: (0.10, 27.0, 25), 3: (0.08, 27.3, 23), 4: (0.12, 27.8, 21),
    5: (0.30, 28.3, 19), 6: (0.45, 28.3, 21), 7: (0.40, 28.2, 24), 8: (0.45, 28.4, 20),
    9: (0.50, 28.4, 16), 10: (0.60, 28.0, 15), 11: (0.60, 27.6, 18), 12: (0.35, 27.3, 24),
}


def simular_clima(dias: list[date], rng: np.random.Generator) -> pd.DataFrame:
    """Clima por hora para toda la isla (la isla es pequeña: mismo clima en todos los destinos)."""
    filas = []
    lluvioso_ayer = False
    for dia in dias:
        p_lluvia, temp_media, viento_medio = CLIMA_MES[dia.month]
        # Persistencia: un día lluvioso hace más probable que el siguiente también lo sea.
        p = min(0.95, p_lluvia * (1.6 if lluvioso_ayer else 1.0))
        lluvioso = rng.random() < p
        lluvioso_ayer = lluvioso
        horas_lluvia = set()
        if lluvioso:
            inicio = int(rng.choice([6, 11, 13, 14, 15, 16, 20], p=[.1, .1, .2, .2, .2, .1, .1]))
            horas_lluvia = set(range(inicio, min(24, inicio + int(rng.integers(1, 5)))))
        for hora in range(24):
            ciclo = -np.cos((hora - 3) / 24 * 2 * np.pi)  # mínimo de madrugada, máximo a las 15
            temperatura = temp_media + 1.6 * ciclo + rng.normal(0, 0.4) - (1.5 if hora in horas_lluvia else 0)
            precipitacion = float(rng.exponential(2.5)) if hora in horas_lluvia else 0.0
            viento = max(0.0, viento_medio + 4 * ciclo + rng.normal(0, 3))
            filas.append((dia, hora, round(temperatura, 1), round(precipitacion, 1), round(viento, 1)))
    return pd.DataFrame(filas, columns=["fecha", "hora", *config.COLUMNAS_CLIMA])


def generar(destinos: pd.DataFrame, desde: date, hasta: date, semilla: int = config.SEMILLA) -> pd.DataFrame:
    if hasta < desde:
        raise ValueError("--hasta debe ser posterior a --desde.")
    rng = np.random.default_rng(semilla)
    dias = [desde + timedelta(days=n) for n in range((hasta - desde).days + 1)]

    clima = simular_clima(dias, rng)
    cal = pd.DataFrame([{"fecha": d, **calendario.info_del_dia(d)} for d in dias])
    base = clima.merge(cal, on="fecha")

    partes = []
    for d in destinos.itertuples(index=False):
        abiertas = horas_abiertas(d.horario_apertura, d.horario_cierre)
        filas = base[base["hora"].isin(abiertas)].copy()
        if filas.empty:
            continue
        curva = np.array(CURVAS.get(d.categoria, CURVAS["actividad"]))
        lluvia, aguacero = EFECTO_LLUVIA.get(d.categoria, EFECTO_LLUVIA["actividad"])
        efecto_clima = np.where(filas["precipitacion"] >= 6, aguacero, np.where(filas["precipitacion"] >= 0.5, lluvia, 1.0))
        factor = (
            curva[filas["hora"].to_numpy()]
            * filas["dia_semana"].map(FACTOR_DIA).to_numpy()
            * POPULARIDAD.get(d.nombre, POPULARIDAD_POR_DEFECTO)
            * np.where(filas["es_festivo"], FACTOR_FESTIVO, 1.0)
            * np.where(filas["es_puente"] & ~filas["es_festivo"], FACTOR_PUENTE, 1.0)
            * np.where(filas["temporada"] == "alta", FACTOR_TEMPORADA_ALTA, 1.0)
            * efecto_clima
            * rng.uniform(0.90, 1.10, len(filas))
        )
        pausa = PAUSAS.get(d.nombre)
        if pausa is not None:
            factor = np.where(filas["hora"].isin(list(pausa)), 0.0, factor)
        porcentaje = np.clip(factor * 100, 0, 100)
        personas = np.minimum(np.round(porcentaje / 100 * d.capacidad), d.capacidad).astype(int)
        filas["id_destino"] = int(d.id_destino)
        filas["cantidad_personas"] = personas
        # El porcentaje se recalcula desde las personas para que ambos sean coherentes.
        filas["porcentaje_ocupacion"] = np.round(personas / d.capacidad * 100, 2)
        partes.append(filas)

    datos = pd.concat(partes, ignore_index=True)
    datos["fecha_hora"] = [f"{f.isoformat()}T{h:02d}:00:00-05:00" for f, h in zip(datos["fecha"], datos["hora"])]
    datos = datos.sort_values(["fecha_hora", "id_destino"]).reset_index(drop=True)
    return datos[config.COLUMNAS_DATASET]


def guardar(datos: pd.DataFrame, ruta: Path) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        archivo.write(AVISO + "\n")
        datos.to_csv(archivo, index=False, lineterminator="\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Genera el dataset de ocupación SINTÉTICO.")
    parser.add_argument("--desde", type=date.fromisoformat, default=date(2025, 10, 1))
    parser.add_argument("--hasta", type=date.fromisoformat, default=date(2026, 9, 30))
    parser.add_argument("--semilla", type=int, default=config.SEMILLA)
    parser.add_argument("--salida", type=Path, default=config.RUTAS_DATASET["mock"])
    args = parser.parse_args(argv)

    destinos = leer_destinos()
    datos = generar(destinos, args.desde, args.hasta, args.semilla)
    guardar(datos, args.salida)
    print(f"✔ Dataset SINTÉTICO: {len(datos):,} filas, {datos['id_destino'].nunique()} destinos, "
          f"{args.desde} a {args.hasta} → {args.salida}")
    print("  ⚠ Son datos simulados, no mediciones reales.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
