"""Pipelines de los tres modelos, clima nulo, división temporal, selección del ganador y comparación."""
import json

import numpy as np
import pandas as pd
import pytest

from misanandres_ml import config
from misanandres_ml import modelos
from misanandres_ml.datos.preparar_dataset import CLIMA, ImputadorClimatologia, agregar_filas_sin_clima, preparar
from misanandres_ml.modelos import construir_pipeline
from misanandres_ml.modelos.comparar import comparar, entrenar
from misanandres_ml.modelos.evaluacion import buscar_hiperparametros, division_temporal, elegir_ganador
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
    clave, motivo = elegir_ganador([_r("ridge", 9.0, 0.01), _r("random_forest", 6.0, 20), _r("gradient_boosting", 6.5, 1)])
    assert clave == "random_forest" and "Menor RMSE" in motivo


def test_con_menos_de_2_por_ciento_gana_el_mas_liviano():
    clave, motivo = elegir_ganador([_r("ridge", 9.0, 0.01), _r("random_forest", 6.00, 20), _r("gradient_boosting", 6.10, 1)])
    assert clave == "gradient_boosting" and "más liviano" in motivo


def test_excluye_los_que_no_cumplen_restricciones():
    clave, _ = elegir_ganador([_r("random_forest", 5.0, 80, cumple=False), _r("gradient_boosting", 6.0, 1)])
    assert clave == "gradient_boosting"
    with pytest.raises(SystemExit):
        elegir_ganador([_r("random_forest", 5.0, 80, cumple=False)])


def test_comparar_guarda_los_tres_artefactos_y_el_ganador(archivo_dataset, destinos, tmp_path):
    indice = comparar("simulado", archivo_dataset, destinos, tmp_path, tmp_path, hiperparametros=HIPER_RAPIDOS, graficos=False)
    claves = [r["clave"] for r in indice["comparacion"]]
    assert claves == [*config.MODELOS, "baseline"]
    assert sum(r["ganador"] for r in indice["comparacion"]) == 1
    assert indice["modelo"] == indice["seleccion"]["ganador"] in config.MODELOS
    for r in indice["comparacion"][:3]:
        assert {"mae", "rmse", "r2", "rmse_sin_clima", "mae_por_categoria", "mae_por_temporada",
                "tiempo_entrenamiento_s", "tamano_mb", "ms_prediccion"} <= r.keys()
        assert r["tamano_mb"] <= config.MAX_MB_MODELO and r["ms_prediccion"] < config.MAX_MS_PREDICCION
    assert indice["origen_dato"] == "simulado_calibrado" and indice["datos_sinteticos"] is True

    # Los tres modelos, sus metadatos, el índice y el baseline.
    for clave in config.MODELOS:
        assert config.ruta_modelo(clave, tmp_path).exists()
        meta = json.loads(config.ruta_metadatos(clave, tmp_path).read_text(encoding="utf-8"))
        assert meta["modelo"]["clave"] == clave and meta["es_ganador"] == (clave == indice["modelo"])
        assert indice["artefactos"][clave]["versionado"] is True
    ganador = json.loads((tmp_path / "ganador.json").read_text(encoding="utf-8"))
    assert ganador["modelo"] == indice["modelo"]
    # Orden de respaldo: el ganador y luego los demás por RMSE.
    otros = sorted((r for r in indice["comparacion"][:3] if not r["ganador"]), key=lambda r: r["rmse"])
    assert ganador["orden_respaldo"] == [indice["modelo"], *(r["clave"] for r in otros)]
    baseline = json.loads((tmp_path / "baseline.json").read_text(encoding="utf-8"))
    assert baseline["por_hora"] and baseline["global"] > 0
    assert (tmp_path / "comparacion_modelos.md").exists() and (tmp_path / "comparacion_modelos.csv").exists()
    texto = (tmp_path / "comparacion_modelos.md").read_text(encoding="utf-8")
    assert "simulados" in texto.lower() and "Orden de respaldo" in texto

    # Entrenamiento rápido: reentrena solo al ganador, con sus hiperparámetros, y no toca a los otros.
    tiempos = {c: config.ruta_modelo(c, tmp_path).stat().st_mtime_ns for c in config.MODELOS}
    rapido = entrenar("simulado", archivo_dataset, destinos, tmp_path, tmp_path / "rapido")
    assert rapido["modelo"]["clave"] == ganador["modelo"]
    assert rapido["modelo"]["hiperparametros"] == ganador["hiperparametros"]
    for c in config.MODELOS:
        if c != ganador["modelo"]:
            assert config.ruta_modelo(c, tmp_path).stat().st_mtime_ns == tiempos[c]


def test_reduce_el_bosque_si_pesa_mas_del_objetivo(archivo_dataset, destinos, tmp_path, monkeypatch):
    from misanandres_ml.modelos import random_forest

    monkeypatch.setattr(config, "MB_OBJETIVO_VERSIONADO", 0.0)
    monkeypatch.setattr(config, "TOLERANCIA_REDUCCION", 10.0)  # acepta cualquier RMSE en esta prueba
    monkeypatch.setattr(random_forest, "REDUCCIONES", [{"max_depth": 3}])
    indice = comparar("simulado", archivo_dataset, destinos, tmp_path, tmp_path, modelos=("random_forest",),
                      hiperparametros=HIPER_RAPIDOS, graficos=False)
    bosque = indice["comparacion"][0]
    assert bosque["reduccion"]["aplicada"] is True
    assert bosque["hiperparametros"]["max_depth"] == 3
    assert bosque["tamano_mb"] <= bosque["reduccion"]["original"]["tamano_mb"]


def test_modelo_demasiado_grande_versiona_solo_metadatos(archivo_dataset, destinos, tmp_path, monkeypatch):
    monkeypatch.setattr(config, "MB_MAXIMO_VERSIONADO", 0.0)
    indice = comparar("simulado", archivo_dataset, destinos, tmp_path, tmp_path, modelos=("ridge",),
                      hiperparametros=HIPER_RAPIDOS, graficos=False)
    assert indice["artefactos"]["ridge"]["versionado"] is False
    assert not config.ruta_modelo("ridge", tmp_path).exists()
    assert config.ruta_metadatos("ridge", tmp_path).exists()
    assert indice["orden_respaldo"] == []


def test_busqueda_de_hiperparametros_reproducible(xy, monkeypatch):
    x, y, _ = xy
    monkeypatch.setitem(modelos.ITERACIONES_BUSQUEDA, "ridge", 2)
    a = buscar_hiperparametros("ridge", x, y)
    b = buscar_hiperparametros("ridge", x, y)
    assert a == b and a["alpha"] in (0.1, 1.0, 10.0, 100.0)
