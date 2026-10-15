"""
Calendario de Colombia: misma lógica que backend/src/services/calendarioService.ts
y backend/src/config/calendario.ts (si cambia allá, cambiarla aquí; tests/test_calendario.py
fija los mismos casos que las pruebas del backend).

Festivos según la Ley 51 de 1983 ("Ley Emiliani"):
- Fijos: 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
- Se trasladan al lunes siguiente: 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov.
- Según la Pascua: Jueves y Viernes Santo; Ascensión, Corpus Christi y Sagrado Corazón
  (Pascua + 43, + 64 y + 71 días, ya en lunes).
Puente: bloque de 3 o más días no laborales seguidos (fin de semana + festivos).
Temporada alta (supuestos): 15 dic – 15 ene, 15 jun – 15 jul y Semana Santa.
"""
from __future__ import annotations

from datetime import date, timedelta
from functools import lru_cache

TEMPORADAS_ALTAS = (("12-15", "01-15"), ("06-15", "07-15"))
SEMANA_SANTA_ES_TEMPORADA_ALTA = True
DIAS_MINIMOS_PUENTE = 3

_FIJOS = ((1, 1), (5, 1), (7, 20), (8, 7), (12, 8), (12, 25))
_TRASLADABLES = ((1, 6), (3, 19), (6, 29), (8, 15), (10, 12), (11, 1), (11, 11))
_SEGUN_PASCUA = (-3, -2, 43, 64, 71)


def domingo_de_pascua(anio: int) -> date:
    """Algoritmo anónimo de Meeus/Jones/Butcher (calendario gregoriano)."""
    a, b, c = anio % 19, anio // 100, anio % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes = (h + l - 7 * m + 114) // 31
    dia = (h + l - 7 * m + 114) % 31 + 1
    return date(anio, mes, dia)


def trasladar_a_lunes(fecha: date) -> date:
    return fecha + timedelta(days=(7 - fecha.weekday()) % 7)


@lru_cache(maxsize=None)
def festivos_del_anio(anio: int) -> frozenset[date]:
    festivos = {date(anio, m, d) for m, d in _FIJOS}
    festivos |= {trasladar_a_lunes(date(anio, m, d)) for m, d in _TRASLADABLES}
    pascua = domingo_de_pascua(anio)
    festivos |= {pascua + timedelta(days=n) for n in _SEGUN_PASCUA}
    return frozenset(festivos)


def es_festivo(fecha: date) -> bool:
    return fecha in festivos_del_anio(fecha.year)


def dia_semana_iso(fecha: date) -> int:
    """1 = lunes … 7 = domingo."""
    return fecha.isoweekday()


def es_fin_de_semana(fecha: date) -> bool:
    return fecha.isoweekday() >= 6


def _no_laboral(fecha: date) -> bool:
    return es_fin_de_semana(fecha) or es_festivo(fecha)


@lru_cache(maxsize=4096)
def es_puente(fecha: date) -> bool:
    if not _no_laboral(fecha):
        return False
    dias = 1
    d = fecha - timedelta(days=1)
    while _no_laboral(d) and dias < 10:
        dias += 1
        d -= timedelta(days=1)
    d = fecha + timedelta(days=1)
    while _no_laboral(d) and dias < 10:
        dias += 1
        d += timedelta(days=1)
    return dias >= DIAS_MINIMOS_PUENTE


def _en_rango(mes_dia: str, desde: str, hasta: str) -> bool:
    return desde <= mes_dia <= hasta if desde <= hasta else (mes_dia >= desde or mes_dia <= hasta)


def temporada(fecha: date) -> str:
    """"alta" o "normal"."""
    mes_dia = fecha.strftime("%m-%d")
    if any(_en_rango(mes_dia, desde, hasta) for desde, hasta in TEMPORADAS_ALTAS):
        return "alta"
    if SEMANA_SANTA_ES_TEMPORADA_ALTA:
        pascua = domingo_de_pascua(fecha.year)
        if pascua - timedelta(days=7) <= fecha <= pascua:
            return "alta"
    return "normal"


def info_del_dia(fecha: date) -> dict:
    return {
        "dia_semana": dia_semana_iso(fecha),
        "es_fin_de_semana": es_fin_de_semana(fecha),
        "es_festivo": es_festivo(fecha),
        "es_puente": es_puente(fecha),
        "temporada": temporada(fecha),
    }
