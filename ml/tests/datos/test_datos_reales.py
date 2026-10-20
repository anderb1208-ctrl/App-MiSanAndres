"""Apartado de datos reales: archivo válido, con errores, plantilla sin editar y cambio de simulado a real."""
from datetime import date

import pandas as pd
import pytest

import config
from cargar_datos_reales import ErrorCarga, elegir_archivo, procesar
from comun import leer_destinos
from entrenar_modelo import entrenar
from generar_mock_dataset import generar  # el alias anterior sigue funcionando
from tests.conftest import HIPER_RAPIDOS


def archivo_real_minimo(destinos, desde: date, hasta: date, ruta):
    """Como lo entregaría una entidad: solo fecha_hora, id_destino y cantidad_personas."""
    datos = generar(destinos, desde, hasta, semilla=11)
    real = pd.DataFrame(
        {
            "fecha_hora": pd.to_datetime(datos["fecha_hora"].str[:16]).dt.strftime("%Y-%m-%d %H:%M"),
            "id_destino": datos["id_destino"],
            "cantidad_personas": datos["cantidad_personas"],
        }
    )
    for col in config.COLUMNAS_DATASET:
        if col not in real:
            real[col] = ""
    real[config.COLUMNAS_DATASET].to_csv(ruta, index=False)
    return ruta


def test_archivo_real_valido(destinos, tmp_path):
    ruta = archivo_real_minimo(destinos, date(2026, 3, 2), date(2026, 3, 15), tmp_path / "real.csv")
    salida = tmp_path / "procesado.csv"
    df, reporte = procesar(ruta, destinos, salida)
    assert reporte.ok
    assert salida.exists()
    assert df["porcentaje_ocupacion"].notna().all()  # se calculó desde personas y capacidad
    assert df["fecha_hora"].iloc[0].endswith("-05:00")
    assert set(df["temporada"]) <= {"alta", "normal"}


def test_archivo_real_con_errores(destinos, tmp_path):
    ruta = archivo_real_minimo(destinos, date(2026, 3, 2), date(2026, 3, 3), tmp_path / "real.csv")
    df = pd.read_csv(ruta, dtype=str)
    df.loc[0, "cantidad_personas"] = "100000"  # supera la capacidad
    df.loc[1, "fecha_hora"] = "2026-03-02 03:00"  # madrugada: fuera del horario
    df.to_csv(ruta, index=False)
    with pytest.raises(ErrorCarga) as error:
        procesar(ruta, destinos, tmp_path / "procesado.csv")
    assert "supera la capacidad" in str(error.value)
    assert "fuera del horario" in str(error.value)
    assert not (tmp_path / "procesado.csv").exists()


def test_faltan_columnas_obligatorias(destinos, tmp_path):
    ruta = tmp_path / "real.csv"
    pd.DataFrame({"fecha_hora": ["2026-03-02 10:00"], "id_destino": [1]}).to_csv(ruta, index=False)
    with pytest.raises(ErrorCarga, match="cantidad_personas"):
        procesar(ruta, destinos)


def test_plantilla_sin_editar_se_rechaza():
    with pytest.raises(ErrorCarga, match="EJEMPLO"):
        procesar(config.PLANTILLA_REAL_CSV, leer_destinos())


def test_elegir_archivo_de_la_carpeta_real(tmp_path):
    with pytest.raises(ErrorCarga, match="No hay ningún archivo"):
        elegir_archivo(None, tmp_path)
    (tmp_path / "ocupacion.csv").write_text("x", encoding="utf-8")
    assert elegir_archivo(None, tmp_path).name == "ocupacion.csv"
    (tmp_path / "otro.csv").write_text("x", encoding="utf-8")
    with pytest.raises(ErrorCarga, match="indica cuál"):
        elegir_archivo(None, tmp_path)


def test_cambio_de_simulado_a_real(monkeypatch, destinos, tmp_path):
    assert config.dataset_activo(None) in config.DATASETS_VALIDOS
    monkeypatch.setenv("DATASET", "real")
    assert config.dataset_activo(None) == "real"
    assert config.ruta_dataset("real") == config.RUTAS_DATASET["real"]
    assert config.dataset_activo("simulado") == "simulado"  # el argumento --dataset gana
    assert config.dataset_activo("mock") == "simulado"  # alias anterior
    with pytest.raises(ValueError):
        config.dataset_activo("otro")

    # Pocas semanas: advierte y no queda listo para producción.
    corto = archivo_real_minimo(destinos, date(2026, 3, 2), date(2026, 3, 15), tmp_path / "corto.csv")
    procesado = tmp_path / "corto_procesado.csv"
    procesar(corto, destinos, procesado)
    m = entrenar("real", procesado, destinos, tmp_path / "m1", tmp_path / "r1", modelo="random_forest",
                 hiperparametros=HIPER_RAPIDOS["random_forest"])
    assert m["origen_datos"] == "real" and m["datos_sinteticos"] is False
    assert m["listo_para_produccion"] is False
    assert any("Pocos datos" in a for a in m["advertencias"])

    # Varias semanas: ya no hay advertencia de pocos datos.
    largo = archivo_real_minimo(destinos, date(2026, 1, 5), date(2026, 3, 29), tmp_path / "largo.csv")
    procesado = tmp_path / "largo_procesado.csv"
    procesar(largo, destinos, procesado)
    m = entrenar("real", procesado, destinos, tmp_path / "m2", tmp_path / "r2", modelo="random_forest",
                 hiperparametros=HIPER_RAPIDOS["random_forest"])
    assert not any("Pocos datos" in a for a in m["advertencias"])
    assert m["listo_para_produccion"] is (m["metricas"]["modelo"]["mae"] < m["metricas"]["baseline"]["mae"])
