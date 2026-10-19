"""Pipelines de los tres modelos, clima nulo, división temporal, selección del ganador y comparación."""
import json

import numpy as np
import pandas as pd
import pytest

import config
import entrenar_modelo
from entrenar_modelo import comparar, division_temporal, elegir_ganador, entrenar
from preparar_dataset import CLIMA, ImputadorClimatologia, agregar_filas_sin_clima, construir_pipeline, preparar
from tests.conftest import HIPER_RAPIDOS


@pytest.fixture(scope="module")
def xy(dataset, destinos):
    x, y, fechas = preparar(dataset, destinos)
    return x, y, fechas


@pytest.mark.parametrize("modelo", config.MODELOS)
def test_cada_modelo_predice_con_clima_nulo(modelo, xy):
    x, y, _ = xy
    pipeline = construir_pipeline(modelo, **HIPER_RAPIDOS[modelo])
    pipeline.fit(*agregar_filas_sin_clima(x, y))
    sin_clima = x.head(50).copy()
    sin_clima[CLIMA] = np.nan
    sin_clima["clima_faltante"] = 1
    pred = pipeline.predict(sin_clima)
    assert np.isfinite(pred).all()
    # Con clima, el modelo debe hacerlo mejor que un valor constante.
    assert np.abs(np.clip(pipeline.predict(x), 0, 100) - y).mean() < np.abs(y - y.mean()).mean()


def test_imputa_con_la_climatologia_del_mes():
    x = pd.DataFrame({"mes": [1, 1, 7, 7, 1, 7], "temperatura": [26.0, 28.0, 30.0, 32.0, np.nan, np.nan],
                      "precipitacion": [0.0, 2.0, 1.0, 3.0, np.nan, np.nan], "viento": [30.0, 20.0, 10.0, 12.0, np.nan, np.nan]})
    imputado = ImputadorClimatologia().fit(x).transform(x)
    assert imputado.loc[4, "temperatura"] == 27.0 and imputado.loc[5, "temperatura"] == 31.0
    assert imputado.loc[5, "precipitacion"] == 2.0
    # Un mes sin datos usa la mediana global.
    nuevo = ImputadorClimatologia().fit(x).transform(pd.DataFrame({"mes": [3], "temperatura": [np.nan],
                                                                   "precipitacion": [np.nan], "viento": [np.nan]}))
    assert nuevo.loc[0, "temperatura"] == 29.0


def test_filas_sin_clima_conservan_el_orden():
    x = pd.DataFrame({"mes": [1] * 10, "temperatura": np.arange(10.0), "precipitacion": 0.0, "viento": 1.0, "clima_faltante": 0})
    y = pd.Series(np.arange(10.0))
    x2, y2 = agregar_filas_sin_clima(x, y, fraccion=0.3)
    assert len(x2) == 13 and x2["clima_faltante"].sum() == 3
    # Cada copia queda junto a su original y con el mismo objetivo.
    assert (y2.diff().fillna(0) >= 0).all()


def test_division_temporal_ultimos_tres_meses():
    fechas = pd.Series(pd.date_range("2024-10-01", "2026-10-18", freq="D", tz=config.ZONA_HORARIA))
    entrena, corte = division_temporal(fechas)
    assert corte.date().isoformat() == "2026-07-19"
    assert fechas[entrena].max() < corte <= fechas[~entrena].min()
    # Dataset corto: la última fracción.
    corto = pd.Series(pd.date_range("2026-01-01", "2026-02-28", freq="D", tz=config.ZONA_HORARIA))
    entrena, corte = division_temporal(corto)
    assert 0.75 < entrena.mean() < 0.85


def _r(clave, rmse, mb, cumple=True):
    return {"clave": clave, "nombre": clave, "rmse": rmse, "tamano_mb": mb, "cumple_restricciones": cumple}


def test_gana_el_menor_rmse():
    clave, motivo = elegir_ganador([_r("ridge", 9.0, 0.01), _r("random_forest", 6.0, 20), _r("hist_gradient_boosting", 6.5, 1)])
    assert clave == "random_forest" and "Menor RMSE" in motivo


def test_con_menos_de_2_por_ciento_gana_el_mas_liviano():
    clave, motivo = elegir_ganador([_r("ridge", 9.0, 0.01), _r("random_forest", 6.00, 20), _r("hist_gradient_boosting", 6.10, 1)])
    assert clave == "hist_gradient_boosting" and "más liviano" in motivo


def test_excluye_los_que_no_cumplen_restricciones():
    clave, _ = elegir_ganador([_r("random_forest", 5.0, 80, cumple=False), _r("hist_gradient_boosting", 6.0, 1)])
    assert clave == "hist_gradient_boosting"
    with pytest.raises(SystemExit):
        elegir_ganador([_r("random_forest", 5.0, 80, cumple=False)])


def test_comparar_guarda_ganador_reportes_y_metadatos(archivo_dataset, destinos, tmp_path):
    m = comparar("simulado", archivo_dataset, destinos, tmp_path, tmp_path, hiperparametros=HIPER_RAPIDOS, graficos=False)
    claves = [r["clave"] for r in m["comparacion"]]
    assert claves == [*config.MODELOS, "baseline"]
    assert sum(r["ganador"] for r in m["comparacion"]) == 1
    assert m["modelo"]["clave"] == m["seleccion"]["ganador"] in config.MODELOS
    for r in m["comparacion"][:3]:
        assert {"mae", "rmse", "r2", "rmse_sin_clima", "mae_por_categoria", "mae_por_temporada",
                "tiempo_entrenamiento_s", "tamano_mb", "ms_prediccion"} <= r.keys()
        assert r["tamano_mb"] <= config.MAX_MB_MODELO and r["ms_prediccion"] < config.MAX_MS_PREDICCION
    assert m["origen_dato"] == "simulado_calibrado" and m["datos_sinteticos"] is True
    assert (tmp_path / "comparacion_modelos.md").exists() and (tmp_path / "comparacion_modelos.csv").exists()
    ganador = json.loads((tmp_path / "ganador.json").read_text(encoding="utf-8"))
    assert ganador["modelo"] == m["modelo"]["clave"]
    assert "simulados" in (tmp_path / "comparacion_modelos.md").read_text(encoding="utf-8").lower()

    # Entrenamiento rápido: reentrena solo al ganador, con sus hiperparámetros y sin búsqueda.
    rapido = entrenar("simulado", archivo_dataset, destinos, tmp_path / "rapido", tmp_path / "rapido",
                      archivo_ganador=tmp_path / "ganador.json")
    assert rapido["modelo"]["clave"] == ganador["modelo"]
    assert rapido["modelo"]["hiperparametros"] == ganador["hiperparametros"]
    assert rapido["comparacion"] == ganador["comparacion"]


def test_busqueda_de_hiperparametros_reproducible(xy, monkeypatch):
    x, y, _ = xy
    monkeypatch.setitem(entrenar_modelo.ITERACIONES_BUSQUEDA, "ridge", 2)
    a = entrenar_modelo.buscar_hiperparametros("ridge", x, y)
    b = entrenar_modelo.buscar_hiperparametros("ridge", x, y)
    assert a == b and a["alpha"] in (0.1, 1.0, 10.0, 100.0)
