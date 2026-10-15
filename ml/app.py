"""
Servicio HTTP de predicción de ocupación (FastAPI).

    uvicorn app:app --host 0.0.0.0 --port 8000

Endpoints:
  GET  /health          estado del servicio y del modelo (público)
  POST /predict         una predicción (destino, fecha, hora y clima opcional)
  POST /predict/lote    varias predicciones en una llamada (máx. 500)

/predict y /predict/lote exigen la cabecera X-API-Key igual a la variable ML_API_KEY.
Cada respuesta indica el origen del modelo ("mock" = datos simulados, "real") para que
el backend y la app muestren "Estimación basada en datos simulados" mientras sea mock.
Si el archivo del modelo cambia (reentrenamiento), se recarga en la siguiente petición.
"""
from __future__ import annotations

import os
import secrets
import threading
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

import config
from comun import abierto_a_las
from preparar_dataset import fila_para_prediccion

MAX_LOTE = 500
MENSAJE_SINTETICO = "Estimación basada en datos simulados"


# ---------------------------------------------------------------------------
# Modelo (se carga una vez y se recarga si cambia el archivo)
# ---------------------------------------------------------------------------
class GestorModelo:
    def __init__(self, ruta: Path):
        self.ruta = ruta
        self._paquete: dict | None = None
        self._mtime: float | None = None
        self._lock = threading.Lock()

    def obtener(self) -> dict | None:
        try:
            mtime = self.ruta.stat().st_mtime
        except FileNotFoundError:
            return None
        if self._paquete is None or mtime != self._mtime:
            with self._lock:
                if self._paquete is None or mtime != self._mtime:
                    paquete = joblib.load(self.ruta)
                    paquete["destinos_df"] = pd.DataFrame(paquete["destinos"])
                    paquete["destinos_por_id"] = {int(d["id_destino"]): d for d in paquete["destinos"]}
                    self._paquete, self._mtime = paquete, mtime
        return self._paquete

    def requerir(self) -> dict:
        paquete = self.obtener()
        if paquete is None:
            raise HTTPException(
                status_code=503,
                detail={
                    "codigo": "MODELO_NO_ENTRENADO",
                    "mensaje": "No hay un modelo entrenado. Ejecuta: python generar_mock_dataset.py y python entrenar_modelo.py.",
                },
            )
        return paquete


gestor = GestorModelo(Path(os.getenv("ML_MODELO_PATH", str(config.MODELO_ARCHIVO))))


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI):
    gestor.obtener()  # carga anticipada; si no hay modelo, /health lo informa
    yield


app = FastAPI(title="MiSanAndrés · Predicción de ocupación", version="1.0.0", lifespan=ciclo_de_vida)

# ---------------------------------------------------------------------------
# Autenticación por API key
# ---------------------------------------------------------------------------
cabecera_api_key = APIKeyHeader(name="X-API-Key", auto_error=False)


def verificar_api_key(clave: str | None = Security(cabecera_api_key)) -> None:
    esperada = os.getenv("ML_API_KEY", "")
    if not esperada:
        raise HTTPException(
            status_code=503,
            detail={"codigo": "API_KEY_NO_CONFIGURADA", "mensaje": "El servicio no tiene ML_API_KEY configurada."},
        )
    if not clave or not secrets.compare_digest(clave, esperada):
        raise HTTPException(status_code=401, detail={"codigo": "NO_AUTORIZADO", "mensaje": "Falta la cabecera X-API-Key o no es válida."})


# ---------------------------------------------------------------------------
# Esquemas
# ---------------------------------------------------------------------------
class Clima(BaseModel):
    temperatura: float | None = Field(default=None, ge=-10, le=50, description="°C")
    precipitacion: float | None = Field(default=None, ge=0, le=500, description="mm en la hora")
    viento: float | None = Field(default=None, ge=0, le=200, description="km/h")


class Consulta(BaseModel):
    id_destino: int = Field(gt=0)
    fecha: date = Field(description="AAAA-MM-DD (hora de Colombia)")
    hora: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="HH:MM (hora de Colombia)")
    clima: Clima | None = None


class Lote(BaseModel):
    consultas: list[Consulta] = Field(min_length=1, max_length=MAX_LOTE)


class OrigenModelo(BaseModel):
    origen_modelo: Literal["mock", "real"]
    datos_sinteticos: bool
    mensaje_origen: str | None
    version_modelo: str
    listo_para_produccion: bool


class Prediccion(BaseModel):
    id_destino: int
    fecha: date
    hora: str
    estado: Literal["Abierto", "Cerrado"]
    porcentaje: float
    nivel: Literal["Bajo", "Medio", "Alto"] | None
    personas_estimadas: int


class RespuestaPrediccion(Prediccion, OrigenModelo):
    pass


class RespuestaLote(OrigenModelo):
    resultados: list[Prediccion]


# ---------------------------------------------------------------------------
# Predicción
# ---------------------------------------------------------------------------
def origen_de(paquete: dict) -> dict:
    m = paquete["metadatos"]
    sintetico = bool(m["datos_sinteticos"])
    return {
        "origen_modelo": m["origen_datos"],
        "datos_sinteticos": sintetico,
        "mensaje_origen": MENSAJE_SINTETICO if sintetico else None,
        "version_modelo": m["fecha_entrenamiento"],
        "listo_para_produccion": bool(m["listo_para_produccion"]),
    }


def predecir(paquete: dict, consultas: list[Consulta]) -> list[Prediccion]:
    destinos = paquete["destinos_por_id"]
    desconocidos = sorted({c.id_destino for c in consultas if c.id_destino not in destinos})
    if desconocidos:
        raise HTTPException(
            status_code=404,
            detail={"codigo": "DESTINO_DESCONOCIDO", "mensaje": f"El modelo no conoce los destinos {desconocidos}."},
        )
    resultados: list[Prediccion | None] = [None] * len(consultas)
    filas, posiciones = [], []
    for i, c in enumerate(consultas):
        hora = int(c.hora[:2])
        destino = destinos[c.id_destino]
        if not abierto_a_las(destino, hora):
            resultados[i] = Prediccion(id_destino=c.id_destino, fecha=c.fecha, hora=c.hora, estado="Cerrado",
                                       porcentaje=0, nivel=None, personas_estimadas=0)
            continue
        clima = c.clima.model_dump() if c.clima else None
        filas.append(fila_para_prediccion(c.id_destino, c.fecha, hora, clima, paquete["destinos_df"]))
        posiciones.append(i)
    if filas:
        valores = np.clip(paquete["pipeline"].predict(pd.concat(filas, ignore_index=True)), 0, 100)
        for i, valor in zip(posiciones, valores):
            c = consultas[i]
            porcentaje = round(float(valor), 1)
            capacidad = int(destinos[c.id_destino]["capacidad"])
            resultados[i] = Prediccion(
                id_destino=c.id_destino, fecha=c.fecha, hora=c.hora, estado="Abierto", porcentaje=porcentaje,
                nivel=config.nivel_desde_porcentaje(porcentaje), personas_estimadas=round(porcentaje / 100 * capacidad),
            )
    return [r for r in resultados if r is not None]


@app.get("/health")
def health() -> dict:
    paquete = gestor.obtener()
    if paquete is None:
        return {"estado": "sin_modelo", "modelo_cargado": False,
                "mensaje": "No hay modelo entrenado: ejecuta python entrenar_modelo.py."}
    return {"estado": "ok", "modelo_cargado": True, **origen_de(paquete),
            "metricas": paquete["metadatos"]["metricas"], "destinos": len(paquete["destinos"])}


@app.post("/predict", response_model=RespuestaPrediccion, dependencies=[Depends(verificar_api_key)])
def predict(consulta: Consulta) -> RespuestaPrediccion:
    paquete = gestor.requerir()
    [prediccion] = predecir(paquete, [consulta])
    return RespuestaPrediccion(**prediccion.model_dump(), **origen_de(paquete))


@app.post("/predict/lote", response_model=RespuestaLote, dependencies=[Depends(verificar_api_key)])
def predict_lote(lote: Lote) -> RespuestaLote:
    paquete = gestor.requerir()
    return RespuestaLote(resultados=predecir(paquete, lote.consultas), **origen_de(paquete))
