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
    assert cuerpo["origen_modelo"] == "mock" and cuerpo["datos_sinteticos"] is True


def test_predict(cliente):
    r = cliente.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2026-03-07", "hora": "12:30",
                                                          "clima": {"temperatura": 29, "precipitacion": 0, "viento": 20}})
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["estado"] == "Abierto"
    assert 0 <= cuerpo["porcentaje"] <= 100
    assert cuerpo["nivel"] == config.nivel_desde_porcentaje(cuerpo["porcentaje"])
    assert cuerpo["origen_modelo"] == "mock"
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
    assert r.json()["origen_modelo"] == "mock"


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
        r = c.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2026-03-07", "hora": "10:00"})
        assert r.status_code == 503 and r.json()["detail"]["codigo"] == "MODELO_NO_ENTRENADO"
