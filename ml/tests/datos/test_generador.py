from datetime import date

import pandas as pd
import pytest

from misanandres_ml.datos import calidad_dataset
from misanandres_ml import config
from misanandres_ml.datos import generar_dataset_simulado as gen
from misanandres_ml.comun import horas_abiertas, leer_dataset
from misanandres_ml.datos.generar_dataset_simulado import AVISO, COLUMNAS_SALIDA, generar, guardar, leer_llegadas
from misanandres_ml.datos.validar_dataset import validar


@pytest.fixture(scope="module")
def anio(destinos) -> pd.DataFrame:
    """Un año completo para los chequeos de estacionalidad."""
    return generar(destinos, date(2025, 1, 1), date(2025, 12, 31), semilla=5)


def test_es_reproducible_con_la_misma_semilla(destinos):
    a = generar(destinos, date(2026, 2, 1), date(2026, 2, 7), semilla=3)
    b = generar(destinos, date(2026, 2, 1), date(2026, 2, 7), semilla=3)
    c = generar(destinos, date(2026, 2, 1), date(2026, 2, 7), semilla=4)
    pd.testing.assert_frame_equal(a, b)
    assert not a["porcentaje_ocupacion"].equals(c["porcentaje_ocupacion"])


def test_columnas_origen_y_horario_sin_huecos(dataset, destinos):
    assert list(dataset.columns) == COLUMNAS_SALIDA
    assert list(dataset.columns[: len(config.COLUMNAS_DATASET)]) == config.COLUMNAS_DATASET
    assert set(dataset["origen_dato"]) == {"simulado_calibrado"}
    dias = dataset["fecha_hora"].str[:10].nunique()
    for d in destinos.itertuples():
        filas = dataset[dataset["id_destino"] == d.id_destino]
        abiertas = horas_abiertas(d.horario_apertura, d.horario_cierre)
        assert set(filas["hora"]) == set(abiertas)  # solo dentro del horario
        assert len(filas) == dias * len(abiertas)  # sin huecos
        assert set(filas["categoria"]) == {d.categoria} and set(filas["capacidad"]) == {d.capacidad}


def test_respeta_capacidad_y_rangos(anio, destinos):
    capacidad = anio["id_destino"].map(destinos.set_index("id_destino")["capacidad"])
    assert (anio["cantidad_personas"] >= 0).all()
    assert (anio["cantidad_personas"] <= capacidad).all()
    assert anio["porcentaje_ocupacion"].between(0, 100).all()
    # Muy pocos casos cerca del tope.
    assert (anio["porcentaje_ocupacion"] >= 95).mean() < 0.005


def test_usa_el_clima_real(dataset):
    real = gen.leer_clima_real()
    fila = dataset.iloc[0]
    hora_real = real[(real["fecha"] == date.fromisoformat(fila["fecha_hora"][:10])) & (real["hora"] == fila["hora"])]
    assert float(hora_real["temperatura"].iloc[0]) == pytest.approx(fila["temperatura"])


def test_fuera_del_rango_del_clima_real_remuestrea_el_mismo_mes(destinos):
    datos = generar(destinos, date(2030, 3, 1), date(2030, 3, 3), semilla=1)
    assert datos[config.COLUMNAS_CLIMA].notna().all().all()


def test_patrones_plausibles(anio):
    abiertas = anio[anio["evento"] == ""]
    playa = abiertas[(abiertas["id_destino"] == 1) & abiertas["hora"].between(11, 14)]
    secas = playa[playa["precipitacion"] == 0]
    assert playa[playa["precipitacion"] >= 0.5]["porcentaje_ocupacion"].mean() < secas["porcentaje_ocupacion"].mean()
    # Playa: más gente el domingo que el martes (isleños y turistas).
    assert secas[secas["dia_semana"] == 7]["porcentaje_ocupacion"].mean() > secas[secas["dia_semana"] == 2]["porcentaje_ocupacion"].mean()
    # Restaurante: almuerzo y cena por encima de la tarde.
    regatta = abiertas[abiertas["id_destino"] == 8].groupby("hora")["porcentaje_ocupacion"].mean()
    assert regatta[13] > regatta[16] and regatta[20] > regatta[16]
    # Cayo: pico al mediodía, ligado a las lanchas.
    cayo = abiertas[abiertas["id_destino"] == 5].groupby("hora")["porcentaje_ocupacion"].mean()
    assert cayo.idxmax() in (12, 13) and cayo[9] < cayo[12]


def test_lluvia_afecta_mucho_al_aire_libre_y_poco_bajo_techo(anio):
    pico = anio[(anio["evento"] == "") & anio["hora"].between(12, 14)]

    def caida(id_destino):
        d = pico[pico["id_destino"] == id_destino]
        return 1 - d[d["precipitacion"] >= 1]["porcentaje_ocupacion"].mean() / d[d["precipitacion"] == 0]["porcentaje_ocupacion"].mean()

    assert caida(1) > 0.3  # playa
    assert abs(caida(8)) < 0.15  # restaurante


def test_cierre_por_mal_tiempo_solo_en_el_mar(anio):
    cierres = anio[anio["evento"] == gen.EVENTO_MAL_TIEMPO]
    assert not cierres.empty
    assert set(cierres["id_destino"]) == {5}  # Johnny Cay; la playa y el restaurante no cierran
    assert (cierres["porcentaje_ocupacion"] == 0).all()
    # Pocos días al año.
    assert cierres["fecha_hora"].str[:10].nunique() < 30


def test_cierre_judicial_del_acuario_y_desvio_a_haynes():
    destinos = pd.DataFrame([
        {"id_destino": 6, "nombre": "El Acuario (Rose Cay)", "capacidad": 500, "categoria": "cayo",
         "horario_apertura": "09:00", "horario_cierre": "16:00"},
        {"id_destino": 7, "nombre": "Haynes Cay", "capacidad": 300, "categoria": "cayo",
         "horario_apertura": "09:00", "horario_cierre": "16:00"},
    ])
    datos = generar(destinos, date(2025, 8, 20), date(2025, 8, 26), semilla=2)
    acuario = datos[datos["id_destino"] == 6]
    cerrado = acuario["fecha_hora"].str[:10] >= "2025-08-23"
    assert (acuario[cerrado]["evento"] == gen.EVENTO_JUDICIAL).all()
    assert (acuario[cerrado]["porcentaje_ocupacion"] == 0).all()
    assert (acuario[~cerrado]["porcentaje_ocupacion"] > 0).any()


def test_descanso_trimestral_de_haynes():
    dias = gen.dias_descanso_haynes(date(2025, 1, 1), date(2026, 12, 31))
    assert min(dias) >= gen.DESCANSO_HAYNES_DESDE
    assert len(dias) == 3 * 5  # nov 2025 y feb, may, ago y nov 2026 (ago 2025 es antes del fallo)
    assert all(d.weekday() in (1, 2, 3) for d in dias)


def test_chequeos_de_calidad(anio, destinos):
    chequeos, tablas = calidad_dataset.chequear(anio, destinos, leer_llegadas())
    fallidos = [f"{c.nombre}: {c.detalle}" for c in chequeos if not c.ok]
    assert not fallidos, fallidos
    assert tablas["correlacion_lluvia"]["playa"] < 0


def test_llegadas_oficiales_cubren_el_periodo():
    llegadas = leer_llegadas()
    assert llegadas.index[0] <= "2024-10" and llegadas.index[-1] >= "2026-10"
    assert (llegadas > 1000).all()


def test_el_archivo_dice_que_es_simulado_y_es_valido(dataset, destinos, tmp_path):
    ruta = tmp_path / "simulado.csv"
    guardar(dataset, ruta)
    assert ruta.read_text(encoding="utf-8").splitlines()[0] == AVISO
    assert "SIMULADOS" in AVISO and "NO es una medición real" in AVISO
    reporte = validar(leer_dataset(ruta), destinos)
    assert reporte.ok
    assert not any("no se usan" in a for a in reporte.advertencias)

