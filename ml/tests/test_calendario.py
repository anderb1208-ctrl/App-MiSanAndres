"""Mismos casos que backend/src/tests/calendario.test.ts: ambos calendarios deben coincidir."""
from datetime import date

import pytest

from misanandres_ml import calendario

d = date.fromisoformat


def test_festivos_2026_son_los_18_oficiales():
    assert sorted(f.isoformat() for f in calendario.festivos_del_anio(2026)) == [
        "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01",
        "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07",
        "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
    ]


@pytest.mark.parametrize("anio,pascua", [(2024, "2024-03-31"), (2025, "2025-04-20"), (2026, "2026-04-05"), (2027, "2027-03-28")])
def test_pascua(anio, pascua):
    assert calendario.domingo_de_pascua(anio) == d(pascua)


def test_ley_emiliani_y_no_festivos():
    assert calendario.trasladar_a_lunes(d("2026-01-06")) == d("2026-01-12")
    assert not calendario.es_festivo(d("2026-01-06"))
    assert not calendario.es_festivo(d("2026-07-13"))
    assert not calendario.es_festivo(d("2026-04-05"))  # el domingo de Pascua no es festivo


@pytest.mark.parametrize(
    "fecha,esperado",
    [("2026-10-10", True), ("2026-10-11", True), ("2026-10-12", True), ("2026-10-09", False), ("2026-10-13", False),
     ("2026-10-03", False), ("2026-04-02", True), ("2026-04-05", True), ("2026-12-25", True), ("2026-01-01", False)],
)
def test_puentes(fecha, esperado):
    assert calendario.es_puente(d(fecha)) is esperado


@pytest.mark.parametrize(
    "fecha,temporada",
    [("2026-12-14", "normal"), ("2026-12-15", "alta"), ("2027-01-15", "alta"), ("2027-01-16", "normal"),
     ("2026-06-15", "alta"), ("2026-07-16", "normal"), ("2026-03-28", "normal"), ("2026-03-29", "alta"),
     ("2026-04-05", "alta"), ("2026-04-06", "normal"), ("2026-10-02", "normal"), ("2026-10-03", "alta"),
     ("2026-10-12", "alta"), ("2026-10-13", "normal"), ("2025-10-04", "alta"), ("2025-10-13", "alta")],
)
def test_temporadas(fecha, temporada):
    assert calendario.temporada(d(fecha)) == temporada
