"""
Servicio HTTP de predicción de ocupación (FastAPI).

    uvicorn app:app --host 0.0.0.0 --port 8000

Endpoints:
  GET  /health          estado del servicio, modelo activo y memoria (público, para Render)
  GET  /modelo          los tres modelos con métricas, tamaño, ganador y cuál está activo
  POST /predict         una predicción; `modelo` opcional (ridge | random_forest | gradient_boosting)
  POST /predict/lote    varias predicciones en una llamada (máx. 500), las que usa el backend
  POST /comparar        la misma consulta con los tres modelos y el baseline, lado a lado

Todos menos /health exigen la cabecera X-API-Key igual a la variable ML_API_KEY.

Modelos (ml/artefactos/, ver misanandres_ml/modelos/artefactos.py):
- Al arrancar se carga SOLO el ganador (ganador.json). Es el único que queda en memoria y el
  que atiende /predict y /predict/lote por defecto.
- Si el archivo del ganador falta o no carga, se usa el siguiente mejor por RMSE
  (orden_respaldo), se registra en los logs y la respuesta trae respaldo: true. Si ninguno
  carga, responde 503 MODELO_NO_ENTRENADO y el backend usa su cálculo heurístico.
- Los otros dos se cargan bajo demanda (/predict con `modelo`, /comparar), UNO A LA VEZ, y se
  liberan al terminar: así el servicio cabe en los 512 MB de Render gratis.
- Si un archivo cambia (reentrenamiento), se recarga en la siguiente petición.
Cada respuesta indica qué modelo respondió (modelo, modelo_clave, modelo_usado) y el origen de
los datos ("simulado" o "real"), para que la app muestre "Estimado con [modelo] · datos simulados".
"""
from __future__ import annotations

import gc
import logging
import os
import secrets
import threading
from contextlib import asynccontextmanager, contextmanager
from datetime import date
from pathlib import Path
from typing import Iterator, Literal

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

from misanandres_ml import config
from misanandres_ml.comun import abierto_a_las
from misanandres_ml.datos.preparar_dataset import fila_para_prediccion
from misanandres_ml.modelos import normalizar_clave
from misanandres_ml.modelos.artefactos import cargar_paquete, leer_baseline, leer_ganador
from misanandres_ml.modelos.evaluacion import prediccion_baseline

MAX_LOTE = 500
MENSAJE_SINTETICO = "Estimación basada en datos simulados"
CLAVES_VALIDAS = ", ".join(config.MODELOS)

log = logging.getLogger("misanandres_ml.servicio")
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO, format="[ml] %(levelname)s %(message)s")


def memoria_mb() -> float | None:
    """Memoria residente del proceso (MB). En Linux (Render) se lee de /proc; en otros, None."""
    try:
        for linea in Path("/proc/self/status").read_text().splitlines():
            if linea.startswith("VmRSS:"):
                return round(int(linea.split()[1]) / 1024, 1)
    except OSError:
        pass
    return None


# ---------------------------------------------------------------------------
# Gestor de modelos: ganador residente, respaldo y carga bajo demanda
# ---------------------------------------------------------------------------
class ErrorCarga(Exception):
    pass


class GestorModelos:
    def __init__(self, directorio: Path):
        self.directorio = directorio
        self._lock = threading.RLock()
        self._bajo_demanda = threading.Lock()  # un candidato extra a la vez
        self._indice: dict | None = None
        self._indice_mtime: float | None = None
        self._activo: dict | None = None
        # Archivos que fallaron: no se reintentan hasta que cambien (mtime).
        self._fallos: dict[str, tuple[float, str]] = {}

    # ---- Índice (ganador.json) ----
    def indice(self) -> dict | None:
        ruta = self.directorio / config.NOMBRE_GANADOR
        try:
            mtime = ruta.stat().st_mtime
        except FileNotFoundError:
            self._indice, self._indice_mtime = None, None
            return None
        if mtime != self._indice_mtime:
            try:
                self._indice = leer_ganador(self.directorio)
            except (ValueError, KeyError) as e:
                log.error("ganador.json no es válido (%s): se usará cualquier modelo disponible.", e)
                self._indice = None
            self._indice_mtime = mtime
        return self._indice

    def orden(self) -> list[str]:
        """Ganador primero y luego los demás por RMSE. Sin ganador.json, los que existan."""
        indice = self.indice()
        if indice is None:
            return [c for c in config.MODELOS if config.ruta_modelo(c, self.directorio).exists()]
        orden = indice.get("orden_respaldo") or [indice["modelo"]]
        return [*orden, *(c for c in config.MODELOS if c not in orden)]

    def ganador(self) -> str | None:
        indice = self.indice()
        return indice["modelo"] if indice else None

    # ---- Carga ----
    def _mtime(self, clave: str) -> float | None:
        try:
            return config.ruta_modelo(clave, self.directorio).stat().st_mtime
        except FileNotFoundError:
            return None

    def _cargar(self, clave: str) -> dict:
        ruta = config.ruta_modelo(clave, self.directorio)
        mtime = self._mtime(clave)
        if mtime is None:
            raise ErrorCarga(f"no existe {ruta.name}")
        fallo = self._fallos.get(clave)
        if fallo and fallo[0] == mtime:
            raise ErrorCarga(fallo[1])
        try:
            paquete = cargar_paquete(ruta)
            if "pipeline" not in paquete or "metadatos" not in paquete:
                raise ValueError("el archivo no tiene pipeline ni metadatos")
        except Exception as e:  # archivo dañado, versión incompatible, etc.
            mensaje = f"no se pudo cargar {ruta.name} ({type(e).__name__}: {e})"
            self._fallos[clave] = (mtime, mensaje)
            raise ErrorCarga(mensaje) from e
        self._fallos.pop(clave, None)
        paquete["clave"], paquete["mtime"] = clave, mtime
        return paquete

    def activo(self) -> dict | None:
        """Modelo que atiende las predicciones normales (el único residente en memoria)."""
        with self._lock:
            orden = self.orden()
            if not orden:
                self._activo = None
                return None
            ganador = orden[0]
            actual = self._activo
            if actual and actual["mtime"] == self._mtime(actual["clave"]):
                if actual["clave"] == ganador:
                    return actual
                # Respaldo vigente: solo se reintenta el ganador si su archivo cambió.
                m_ganador = self._mtime(ganador)
                fallo = self._fallos.get(ganador)
                if actual["clave"] in orden and (m_ganador is None or (fallo and fallo[0] == m_ganador)):
                    return actual
            self._activo = None
            del actual
            gc.collect()  # liberar el anterior antes de cargar otro
            errores: list[str] = []
            for clave in orden:
                try:
                    paquete = self._cargar(clave)
                except ErrorCarga as e:
                    errores.append(f"{clave}: {e}")
                    continue
                paquete["respaldo"] = clave != ganador
                if paquete["respaldo"]:
                    log.warning("El ganador (%s) no está disponible: %s. Se usa el respaldo %s.", ganador, errores[0], clave)
                else:
                    log.info("Modelo activo: %s (%s).", clave, config.NOMBRES_MODELO[clave])
                self._activo = paquete
                return paquete
            log.error("Ningún modelo se pudo cargar: %s", "; ".join(errores))
            return None

    def requerir(self) -> dict:
        paquete = self.activo()
        if paquete is None:
            raise HTTPException(
                status_code=503,
                detail={
                    "codigo": "MODELO_NO_ENTRENADO",
                    "mensaje": "No hay un modelo entrenado que se pueda cargar. Ejecuta: "
                               "python -m misanandres_ml.datos.generar_dataset_simulado y python entrenar_modelo.py --comparar.",
                },
            )
        return paquete

    @contextmanager
    def usar(self, clave: str | None) -> Iterator[dict]:
        """El activo (clave None o igual a la del activo) o un candidato cargado bajo demanda,
        uno a la vez, que se libera al salir."""
        activo = self.requerir()
        if clave is None or clave == activo["clave"]:
            yield activo
            return
        with self._bajo_demanda:
            try:
                paquete = self._cargar(clave)
            except ErrorCarga as e:
                raise HTTPException(
                    status_code=503,
                    detail={"codigo": "MODELO_NO_DISPONIBLE", "mensaje": f"El modelo {clave} no está disponible: {e}."},
                ) from e
            paquete["respaldo"] = False
            try:
                yield paquete
            finally:
                del paquete
                gc.collect()


def _directorio_artefactos() -> Path:
    if os.getenv("ML_MODELO_PATH"):
        log.warning("ML_MODELO_PATH ya no se usa: los modelos están en ml/artefactos/ (o ML_ARTEFACTOS_DIR).")
    return Path(os.getenv("ML_ARTEFACTOS_DIR") or config.DIR_ARTEFACTOS)


gestor = GestorModelos(_directorio_artefactos())


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI):
    gestor.activo()  # carga anticipada SOLO del ganador; si no hay, /health lo informa
    yield


app = FastAPI(title="MiSanAndrés · Predicción de ocupación", version="3.0.0", lifespan=ciclo_de_vida)

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


protegido = [Depends(verificar_api_key)]

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
    modelo: str | None = Field(default=None, description=f"Opcional: {CLAVES_VALIDAS}. Por defecto, el ganador.")


class Lote(BaseModel):
    consultas: list[Consulta] = Field(min_length=1, max_length=MAX_LOTE)
    modelo: str | None = Field(default=None, description=f"Opcional: {CLAVES_VALIDAS}. Por defecto, el ganador.")


class OrigenModelo(BaseModel):
    origen_modelo: Literal["simulado", "real"]
    modelo: str = Field(description="Nombre del modelo que respondió, p. ej. HistGradientBoosting")
    modelo_clave: str
    modelo_usado: str = Field(description="Clave del modelo que respondió (igual a modelo_clave)")
    respaldo: bool = Field(description="true si respondió un respaldo porque el ganador no cargó")
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


class ResultadoComparado(BaseModel):
    clave: str
    nombre: str
    ganador: bool
    activo: bool
    disponible: bool
    porcentaje: float | None
    nivel: Literal["Bajo", "Medio", "Alto"] | None
    personas_estimadas: int | None
    error: str | None = None


class RespuestaComparar(BaseModel):
    id_destino: int
    fecha: date
    hora: str
    estado: Literal["Abierto", "Cerrado"]
    ganador: str | None
    origen_modelo: Literal["simulado", "real"]
    datos_sinteticos: bool
    mensaje_origen: str | None
    resultados: list[ResultadoComparado]


# ---------------------------------------------------------------------------
# Predicción
# ---------------------------------------------------------------------------
def validar_modelo(valor: str | None) -> str | None:
    if valor is None:
        return None
    try:
        return normalizar_clave(valor.strip().lower())
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={"codigo": "MODELO_DESCONOCIDO", "mensaje": f'Modelo "{valor}" desconocido. Usa uno de: {CLAVES_VALIDAS}.'},
        ) from None


def origen_de(paquete: dict) -> dict:
    m = paquete["metadatos"]
    sintetico = bool(m["datos_sinteticos"])
    return {
        "origen_modelo": config.ALIAS_DATASET.get(m["origen_datos"], m["origen_datos"]),
        "modelo": config.NOMBRES_MODELO[paquete["clave"]],
        "modelo_clave": paquete["clave"],
        "modelo_usado": paquete["clave"],
        "respaldo": bool(paquete.get("respaldo")),
        "datos_sinteticos": sintetico,
        "mensaje_origen": MENSAJE_SINTETICO if sintetico else None,
        "version_modelo": m["fecha_entrenamiento"],
        "listo_para_produccion": bool(m["listo_para_produccion"]),
    }


def _destinos_conocidos(paquete: dict, consultas: list[Consulta]) -> None:
    desconocidos = sorted({c.id_destino for c in consultas if c.id_destino not in paquete["destinos_por_id"]})
    if desconocidos:
        raise HTTPException(
            status_code=404,
            detail={"codigo": "DESTINO_DESCONOCIDO", "mensaje": f"El modelo no conoce los destinos {desconocidos}."},
        )


def _abierta(paquete: dict, c: Consulta) -> bool:
    return abierto_a_las(paquete["destinos_por_id"][c.id_destino], int(c.hora[:2]))


def _prediccion(c: Consulta, porcentaje: float, capacidad: int) -> Prediccion:
    porcentaje = round(float(np.clip(porcentaje, 0, 100)), 1)
    return Prediccion(
        id_destino=c.id_destino, fecha=c.fecha, hora=c.hora, estado="Abierto", porcentaje=porcentaje,
        nivel=config.nivel_desde_porcentaje(porcentaje), personas_estimadas=round(porcentaje / 100 * capacidad),
    )


def _cerrada(c: Consulta) -> Prediccion:
    return Prediccion(id_destino=c.id_destino, fecha=c.fecha, hora=c.hora, estado="Cerrado", porcentaje=0, nivel=None,
                      personas_estimadas=0)


def predecir(paquete: dict, consultas: list[Consulta]) -> list[Prediccion]:
    _destinos_conocidos(paquete, consultas)
    destinos = paquete["destinos_por_id"]
    resultados: list[Prediccion | None] = [None] * len(consultas)
    filas, posiciones = [], []
    for i, c in enumerate(consultas):
        if not _abierta(paquete, c):
            resultados[i] = _cerrada(c)
            continue
        clima = c.clima.model_dump() if c.clima else None
        filas.append(fila_para_prediccion(c.id_destino, c.fecha, int(c.hora[:2]), clima, paquete["destinos_df"]))
        posiciones.append(i)
    if filas:
        valores = paquete["pipeline"].predict(pd.concat(filas, ignore_index=True))
        for i, valor in zip(posiciones, valores):
            c = consultas[i]
            resultados[i] = _prediccion(c, valor, int(destinos[c.id_destino]["capacidad"]))
    return [r for r in resultados if r is not None]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
def health() -> dict:
    paquete = gestor.activo()
    if paquete is None:
        return {"estado": "sin_modelo", "modelo_cargado": False, "memoria_mb": memoria_mb(),
                "mensaje": "No hay modelo que se pueda cargar: ejecuta python entrenar_modelo.py --comparar."}
    return {"estado": "ok", "modelo_cargado": True, **origen_de(paquete), "ganador": gestor.ganador(),
            "metricas": paquete["metadatos"]["metricas"], "destinos": len(paquete["destinos"]), "memoria_mb": memoria_mb()}


@app.get("/modelo", dependencies=protegido)
def modelo() -> dict:
    """Los tres modelos con sus métricas y tamaño, el ganador, cuál está activo y el baseline."""
    indice = gestor.indice()
    activo = gestor.activo()
    if indice is None and activo is None:
        gestor.requerir()  # 503 con el mensaje de siempre
    comparacion = (indice or {}).get("comparacion", [])
    por_clave = {r["clave"]: r for r in comparacion}
    artefactos = (indice or {}).get("artefactos", {})
    modelos = []
    for clave in config.MODELOS:
        r = por_clave.get(clave, {})
        ruta = config.ruta_modelo(clave, gestor.directorio)
        existe = ruta.exists()
        modelos.append({
            "clave": clave,
            "nombre": config.NOMBRES_MODELO[clave],
            "mae": r.get("mae"), "rmse": r.get("rmse"), "r2": r.get("r2"), "rmse_sin_clima": r.get("rmse_sin_clima"),
            "tamano_mb": round(ruta.stat().st_size / 1e6, 2) if existe else artefactos.get(clave, {}).get("tamano_mb"),
            "memoria_mb": r.get("memoria_mb"), "ms_prediccion": r.get("ms_prediccion"),
            "hiperparametros": r.get("hiperparametros", {}),
            "ganador": clave == (indice or {}).get("modelo"),
            "activo": bool(activo and activo["clave"] == clave),
            "disponible": existe,
            "versionado": artefactos.get(clave, {}).get("versionado", existe),
            "reduccion": r.get("reduccion"),
        })
    base = por_clave.get("baseline")
    origen = (indice or activo["metadatos"])
    sintetico = bool(origen["datos_sinteticos"])
    return {
        "ganador": (indice or {}).get("modelo"),
        "activo": activo["clave"] if activo else None,
        "respaldo": bool(activo and activo["respaldo"]),
        "modelos": modelos,
        "baseline": {k: base.get(k) for k in ("clave", "nombre", "mae", "rmse", "r2")} if base else None,
        "seleccion": (indice or {}).get("seleccion"),
        "orden_respaldo": gestor.orden(),
        "origen_datos": config.ALIAS_DATASET.get(origen["origen_datos"], origen["origen_datos"]),
        "datos_sinteticos": sintetico,
        "mensaje_origen": MENSAJE_SINTETICO if sintetico else None,
        "fecha_comparacion": (indice or {}).get("fecha_comparacion"),
        "corte_validacion": origen.get("corte_validacion"),
        "listo_para_produccion": bool(origen.get("listo_para_produccion")),
        "advertencias": origen.get("advertencias", []),
        "memoria_mb": memoria_mb(),
    }


@app.post("/predict", response_model=RespuestaPrediccion, dependencies=protegido)
def predict(consulta: Consulta) -> RespuestaPrediccion:
    clave = validar_modelo(consulta.modelo)
    with gestor.usar(clave) as paquete:
        [prediccion] = predecir(paquete, [consulta])
        origen = origen_de(paquete)
    return RespuestaPrediccion(**prediccion.model_dump(), **origen)


@app.post("/predict/lote", response_model=RespuestaLote, dependencies=protegido)
def predict_lote(lote: Lote) -> RespuestaLote:
    clave = validar_modelo(lote.modelo)
    with gestor.usar(clave) as paquete:
        resultados = predecir(paquete, lote.consultas)
        origen = origen_de(paquete)
    return RespuestaLote(resultados=resultados, **origen)


def _comparar_uno(clave: str, consulta: Consulta) -> tuple[Prediccion | None, str | None]:
    """Predicción de un candidato (cargado bajo demanda si no es el activo)."""
    try:
        with gestor.usar(clave) as paquete:
            return predecir(paquete, [consulta])[0], None
    except HTTPException as e:
        if e.status_code == 404:
            raise
        return None, e.detail["mensaje"] if isinstance(e.detail, dict) else str(e.detail)


@app.post("/comparar", response_model=RespuestaComparar, dependencies=protegido)
def comparar(consulta: Consulta) -> RespuestaComparar:
    activo = gestor.requerir()
    _destinos_conocidos(activo, [consulta])
    abierta = _abierta(activo, consulta)
    capacidad = int(activo["destinos_por_id"][consulta.id_destino]["capacidad"])
    ganador = gestor.ganador()
    origen = origen_de(activo)
    resultados: list[ResultadoComparado] = []
    for clave in config.MODELOS:
        pred, error = _comparar_uno(clave, consulta)
        gc.collect()  # el candidato bajo demanda ya no tiene referencias
        resultados.append(ResultadoComparado(
            clave=clave, nombre=config.NOMBRES_MODELO[clave], ganador=clave == ganador, activo=clave == activo["clave"],
            disponible=pred is not None, porcentaje=pred.porcentaje if pred else None, nivel=pred.nivel if pred else None,
            personas_estimadas=pred.personas_estimadas if pred else None, error=error,
        ))
    tabla = leer_baseline(gestor.directorio)
    if tabla is None:
        base, error_base = None, "No hay baseline.json: ejecuta python entrenar_modelo.py --comparar."
    elif not abierta:
        base, error_base = _cerrada(consulta), None
    else:
        base, error_base = _prediccion(consulta, prediccion_baseline(tabla, consulta.id_destino, int(consulta.hora[:2])), capacidad), None
    resultados.append(ResultadoComparado(
        clave="baseline", nombre=config.NOMBRES_MODELO["baseline"], ganador=False, activo=False, disponible=base is not None,
        porcentaje=base.porcentaje if base else None, nivel=base.nivel if base else None,
        personas_estimadas=base.personas_estimadas if base else None, error=error_base,
    ))
    return RespuestaComparar(
        id_destino=consulta.id_destino, fecha=consulta.fecha, hora=consulta.hora,
        estado="Abierto" if abierta else "Cerrado", ganador=ganador, origen_modelo=origen["origen_modelo"],
        datos_sinteticos=origen["datos_sinteticos"], mensaje_origen=origen["mensaje_origen"], resultados=resultados,
    )
