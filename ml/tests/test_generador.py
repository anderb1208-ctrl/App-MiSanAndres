from datetime import date

import pandas as pd

import config
from comun import horas_abiertas, leer_dataset
from generar_mock_dataset import AVISO, generar, guardar
from validar_dataset import validar


def test_es_reproducible_con_la_misma_semilla(destinos):
    a = generar(destinos, date(2026, 2, 1), date(2026, 2, 7), semilla=3)
    b = generar(destinos, date(2026, 2, 1), date(2026, 2, 7), semilla=3)
    c = generar(destinos, date(2026, 2, 1), date(2026, 2, 7), semilla=4)
    pd.testing.assert_frame_equal(a, b)
    assert not a["porcentaje_ocupacion"].equals(c["porcentaje_ocupacion"])


def test_columnas_y_horario(dataset, destinos):
    assert list(dataset.columns) == config.COLUMNAS_DATASET
    for d in destinos.itertuples():
        horas = set(dataset.loc[dataset["id_destino"] == d.id_destino, "hora"])
        assert horas == set(horas_abiertas(d.horario_apertura, d.horario_cierre))


def test_respeta_capacidad_y_rangos(dataset, destinos):
    capacidad = dataset["id_destino"].map(destinos.set_index("id_destino")["capacidad"])
    assert (dataset["cantidad_personas"] >= 0).all()
    assert (dataset["cantidad_personas"] <= capacidad).all()
    assert dataset["porcentaje_ocupacion"].between(0, 100).all()


def test_patrones_plausibles(dataset):
    playa = dataset[(dataset["id_destino"] == 1) & dataset["hora"].between(11, 14)]
    secas = playa[playa["precipitacion"] < 0.5]
    assert secas[secas["es_fin_de_semana"]]["porcentaje_ocupacion"].mean() > secas[~secas["es_fin_de_semana"]]["porcentaje_ocupacion"].mean()
    assert playa[playa["precipitacion"] >= 0.5]["porcentaje_ocupacion"].mean() < secas["porcentaje_ocupacion"].mean()
    laborables = secas[~secas["es_fin_de_semana"]]
    assert laborables[laborables["es_festivo"]]["porcentaje_ocupacion"].mean() > laborables[~laborables["es_festivo"]]["porcentaje_ocupacion"].mean()
    # Hora pico del restaurante: almuerzo y cena por encima de la tarde.
    regatta = dataset[dataset["id_destino"] == 8].groupby("hora")["porcentaje_ocupacion"].mean()
    assert regatta[13] > regatta[16] and regatta[20] > regatta[16]


def test_el_archivo_dice_que_es_sintetico_y_es_valido(dataset, destinos, tmp_path):
    ruta = tmp_path / "mock.csv"
    guardar(dataset, ruta)
    assert ruta.read_text(encoding="utf-8").splitlines()[0] == AVISO
    assert "SINTÉTICOS" in AVISO
    assert validar(leer_dataset(ruta), destinos).ok
