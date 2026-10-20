"""Servicio HTTP: predicción con el ganador, candidatos bajo demanda, /comparar, /modelo y respaldo."""
import json
import logging
import shutil

import pytest
from fastapi.testclient import TestClient

import app as servicio
from misanandres_ml import config
from tests.conftest import API_KEY

CABECERA = {"X-API-Key": API_KEY}
CONSULTA = {"id_destino": 1, "fecha": "2026-03-07", "hora": "12:30", "clima": {"temperatura": 29, "precipitacion": 0, "viento": 20}}


def _indice(directorio) -> dict:
    return json.loads((directorio / config.NOMBRE_GANADOR).read_text(encoding="utf-8"))


@pytest.fixture
def cliente(dir_modelo, monkeypatch):
    monkeypatch.setenv("ML_API_KEY", API_KEY)
    monkeypatch.setattr(servicio, "gestor", servicio.GestorModelos(dir_modelo))
    with TestClient(servicio.app) as c:
        yield c


@pytest.fixture
def copia_artefactos(dir_modelo, tmp_path):
    """Copia de los artefactos para poder dañarlos sin afectar a las demás pruebas."""
    destino = tmp_path / "artefactos"
    shutil.copytree(dir_modelo, destino)
    return destino


def _cliente(directorio, monkeypatch) -> TestClient:
    monkeypatch.setenv("ML_API_KEY", API_KEY)
    monkeypatch.setattr(servicio, "gestor", servicio.GestorModelos(directorio))
    return TestClient(servicio.app)


# ---------------------------------------------------------------------------
# Predicción normal (ganador)
# ---------------------------------------------------------------------------
def test_health(cliente, dir_modelo):
    cuerpo = cliente.get("/health").json()
    assert cuerpo["estado"] == "ok" and cuerpo["modelo_cargado"] is True
    assert cuerpo["origen_modelo"] == "simulado" and cuerpo["datos_sinteticos"] is True
    assert cuerpo["modelo_usado"] == cuerpo["ganador"] == _indice(dir_modelo)["modelo"]
    assert cuerpo["respaldo"] is False


def test_al_arrancar_solo_carga_el_ganador(cliente, dir_modelo):
    activo = servicio.gestor._activo
    assert activo is not None and activo["clave"] == _indice(dir_modelo)["modelo"]


def test_predict_usa_el_ganador(cliente, dir_modelo):
    r = cliente.post("/predict", headers=CABECERA, json=CONSULTA)
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["estado"] == "Abierto"
    assert 0 <= cuerpo["porcentaje"] <= 100
    assert cuerpo["nivel"] == config.nivel_desde_porcentaje(cuerpo["porcentaje"])
    assert cuerpo["origen_modelo"] == "simulado"
    ganador = _indice(dir_modelo)["modelo"]
    assert cuerpo["modelo_usado"] == cuerpo["modelo_clave"] == ganador
    assert cuerpo["modelo"] == config.NOMBRES_MODELO[ganador] and cuerpo["respaldo"] is False
    assert cuerpo["mensaje_origen"] == "Estimación basada en datos simulados"
    assert cuerpo["personas_estimadas"] == round(cuerpo["porcentaje"] / 100 * 100)


def test_predict_fuera_de_horario(cliente):
    r = cliente.post("/predict", headers=CABECERA, json={"id_destino": 5, "fecha": "2026-03-07", "hora": "07:00"})
    assert r.json()["estado"] == "Cerrado" and r.json()["porcentaje"] == 0 and r.json()["nivel"] is None


def test_lote(cliente, dir_modelo):
    consultas = [{"id_destino": i, "fecha": "2026-03-08", "hora": "13:00"} for i in (1, 5, 8)]
    r = cliente.post("/predict/lote", headers=CABECERA, json={"consultas": consultas})
    assert r.status_code == 200
    assert [x["id_destino"] for x in r.json()["resultados"]] == [1, 5, 8]
    assert r.json()["origen_modelo"] == "simulado"
    assert r.json()["modelo_usado"] == _indice(dir_modelo)["modelo"] and r.json()["respaldo"] is False


def test_predict_con_clima_nulo(cliente):
    """El backend manda clima nulo para fechas sin pronóstico: se imputa con la climatología del mes."""
    for clima in (None, {"temperatura": None, "precipitacion": None, "viento": None}):
        r = cliente.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2027-01-16", "hora": "12:00", "clima": clima})
        assert r.status_code == 200
        assert r.json()["estado"] == "Abierto" and 0 <= r.json()["porcentaje"] <= 100


# ---------------------------------------------------------------------------
# Candidatos bajo demanda
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("clave", config.MODELOS)
def test_predict_con_un_candidato(cliente, dir_modelo, clave):
    r = cliente.post("/predict", headers=CABECERA, json={**CONSULTA, "modelo": clave})
    assert r.status_code == 200
    assert r.json()["modelo_usado"] == clave and r.json()["modelo"] == config.NOMBRES_MODELO[clave]
    # El candidato se libera: el residente sigue siendo el ganador.
    assert servicio.gestor._activo["clave"] == _indice(dir_modelo)["modelo"]


def test_predict_acepta_la_clave_anterior(cliente):
    r = cliente.post("/predict", headers=CABECERA, json={**CONSULTA, "modelo": "hist_gradient_boosting"})
    assert r.status_code == 200 and r.json()["modelo_usado"] == "gradient_boosting"


def test_predict_rechaza_un_modelo_desconocido(cliente):
    r = cliente.post("/predict", headers=CABECERA, json={**CONSULTA, "modelo": "xgboost"})
    assert r.status_code == 422
    detalle = r.json()["detail"]
    assert detalle["codigo"] == "MODELO_DESCONOCIDO"
    assert all(c in detalle["mensaje"] for c in config.MODELOS)


def test_comparar_devuelve_los_tres_y_el_baseline(cliente, dir_modelo):
    r = cliente.post("/comparar", headers=CABECERA, json=CONSULTA)
    assert r.status_code == 200
    cuerpo = r.json()
    ganador = _indice(dir_modelo)["modelo"]
    assert cuerpo["ganador"] == ganador and cuerpo["estado"] == "Abierto"
    assert [x["clave"] for x in cuerpo["resultados"]] == [*config.MODELOS, "baseline"]
    assert [x["clave"] for x in cuerpo["resultados"] if x["ganador"]] == [ganador]
    for x in cuerpo["resultados"]:
        assert x["disponible"] is True and 0 <= x["porcentaje"] <= 100 and x["nivel"] is not None
    # La predicción del ganador coincide con /predict.
    normal = cliente.post("/predict", headers=CABECERA, json=CONSULTA).json()
    assert next(x for x in cuerpo["resultados"] if x["ganador"])["porcentaje"] == normal["porcentaje"]
    assert servicio.gestor._activo["clave"] == ganador


def test_comparar_destino_cerrado(cliente):
    r = cliente.post("/comparar", headers=CABECERA, json={"id_destino": 5, "fecha": "2026-03-07", "hora": "07:00"})
    assert r.json()["estado"] == "Cerrado"
    assert all(x["porcentaje"] == 0 and x["nivel"] is None for x in r.json()["resultados"])


# ---------------------------------------------------------------------------
# /modelo
# ---------------------------------------------------------------------------
def test_modelo_lista_los_tres(cliente, dir_modelo):
    r = cliente.get("/modelo", headers=CABECERA)
    assert r.status_code == 200
    cuerpo = r.json()
    ganador = _indice(dir_modelo)["modelo"]
    assert [m["clave"] for m in cuerpo["modelos"]] == list(config.MODELOS)
    assert cuerpo["ganador"] == cuerpo["activo"] == ganador and cuerpo["respaldo"] is False
    assert [m["clave"] for m in cuerpo["modelos"] if m["ganador"]] == [ganador]
    assert [m["clave"] for m in cuerpo["modelos"] if m["activo"]] == [ganador]
    for m in cuerpo["modelos"]:
        assert m["disponible"] is True and m["tamano_mb"] > 0 and m["rmse"] > 0 and m["r2"] is not None
    assert cuerpo["baseline"]["clave"] == "baseline" and cuerpo["baseline"]["rmse"] > 0
    assert cuerpo["datos_sinteticos"] is True and cuerpo["mensaje_origen"] == "Estimación basada en datos simulados"
    assert cuerpo["orden_respaldo"][0] == ganador


# ---------------------------------------------------------------------------
# Validación y API key
# ---------------------------------------------------------------------------
@pytest.mark.parametrize(
    "cuerpo",
    [{"id_destino": 1, "fecha": "2026-03-07", "hora": "25:00"}, {"id_destino": 0, "fecha": "2026-03-07", "hora": "10:00"},
     {"id_destino": 1, "fecha": "07/03/2026", "hora": "10:00"}],
)
def test_entradas_invalidas(cliente, cuerpo):
    assert cliente.post("/predict", headers=CABECERA, json=cuerpo).status_code == 422
    assert cliente.post("/comparar", headers=CABECERA, json=cuerpo).status_code == 422


def test_destino_desconocido(cliente):
    for ruta in ("/predict", "/comparar"):
        r = cliente.post(ruta, headers=CABECERA, json={"id_destino": 99, "fecha": "2026-03-07", "hora": "10:00"})
        assert r.status_code == 404 and r.json()["detail"]["codigo"] == "DESTINO_DESCONOCIDO"


def test_api_key(cliente, monkeypatch):
    cuerpo = {"id_destino": 1, "fecha": "2026-03-07", "hora": "10:00"}
    for metodo, ruta, datos in (("post", "/predict", cuerpo), ("post", "/comparar", cuerpo),
                                ("post", "/predict/lote", {"consultas": [cuerpo]}), ("get", "/modelo", None)):
        llamar = getattr(cliente, metodo)
        argumentos = {"json": datos} if datos else {}
        assert llamar(ruta, **argumentos).status_code == 401
        assert llamar(ruta, headers={"X-API-Key": "otra"}, **argumentos).status_code == 401
    assert cliente.get("/health").status_code == 200  # público
    monkeypatch.delenv("ML_API_KEY")
    r = cliente.post("/predict", headers=CABECERA, json=cuerpo)
    assert r.status_code == 503 and r.json()["detail"]["codigo"] == "API_KEY_NO_CONFIGURADA"


# ---------------------------------------------------------------------------
# Respaldo
# ---------------------------------------------------------------------------
def test_ganador_danado_usa_el_siguiente_por_rmse(copia_artefactos, monkeypatch, caplog):
    indice = _indice(copia_artefactos)
    ganador, siguiente = indice["orden_respaldo"][0], indice["orden_respaldo"][1]
    config.ruta_modelo(ganador, copia_artefactos).write_bytes(b"esto no es un modelo")
    with caplog.at_level(logging.WARNING, logger="misanandres_ml.servicio"), _cliente(copia_artefactos, monkeypatch) as c:
        r = c.post("/predict", headers=CABECERA, json=CONSULTA)
        assert r.status_code == 200
        assert r.json()["modelo_usado"] == siguiente and r.json()["respaldo"] is True
        salud = c.get("/health").json()
        assert salud["estado"] == "ok" and salud["respaldo"] is True and salud["ganador"] == ganador
        modelo = c.get("/modelo", headers=CABECERA).json()
        assert modelo["activo"] == siguiente and modelo["respaldo"] is True and modelo["ganador"] == ganador
        # /comparar marca al ganador como no disponible y sigue con los demás.
        comp = c.post("/comparar", headers=CABECERA, json=CONSULTA).json()
        fila = next(x for x in comp["resultados"] if x["clave"] == ganador)
        assert fila["disponible"] is False and fila["error"]
        assert sum(x["disponible"] for x in comp["resultados"]) == len(config.MODELOS)
        # Pedir explícitamente el ganador dañado da un error claro.
        r = c.post("/predict", headers=CABECERA, json={**CONSULTA, "modelo": ganador})
        assert r.status_code == 503 and r.json()["detail"]["codigo"] == "MODELO_NO_DISPONIBLE"
    assert any("respaldo" in m and ganador in m for m in caplog.messages)


def test_ganador_faltante_usa_el_respaldo(copia_artefactos, monkeypatch):
    indice = _indice(copia_artefactos)
    config.ruta_modelo(indice["orden_respaldo"][0], copia_artefactos).unlink()
    with _cliente(copia_artefactos, monkeypatch) as c:
        r = c.post("/predict", headers=CABECERA, json=CONSULTA).json()
        assert r["modelo_usado"] == indice["orden_respaldo"][1] and r["respaldo"] is True


def test_ningun_modelo_carga(copia_artefactos, monkeypatch):
    for clave in config.MODELOS:
        config.ruta_modelo(clave, copia_artefactos).write_bytes(b"archivo roto")
    with _cliente(copia_artefactos, monkeypatch) as c:
        assert c.get("/health").json()["estado"] == "sin_modelo"
        r = c.post("/predict", headers=CABECERA, json=CONSULTA)
        assert r.status_code == 503 and r.json()["detail"]["codigo"] == "MODELO_NO_ENTRENADO"


def test_sin_modelo_entrenado(tmp_path, monkeypatch):
    with _cliente(tmp_path / "no-existe", monkeypatch) as c:
        assert c.get("/health").json()["estado"] == "sin_modelo"
        assert c.get("/modelo", headers=CABECERA).status_code == 503
        r = c.post("/predict", headers=CABECERA, json={"id_destino": 1, "fecha": "2026-03-07", "hora": "10:00"})
        assert r.status_code == 503 and r.json()["detail"]["codigo"] == "MODELO_NO_ENTRENADO"
