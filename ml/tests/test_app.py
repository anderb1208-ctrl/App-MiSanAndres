import pytest
from fastapi.testclient import TestClient

import app as servicio
import config
from tests.conftest import API_KEY

CABECERA = {"X-API-Key": API_KEY}


@pytest.fixture
def cliente(dir_modelo, monkeypatch):
    monkeypatch.setenv("ML_API_KEY", API_KEY)
    monkeypatch.setattr(servicio, "gestor", servicio.GestorModelo(dir_modelo / config.MODELO_ARCHIVO.name))
    with TestClient(servicio.app) as c:
        yield c


def test_health(cliente):
    cuerpo = cliente.get("/health").json()
    assert cuerpo["estado"] == "ok" and cuerpo["modelo_cargado"] is True
    assert cuerpo["origen_modelo"] == "simulado" and cuerpo["datos_sinteticos"] is True
    assert cuerpo["modelo"] in {config.NOMBRES_MODELO[m] for m in config.MODELOS}


def test_predict(cliente):
    r = cliente.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2026-03-07", "hora": "12:30",
                                                          "clima": {"temperatura": 29, "precipitacion": 0, "viento": 20}})
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["estado"] == "Abierto"
    assert 0 <= cuerpo["porcentaje"] <= 100
    assert cuerpo["nivel"] == config.nivel_desde_porcentaje(cuerpo["porcentaje"])
    assert cuerpo["origen_modelo"] == "simulado"
    assert cuerpo["modelo_clave"] in config.MODELOS and cuerpo["modelo"] == config.NOMBRES_MODELO[cuerpo["modelo_clave"]]
    assert cuerpo["mensaje_origen"] == "Estimación basada en datos simulados"
    assert cuerpo["personas_estimadas"] == round(cuerpo["porcentaje"] / 100 * 100)


def test_predict_fuera_de_horario(cliente):
    r = cliente.post("/predict", headers=CABECERA, json={"id_destino": 5, "fecha": "2026-03-07", "hora": "07:00"})
    assert r.json()["estado"] == "Cerrado" and r.json()["porcentaje"] == 0 and r.json()["nivel"] is None


def test_lote(cliente):
    consultas = [{"id_destino": i, "fecha": "2026-03-08", "hora": "13:00"} for i in (1, 5, 8)]
    r = cliente.post("/predict/lote", headers=CABECERA, json={"consultas": consultas})
    assert r.status_code == 200
    assert [x["id_destino"] for x in r.json()["resultados"]] == [1, 5, 8]
    assert r.json()["origen_modelo"] == "simulado"
    assert r.json()["modelo_clave"] in config.MODELOS


def test_predict_con_clima_nulo(cliente):
    """El backend manda clima nulo para fechas sin pronóstico: se imputa con la climatología del mes."""
    for clima in (None, {"temperatura": None, "precipitacion": None, "viento": None}):
        r = cliente.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2027-01-16", "hora": "12:00", "clima": clima})
        assert r.status_code == 200
        assert r.json()["estado"] == "Abierto" and 0 <= r.json()["porcentaje"] <= 100


def test_modelo_devuelve_ganador_y_comparativa(cliente):
    r = cliente.get("/modelo")
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["ganador"]["clave"] in config.MODELOS
    assert [m["clave"] for m in cuerpo["comparacion"]] == [*config.MODELOS, "baseline"]
    assert sum(m["ganador"] for m in cuerpo["comparacion"]) == 1
    assert cuerpo["seleccion"]["ganador"] == cuerpo["ganador"]["clave"]
    assert cuerpo["datos_sinteticos"] is True and cuerpo["origen_dato"] == "simulado_calibrado"
    assert cuerpo["mensaje_origen"] == "Estimación basada en datos simulados"
    # Coincide con el modelo que responde /predict.
    pred = cliente.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2026-03-07", "hora": "12:00"}).json()
    assert pred["modelo_clave"] == cuerpo["ganador"]["clave"]


@pytest.mark.parametrize(
    "cuerpo",
    [{"id_destino": 1, "fecha": "2026-03-07", "hora": "25:00"}, {"id_destino": 0, "fecha": "2026-03-07", "hora": "10:00"},
     {"id_destino": 1, "fecha": "07/03/2026", "hora": "10:00"}],
)
def test_entradas_invalidas(cliente, cuerpo):
    assert cliente.post("/predict", headers=CABECERA, json=cuerpo).status_code == 422


def test_destino_desconocido(cliente):
    r = cliente.post("/predict", headers=CABECERA, json={"id_destino": 99, "fecha": "2026-03-07", "hora": "10:00"})
    assert r.status_code == 404 and r.json()["detail"]["codigo"] == "DESTINO_DESCONOCIDO"


def test_api_key(cliente, monkeypatch):
    cuerpo = {"id_destino": 1, "fecha": "2026-03-07", "hora": "10:00"}
    assert cliente.post("/predict", json=cuerpo).status_code == 401
    assert cliente.post("/predict", headers={"X-API-Key": "otra"}, json=cuerpo).status_code == 401
    monkeypatch.delenv("ML_API_KEY")
    r = cliente.post("/predict", headers=CABECERA, json=cuerpo)
    assert r.status_code == 503 and r.json()["detail"]["codigo"] == "API_KEY_NO_CONFIGURADA"


def test_sin_modelo_entrenado(tmp_path, monkeypatch):
    monkeypatch.setenv("ML_API_KEY", API_KEY)
    monkeypatch.setattr(servicio, "gestor", servicio.GestorModelo(tmp_path / "no-existe.joblib"))
    with TestClient(servicio.app) as c:
        assert c.get("/health").json()["estado"] == "sin_modelo"
        assert c.get("/modelo").status_code == 503
        r = c.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2026-03-07", "hora": "10:00"})
        assert r.status_code == 503 and r.json()["detail"]["codigo"] == "MODELO_NO_ENTRENADO"
