import pandas as pd
import pytest

import validar_dataset
from validar_dataset import validar


@pytest.fixture
def muestra(dataset) -> pd.DataFrame:
    return dataset.head(300).copy().reset_index(drop=True)


def errores(df, destinos) -> str:
    r = validar(df, destinos)
    assert not r.ok
    return " | ".join(r.errores)


def test_dataset_valido(muestra, destinos):
    r = validar(muestra, destinos)
    assert r.ok, r.errores
    assert r.cobertura is not None and len(r.cobertura) == 3


def test_falta_columna(muestra, destinos):
    assert "Faltan columnas: viento" in errores(muestra.drop(columns="viento"), destinos)


def test_rangos(muestra, destinos):
    df = muestra.copy()
    df.loc[0, "porcentaje_ocupacion"] = 120
    df.loc[1, "cantidad_personas"] = -3
    df.loc[2, "cantidad_personas"] = 10_000
    texto = errores(df, destinos)
    assert "fuera de 0–100" in texto
    assert "negativa" in texto
    assert "supera la capacidad" in texto


def test_duplicados_y_horario(muestra, destinos):
    fila_fuera = muestra.iloc[[0]].copy()
    fila_fuera["id_destino"] = 5  # Johnny Cay abre a las 09:00; la fila es de las 06:00
    df = pd.concat([muestra, muestra.iloc[[3]], fila_fuera], ignore_index=True)
    texto = errores(df, destinos)
    assert "Filas repetidas" in texto
    assert "fuera del horario" in texto


def test_calendario_incoherente_y_destino_desconocido(muestra, destinos):
    df = muestra.copy()
    df.loc[0, "es_festivo"] = not bool(df.loc[0, "es_festivo"])
    df.loc[1, "id_destino"] = 999
    texto = errores(df, destinos)
    assert "es_festivo no coincide" in texto
    assert "no existe" in texto


def test_filas_de_ejemplo(muestra, destinos):
    df = muestra.copy()
    df["fecha_hora"] = df["fecha_hora"].astype(object)
    df.loc[0, "fecha_hora"] = "EJEMPLO 2026-01-10 14:00"
    assert "EJEMPLO" in errores(df, destinos)


def test_codigo_de_salida(muestra, tmp_path, monkeypatch, destinos):
    monkeypatch.setattr(validar_dataset, "leer_destinos", lambda: destinos)
    bueno, malo = tmp_path / "bueno.csv", tmp_path / "malo.csv"
    muestra.to_csv(bueno, index=False)
    muestra.assign(porcentaje_ocupacion=150).to_csv(malo, index=False)
    assert validar_dataset.main(["--archivo", str(bueno)]) == 0
    assert validar_dataset.main(["--archivo", str(malo)]) == 1
