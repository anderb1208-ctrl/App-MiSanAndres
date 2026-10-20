"""
Genera el dataset de ocupación horaria SIMULADO, calibrado con datos reales, para todos
los destinos.

    ⚠ DATOS SIMULADOS (origen_dato = simulado_calibrado): la ocupación NO es una medición
      real. Se calibra con datos reales (clima observado hora por hora, festivos y puentes
      de Colombia, temporadas, llegadas oficiales de turistas por mes, capacidades y
      cierres oficiales), pero el número de personas en cada lugar es una simulación.

Uso:  python generar_dataset_simulado.py [--desde 2024-10-01] [--hasta 2026-10-18] [--semilla 42]

Es reproducible: con la misma semilla, rango, destinos y archivos de datos produce
exactamente el mismo archivo. Solo genera las horas en que cada destino atiende
(horario_apertura ≤ HH:00 < horario_cierre), sin huecos (los cierres quedan con 0) y
nunca supera la capacidad.

Modelo de simulación (tipo de cada parámetro en datos/FUENTES.md):
  ocupación = nivel del destino × perfil horario de la categoría
              × llegadas oficiales del mes (normalizadas)
              × calendario (día de la semana, festivo, puente, temporada alta; normalizado
                para que el volumen del mes siga la curva oficial de llegadas)
              × lluvia de esa hora y la anterior (mucho en playas y cayos, poco bajo techo)
              × viento / mar picado (cayos y actividades en el mar)
              × ruido con autocorrelación (por día y por hora)
  y se satura suavemente cerca del 100 % (en temporada alta, muy pocos casos cerca del tope).
Días atípicos: cierre de cayos y actividades en el mar por mal tiempo (Capitanía de
Puerto), cierre judicial de El Acuario y descansos trimestrales de Haynes Cay: ocupación 0
y la columna `evento` lo indica.
"""
from __future__ import annotations

import argparse
import calendar as calendario_std
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

import calendario
import config
from comun import horas_abiertas, leer_destinos

AVISO = (
    "# DATOS SIMULADOS (origen_dato = simulado_calibrado) generados por ml/generar_dataset_simulado.py. "
    "Calibrados con clima real (Open-Meteo), festivos de Colombia y llegadas oficiales de turistas, "
    "pero la ocupación NO es una medición real: no sacar conclusiones sobre la afluencia real con ellos."
)
COLUMNAS_SALIDA = [*config.COLUMNAS_DATASET, "categoria", "capacidad", "origen_dato", "evento"]

# Eventos que dejan la ocupación en 0. Los administrativos no se pueden predecir con el clima ni
# el calendario (el backend los maneja como "cerrado temporalmente"), así que no se entrenan.
EVENTO_MAL_TIEMPO = "cierre_mal_tiempo"
EVENTO_JUDICIAL = "cierre_judicial"
EVENTO_DESCANSO = "cierre_descanso"
EVENTOS_ADMINISTRATIVOS = config.EVENTOS_ADMINISTRATIVOS
assert set(EVENTOS_ADMINISTRATIVOS) == {EVENTO_JUDICIAL, EVENTO_DESCANSO}

# ---------------------------------------------------------------------------
# Perfil horario por categoría (fracción de la hora pico; supuesto coherente, ver FUENTES.md).
# Las horas del horario que no aparecen valen PERFIL_RESTO.
# ---------------------------------------------------------------------------
PERFIL_RESTO = 0.15
PERFILES = {
    # Playas: llegan a media mañana, pico al mediodía y segundo aire al atardecer.
    "playa": {6: .05, 7: .10, 8: .18, 9: .32, 10: .55, 11: .78, 12: .95, 13: 1.0, 14: .95, 15: .85, 16: .72, 17: .62, 18: .35},
    # Cayos: atados a las lanchas (salen entre 9 y 10, regresan entre 15 y 16).
    "cayo": {9: .20, 10: .62, 11: .88, 12: 1.0, 13: .97, 14: .82, 15: .45},
    # Restaurantes: almuerzo y cena.
    "gastronomia": {11: .25, 12: .70, 13: 1.0, 14: .80, 15: .35, 16: .20, 17: .25, 18: .45, 19: .80, 20: .95, 21: .65, 22: .30},
    # Tours y actividades: salidas de la mañana y de la tarde.
    "actividad": {8: .30, 9: .70, 10: .95, 11: 1.0, 12: .70, 13: .65, 14: .85, 15: .80, 16: .50, 17: .30},
    "naturaleza": {7: .10, 8: .25, 9: .50, 10: .75, 11: .92, 12: .85, 13: .80, 14: .95, 15: 1.0, 16: .70, 17: .40},
    "cultura": {8: .15, 9: .45, 10: .85, 11: 1.0, 12: .55, 13: .50, 14: .80, 15: .90, 16: .55},
    # Miradores: pico al atardecer (no hay miradores en el catálogo actual; queda listo).
    "mirador": {15: .30, 16: .50, 17: .90, 18: 1.0, 19: .40},
}
PERFILES["buceo_snorkel"] = PERFILES["actividad"]
# Lugares con un perfil propio.
PERFIL_DESTINO = {
    # El viaje es más largo (≈ 1 h en lancha): llegan más tarde y se van antes.
    "Cayo Bolívar": {9: .05, 10: .45, 11: .85, 12: 1.0, 13: 1.0, 14: .80, 15: .30},
    # Restaurantes de playa: solo almuerzo.
    "Donde Francesca": {11: .35, 12: .80, 13: 1.0, 14: .92, 15: .60, 16: .30},
    "Fishermen's Place": {12: .80, 13: 1.0, 14: .92, 15: .60, 16: .30},
    "Vuelta a la isla": {8: .40, 9: .85, 10: 1.0, 11: .90, 12: .60, 13: .70, 14: .90, 15: .85, 16: .60, 17: .35},
}
# Horas sin servicio dentro del horario (salidas programadas o cierre al mediodía).
PAUSAS = {"La Regatta": range(15, 18), "Paseo en semisubmarino": range(12, 15), "Aquanautas (caminata submarina)": range(12, 14)}

# Ocupación de la hora pico en un día promedio (factor 1), por categoría; se multiplica por la
# popularidad del destino. Con la temporada alta y los fines de semana sube hasta ~85–95 %.
NIVEL_CATEGORIA = {"playa": .72, "cayo": .84, "gastronomia": .78, "actividad": .72, "buceo_snorkel": .72,
                   "naturaleza": .62, "cultura": .52, "mirador": .65}
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

# Día de la semana (lunes … domingo) por categoría: el turista de paquete reparte la semana;
# los isleños van a la playa el domingo y a cenar el viernes y el sábado.
FACTOR_DIA = {
    "playa": (.92, .90, .92, .95, 1.02, 1.15, 1.22),
    "cayo": (.97, .95, .96, .98, 1.02, 1.08, 1.06),
    "gastronomia": (.88, .88, .92, .98, 1.12, 1.18, 1.02),
    "actividad": (.97, .96, .97, .98, 1.02, 1.06, 1.04),
    "naturaleza": (.96, .95, .96, .98, 1.02, 1.07, 1.06),
    "cultura": (1.0, .98, .98, 1.0, 1.02, 1.06, .90),
}
FACTOR_FESTIVO = 1.15
FACTOR_PUENTE = 1.10
FACTOR_TEMPORADA_ALTA = 1.15

# Sensibilidad a la lluvia (exp(−s × mm)): alta al aire libre, mínima bajo techo.
SENSIBILIDAD_LLUVIA = {"playa": .60, "cayo": .55, "actividad": .40, "buceo_snorkel": .40, "naturaleza": .30,
                       "cultura": .04, "gastronomia": .03, "mirador": .50}
PISO_LLUVIA = 0.12
# Lugares que dependen de lanchas o del estado del mar.
EN_EL_MAR = {"West View", "La Piscinita", "Kayak en el Manglar de Old Point", "Paseo en semisubmarino",
             "Aquanautas (caminata submarina)", "Buceo con Karibik Diver"}
VIENTO_SIN_EFECTO = 30.0  # km/h
EFECTO_VIENTO = 0.025      # por km/h por encima del umbral
PISO_VIENTO = 0.40
# Cierre por mal tiempo (percentil ≈ 98 del clima real de 2024–2026, de 8:00 a 16:00).
CIERRE_VIENTO_MEDIO = 39.0  # km/h
CIERRE_LLUVIA_DIA = 16.0    # mm

# Ruido multiplicativo con autocorrelación: por destino y día, y por hora dentro del día.
RHO_DIA, SIGMA_DIA = 0.6, 0.07
RHO_HORA, SIGMA_HORA = 0.5, 0.05

# Cierres oficiales (reales) y descansos (fechas estimadas).
CIERRE_ACUARIO = ("El Acuario (Rose Cay)", date(2025, 8, 23), date(2026, 2, 22))
# Durante el cierre del Acuario, parte de sus visitantes van a Haynes Cay (a 100 m).
DESVIO_A_HAYNES = 1.15
# Tribunal: cierres trimestrales de 3 días en Haynes Cay. Fechas no publicadas: se asume
# martes a jueves de la segunda semana del segundo mes de cada trimestre, desde sept. 2025.
DESCANSO_HAYNES_DESDE = date(2025, 9, 1)


# ---------------------------------------------------------------------------
# Clima
# ---------------------------------------------------------------------------
def leer_clima_real(ruta: Path = config.CLIMA_HISTORICO_CSV) -> pd.DataFrame:
    """Clima real por hora: fecha, hora, temperatura, precipitacion, viento."""
    clima = pd.read_csv(ruta, comment="#")
    fh = pd.to_datetime(clima["fecha_hora"])
    return pd.DataFrame({"fecha": fh.dt.date, "hora": fh.dt.hour, **{c: clima[c] for c in config.COLUMNAS_CLIMA}})


def clima_para(dias: list[date], real: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Clima de cada día y hora: el real si existe; si no, un día real del mismo mes elegido
    al azar (remuestreo), para que el generador funcione fuera del rango descargado."""
    por_dia = {f: g.sort_values("hora") for f, g in real.groupby("fecha")}
    completos = [f for f, g in por_dia.items() if len(g) == 24]
    por_mes: dict[int, list[date]] = {}
    for f in completos:
        por_mes.setdefault(f.month, []).append(f)
    partes = []
    for dia in dias:
        g = por_dia.get(dia)
        if g is None or len(g) != 24:
            candidatos = por_mes.get(dia.month) or completos
            g = por_dia[candidatos[int(rng.integers(len(candidatos)))]]
        partes.append(g.assign(fecha=dia))
    return pd.concat(partes, ignore_index=True)


# ---------------------------------------------------------------------------
# Llegadas oficiales
# ---------------------------------------------------------------------------
def leer_llegadas(ruta: Path = config.LLEGADAS_CSV) -> pd.Series:
    """Llegadas por día de cada mes ('AAAA-MM' → turistas / día)."""
    tabla = pd.read_csv(ruta, comment="#", dtype={"mes": "string"})
    dias = tabla["mes"].map(lambda m: calendario_std.monthrange(int(m[:4]), int(m[5:7]))[1])
    return pd.Series((tabla["llegadas"] / dias).to_numpy(), index=tabla["mes"].to_numpy())


def factor_mensual(meses: pd.Series, por_dia: pd.Series) -> np.ndarray:
    """Llegadas diarias del mes / promedio del periodo. Un mes sin cifra usa el promedio del
    mismo mes calendario en los años que sí tienen."""
    mes_cal = pd.Series(por_dia.to_numpy(), index=[int(m[5:7]) for m in por_dia.index]).groupby(level=0).mean()
    valores = meses.map(por_dia)
    faltan = valores.isna()
    valores[faltan] = meses[faltan].str[5:7].astype(int).map(mes_cal)
    return (valores / por_dia.mean()).to_numpy(dtype=float)


# ---------------------------------------------------------------------------
# Calendario y eventos
# ---------------------------------------------------------------------------
def tabla_calendario(dias: list[date]) -> pd.DataFrame:
    cal = pd.DataFrame([{"fecha": d, **calendario.info_del_dia(d)} for d in dias])
    cal["mes"] = [d.strftime("%Y-%m") for d in dias]
    return cal


def factor_calendario(cal: pd.DataFrame, categoria: str) -> np.ndarray:
    """Día de la semana × festivo × puente × temporada alta, normalizado por mes (media 1)
    para que el volumen del mes lo fije la curva oficial de llegadas."""
    dia = np.array(FACTOR_DIA.get(categoria, FACTOR_DIA["actividad"]))[cal["dia_semana"].to_numpy() - 1]
    f = (
        dia
        * np.where(cal["es_festivo"], FACTOR_FESTIVO, 1.0)
        * np.where(cal["es_puente"] & ~cal["es_festivo"], FACTOR_PUENTE, 1.0)
        * np.where(cal["temporada"] == "alta", FACTOR_TEMPORADA_ALTA, 1.0)
    )
    media_mes = pd.Series(f).groupby(cal["mes"].to_numpy()).transform("mean").to_numpy()
    return f / media_mes


def dias_descanso_haynes(desde: date, hasta: date) -> set[date]:
    dias: set[date] = set()
    for anio in range(desde.year, hasta.year + 1):
        for mes in (2, 5, 8, 11):
            primero = date(anio, mes, 1)
            martes = primero + timedelta(days=(1 - primero.weekday()) % 7 + 7)
            dias |= {martes + timedelta(days=n) for n in range(3)}
    return {d for d in dias if d >= DESCANSO_HAYNES_DESDE}


def cierre_mal_tiempo(clima: pd.DataFrame) -> dict[date, bool]:
    """Días en que la Capitanía de Puerto suspendería las lanchas (viento o lluvia fuertes)."""
    diurno = clima[clima["hora"].between(8, 16)].groupby("fecha")
    viento, lluvia = diurno["viento"].mean(), diurno["precipitacion"].sum()
    return ((viento >= CIERRE_VIENTO_MEDIO) | (lluvia >= CIERRE_LLUVIA_DIA)).to_dict()


def ruido_ar1(n: int, rho: float, sigma: float, rng: np.random.Generator) -> np.ndarray:
    e = rng.normal(0, sigma, n)
    for i in range(1, n):
        e[i] += rho * e[i - 1]
    return e


def saturar(x: np.ndarray) -> np.ndarray:
    """Saturación suave hacia 100 %: casi lineal hasta ~60 %, y llegar al tope exige mucha demanda."""
    return x / (1 + (np.maximum(x, 0) / 100) ** 4) ** 0.25


# ---------------------------------------------------------------------------
# Generación
# ---------------------------------------------------------------------------
def generar(
    destinos: pd.DataFrame,
    desde: date,
    hasta: date,
    semilla: int = config.SEMILLA,
    clima_real: pd.DataFrame | None = None,
    llegadas: pd.Series | None = None,
) -> pd.DataFrame:
    if hasta < desde:
        raise ValueError("--hasta debe ser posterior a --desde.")
    rng = np.random.default_rng(semilla)
    dias = [desde + timedelta(days=n) for n in range((hasta - desde).days + 1)]
    clima_real = clima_real if clima_real is not None else leer_clima_real()
    llegadas = llegadas if llegadas is not None else leer_llegadas()

    clima = clima_para(dias, clima_real, rng)
    clima["precipitacion_previa"] = clima.groupby("fecha")["precipitacion"].shift(1).fillna(0)
    cal = tabla_calendario(dias)
    f_mes = dict(zip(dias, factor_mensual(cal["mes"], llegadas)))
    mal_tiempo = cierre_mal_tiempo(clima)
    descanso_haynes = dias_descanso_haynes(desde, hasta)
    nombre_acuario, acuario_desde, acuario_hasta = CIERRE_ACUARIO

    partes = []
    for d in destinos.sort_values("id_destino").itertuples(index=False):
        abiertas = horas_abiertas(d.horario_apertura, d.horario_cierre)
        filas = clima[clima["hora"].isin(abiertas)].merge(cal, on="fecha")
        if filas.empty:
            continue
        categoria = str(d.categoria)
        perfil = PERFIL_DESTINO.get(d.nombre) or PERFILES.get(categoria, PERFILES["actividad"])
        hora = filas["hora"].to_numpy()
        forma = np.array([perfil.get(int(h), PERFIL_RESTO) for h in hora])
        nivel = NIVEL_CATEGORIA.get(categoria, .55) * POPULARIDAD.get(d.nombre, POPULARIDAD_POR_DEFECTO)

        cal_d = dict(zip(dias, factor_calendario(cal, categoria)))
        fechas = filas["fecha"]
        demanda = fechas.map(f_mes).to_numpy() * fechas.map(cal_d).to_numpy()

        lluvia = filas["precipitacion"].to_numpy() + 0.5 * filas["precipitacion_previa"].to_numpy()
        f_lluvia = np.maximum(PISO_LLUVIA, np.exp(-SENSIBILIDAD_LLUVIA.get(categoria, .4) * lluvia))
        en_mar = categoria == "cayo" or d.nombre in EN_EL_MAR
        if en_mar:
            exceso = np.maximum(0, filas["viento"].to_numpy() - VIENTO_SIN_EFECTO)
            f_viento = np.clip(1 - EFECTO_VIENTO * exceso, PISO_VIENTO, 1)
        else:
            f_viento = np.ones(len(filas))

        # Ruido: un nivel por día (AR(1) entre días) y otro por hora (AR(1) dentro del día).
        ruido_dia = dict(zip(dias, ruido_ar1(len(dias), RHO_DIA, SIGMA_DIA, rng)))
        ruido_hora = ruido_ar1(len(filas), RHO_HORA, SIGMA_HORA, rng)
        ruido = np.exp(fechas.map(ruido_dia).to_numpy() + ruido_hora)

        x = 100 * nivel * forma * demanda * f_lluvia * f_viento * ruido
        evento = np.full(len(filas), "", dtype=object)
        if d.nombre == "Haynes Cay":
            x = np.where(fechas.between(acuario_desde, acuario_hasta), x * DESVIO_A_HAYNES, x)
            evento[fechas.isin(descanso_haynes).to_numpy()] = EVENTO_DESCANSO
        if d.nombre == nombre_acuario:
            evento[fechas.between(acuario_desde, acuario_hasta).to_numpy()] = EVENTO_JUDICIAL
        if en_mar:
            evento[(fechas.map(mal_tiempo).to_numpy()) & (evento == "")] = EVENTO_MAL_TIEMPO
        pausa = PAUSAS.get(d.nombre)
        if pausa is not None:
            x = np.where(np.isin(hora, list(pausa)), 0.0, x)
        x = np.where(evento != "", 0.0, x)

        porcentaje = np.clip(saturar(x), 0, 100)
        personas = np.minimum(np.round(porcentaje / 100 * d.capacidad), d.capacidad).astype(int)
        filas["id_destino"] = int(d.id_destino)
        filas["cantidad_personas"] = personas
        # El porcentaje se recalcula desde las personas para que ambos sean coherentes.
        filas["porcentaje_ocupacion"] = np.round(personas / d.capacidad * 100, 2)
        filas["categoria"] = categoria
        filas["capacidad"] = int(d.capacidad)
        filas["evento"] = evento
        partes.append(filas)

    datos = pd.concat(partes, ignore_index=True)
    datos["origen_dato"] = config.ORIGEN_SIMULADO
    datos["fecha_hora"] = [f"{f.isoformat()}T{h:02d}:00:00-05:00" for f, h in zip(datos["fecha"], datos["hora"])]
    datos = datos.sort_values(["fecha_hora", "id_destino"]).reset_index(drop=True)
    return datos[COLUMNAS_SALIDA]


def guardar(datos: pd.DataFrame, ruta: Path) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        archivo.write(AVISO + "\n")
        datos.to_csv(archivo, index=False, lineterminator="\n")


def rango_por_defecto() -> tuple[date, date]:
    """Del 1 de octubre de 2024 al último día completo del clima real descargado (≥ 24 meses)."""
    clima = leer_clima_real()
    completos = clima.groupby("fecha").size()
    return date(2024, 10, 1), max(completos[completos == 24].index)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Genera el dataset de ocupación SIMULADO (calibrado con datos reales).")
    parser.add_argument("--desde", type=date.fromisoformat, default=None)
    parser.add_argument("--hasta", type=date.fromisoformat, default=None)
    parser.add_argument("--semilla", type=int, default=config.SEMILLA)
    parser.add_argument("--salida", type=Path, default=config.RUTAS_DATASET["simulado"])
    args = parser.parse_args(argv)

    desde_def, hasta_def = rango_por_defecto()
    desde, hasta = args.desde or desde_def, args.hasta or hasta_def
    datos = generar(leer_destinos(), desde, hasta, args.semilla)
    guardar(datos, args.salida)
    print(f"✔ Dataset SIMULADO: {len(datos):,} filas, {datos['id_destino'].nunique()} destinos, "
          f"{desde} a {hasta} → {args.salida}")
    print("  ⚠ Ocupación simulada (calibrada con datos reales), no medida.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
