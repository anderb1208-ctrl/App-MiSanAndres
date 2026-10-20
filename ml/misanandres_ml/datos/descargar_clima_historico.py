"""
Descarga UNA VEZ el clima histórico REAL, hora por hora, de San Andrés desde la API de
archivo de Open-Meteo y lo guarda en datos/clima_historico_san_andres.csv (versionado),
para que generar_dataset_simulado.py funcione sin internet.

Uso:  python descargar_clima_historico.py [--desde 2024-10-01] [--hasta 2026-10-18]

Fuente: https://open-meteo.com/en/docs/historical-weather-api (reanálisis ERA5 / ERA5-Land
y modelos de Open-Meteo). Licencia de los datos: CC BY 4.0, con atribución "Weather data
by Open-Meteo.com". El uso gratuito de la API es solo para fines no comerciales.
"""
from __future__ import annotations

import argparse
import io
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import requests

import config

URL_ARCHIVO = "https://archive-api.open-meteo.com/v1/archive"
# Centro de la isla de San Andrés (la API devuelve la celda de la grilla más cercana).
LATITUD, LONGITUD = 12.5847, -81.7006
ENCABEZADO = (
    "# Clima histórico REAL, hora por hora, de San Andrés (hora de Colombia). "
    "Fuente: Open-Meteo Historical Weather API ({url}), celda lat {lat}, lon {lon}, consultado el {consulta}. "
    "Licencia CC BY 4.0: Weather data by Open-Meteo.com"
)


def descargar(desde: date, hasta: date) -> tuple[pd.DataFrame, tuple[float, float]]:
    parametros = {
        "latitude": LATITUD,
        "longitude": LONGITUD,
        "start_date": desde.isoformat(),
        "end_date": hasta.isoformat(),
        "hourly": "temperature_2m,precipitation,wind_speed_10m",
        "timezone": config.ZONA_HORARIA,
        "wind_speed_unit": "kmh",
        "format": "csv",
    }
    respuesta = requests.get(URL_ARCHIVO, params=parametros, timeout=60)
    respuesta.raise_for_status()
    texto = respuesta.text
    # El CSV trae primero la ubicación (2 líneas), una línea vacía y después los datos.
    ubicacion = pd.read_csv(io.StringIO(texto), nrows=1)
    datos = pd.read_csv(io.StringIO(texto), skiprows=3)
    datos.columns = ["fecha_hora", *config.COLUMNAS_CLIMA]
    return datos, (float(ubicacion["latitude"][0]), float(ubicacion["longitude"][0]))


def guardar(datos: pd.DataFrame, celda: tuple[float, float], ruta: Path = config.CLIMA_HISTORICO_CSV) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        archivo.write(ENCABEZADO.format(url=URL_ARCHIVO, lat=celda[0], lon=celda[1], consulta=date.today().isoformat()) + "\n")
        datos.to_csv(archivo, index=False, lineterminator="\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Descarga el clima histórico real de San Andrés (Open-Meteo).")
    parser.add_argument("--desde", type=date.fromisoformat, default=date(2024, 10, 1))
    parser.add_argument("--hasta", type=date.fromisoformat, default=date.today())
    args = parser.parse_args(argv)
    datos, celda = descargar(args.desde, args.hasta)
    guardar(datos, celda)
    print(f"✔ Clima real: {len(datos):,} horas, {datos['fecha_hora'].iloc[0]} a {datos['fecha_hora'].iloc[-1]} "
          f"→ {config.CLIMA_HISTORICO_CSV}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
