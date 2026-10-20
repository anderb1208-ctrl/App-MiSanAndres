"""
Carga un archivo de ocupación REAL y lo deja listo para entrenar.

Uso:
    python cargar_datos_reales.py [--archivo datos/real/mi_archivo.csv] [--subir-a-supabase]

Pasos:
  1. Toma el archivo CSV de ml/datos/real/ (si hay uno solo no hace falta --archivo).
  2. Revisa que no queden filas de EJEMPLO de la plantilla y que estén las columnas
     obligatorias: fecha_hora, id_destino y cantidad_personas.
  3. Normaliza al formato del modelo: fecha_hora en hora de Colombia, y calcula las
     columnas que vengan vacías (hora, día, festivo, puente, temporada a partir de la
     fecha; porcentaje a partir de las personas y la capacidad del destino).
  4. Valida con validar_dataset.py (si hay errores, se detiene y los explica).
  5. Muestra un resumen (filas, rango de fechas, cobertura por destino, vacíos) y guarda
     ml/datos/procesado_real/dataset_ocupacion_san_andres.csv.
  6. Con --subir-a-supabase, inserta las filas en la tabla ocupacion con origen = 'real'
     (pide confirmación; necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en ml/.env y la
     migración ocupacion_origen aplicada). Si ya existe una fila del mismo destino y hora,
     la reemplaza por la real.

Después: python entrenar_modelo.py --dataset real
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import requests

import calendario
import config
from comun import a_fecha_hora_local, leer_dataset, leer_destinos
from validar_dataset import Reporte, buscar_filas_ejemplo, validar

TAMANO_LOTE = 500


class ErrorCarga(Exception):
    pass


def elegir_archivo(argumento: Path | None, carpeta: Path = config.DIR_REAL_ENTRADA) -> Path:
    if argumento:
        return argumento
    archivos = sorted(p for p in carpeta.glob("*.csv"))
    if not archivos:
        raise ErrorCarga(f"No hay ningún archivo .csv en {carpeta}. Copia ahí el archivo real (ver datos/LEEME_DATOS.md).")
    if len(archivos) > 1:
        raise ErrorCarga(f"Hay {len(archivos)} archivos en {carpeta}; indica cuál con --archivo: {[a.name for a in archivos]}")
    return archivos[0]


def _vacio(serie: pd.Series) -> pd.Series:
    return serie.isna() | (serie.astype("string").str.strip() == "")


def normalizar(datos: pd.DataFrame, destinos: pd.DataFrame) -> pd.DataFrame:
    """Formato del modelo: rellena lo derivable y conserva lo que trae el archivo para validarlo."""
    ejemplo = buscar_filas_ejemplo(datos)
    if ejemplo.any():
        raise ErrorCarga(
            f"El archivo tiene {int(ejemplo.sum())} fila(s) de EJEMPLO de la plantilla: bórralas y deja solo datos reales."
        )
    faltan = [c for c in config.COLUMNAS_OBLIGATORIAS_REAL if c not in datos.columns]
    if faltan:
        raise ErrorCarga(f"Faltan columnas obligatorias: {', '.join(faltan)}. Usa los encabezados de la plantilla.")

    df = datos.copy()
    for col in config.COLUMNAS_DATASET:
        if col not in df.columns:
            df[col] = pd.NA
    fecha_hora = a_fecha_hora_local(df["fecha_hora"])
    validas = fecha_hora.notna()
    df.loc[validas, "fecha_hora"] = fecha_hora[validas].dt.strftime("%Y-%m-%dT%H:%M:%S%z").str.replace(
        r"(\d{2})(\d{2})$", r"\1:\2", regex=True
    )

    # Calendario: solo se rellena lo vacío (lo que venga se valida contra el calendario).
    fechas = fecha_hora[validas].dt.date
    por_dia = {f: calendario.info_del_dia(f) for f in fechas.unique()}
    for col in ("dia_semana", "es_fin_de_semana", "es_festivo", "es_puente", "temporada"):
        df[col] = df[col].astype("object")
        vacios = _vacio(df[col]) & validas
        df.loc[vacios, col] = [por_dia[f][col] for f in fecha_hora[vacios].dt.date]
    df["hora"] = df["hora"].astype("object")
    vacios = _vacio(df["hora"]) & validas
    df.loc[vacios, "hora"] = fecha_hora[vacios].dt.hour

    # Porcentaje desde personas y capacidad cuando falta.
    capacidad = pd.to_numeric(df["id_destino"], errors="coerce").map(destinos.set_index("id_destino")["capacidad"])
    personas = pd.to_numeric(df["cantidad_personas"], errors="coerce")
    df["porcentaje_ocupacion"] = df["porcentaje_ocupacion"].astype("object")
    vacios = _vacio(df["porcentaje_ocupacion"]) & personas.notna() & capacidad.notna()
    df.loc[vacios, "porcentaje_ocupacion"] = np.round(personas[vacios] / capacidad[vacios] * 100, 2)
    return df[config.COLUMNAS_DATASET]


def resumen(df: pd.DataFrame, reporte: Reporte) -> str:
    vacios = {c: int(_vacio(df[c]).sum()) for c in config.COLUMNAS_DATASET if _vacio(df[c]).any()}
    lineas = [reporte.texto(), "", "Valores vacíos por columna:" if vacios else "Sin valores vacíos."]
    lineas += [f"  {c}: {n:,}" for c, n in vacios.items()]
    return "\n".join(lineas)


def procesar(ruta: Path, destinos: pd.DataFrame, salida: Path | None = None) -> tuple[pd.DataFrame, Reporte]:
    """Normaliza y valida; si es válido lo guarda en `salida`. Lanza ErrorCarga si no se puede usar."""
    df = normalizar(leer_dataset(ruta), destinos)
    reporte = validar(df, destinos)
    if not reporte.ok:
        raise ErrorCarga(reporte.texto())
    if salida is not None:
        salida.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(salida, index=False, lineterminator="\n")
    return df, reporte


def subir_a_supabase(df: pd.DataFrame, url: str, clave: str) -> int:
    filas = [
        {
            "id_destino": int(f.id_destino),
            "fecha_hora": f.fecha_hora,
            "cantidad_personas": int(float(f.cantidad_personas)),
            "porcentaje_ocupacion": round(float(f.porcentaje_ocupacion), 2),
            "origen": "real",
        }
        for f in df.itertuples(index=False)
    ]
    cabeceras = {
        "apikey": clave,
        "Authorization": f"Bearer {clave}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    for inicio in range(0, len(filas), TAMANO_LOTE):
        lote = filas[inicio : inicio + TAMANO_LOTE]
        r = requests.post(
            f"{url.rstrip('/')}/rest/v1/ocupacion",
            params={"on_conflict": "id_destino,fecha_hora"},
            json=lote,
            headers=cabeceras,
            timeout=60,
        )
        if r.status_code >= 300:
            pista = " ¿Aplicaste la migración ocupacion_origen?" if "origen" in r.text else ""
            raise ErrorCarga(f"Supabase respondió {r.status_code}: {r.text[:300]}{pista}")
        print(f"  {min(inicio + TAMANO_LOTE, len(filas)):,} / {len(filas):,} filas")
    return len(filas)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Carga y valida el archivo de ocupación real.")
    parser.add_argument("--archivo", type=Path, help="CSV real (por defecto, el único de datos/real/).")
    parser.add_argument("--subir-a-supabase", action="store_true", help="Inserta las filas en la tabla ocupacion como reales.")
    args = parser.parse_args(argv)
    try:
        ruta = elegir_archivo(args.archivo)
        print(f"Archivo: {ruta}")
        salida = config.RUTAS_DATASET["real"]
        df, reporte = procesar(ruta, leer_destinos(), salida)
        print(resumen(df, reporte))
        print(f"\n✔ Guardado en {salida}. Para entrenar: python entrenar_modelo.py --dataset real")

        if args.subir_a_supabase:
            url, clave = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            if not url or not clave:
                raise ErrorCarga("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en ml/.env para escribir en la base.")
            respuesta = input(f"\n¿Insertar {len(df):,} filas REALES en la tabla ocupacion de {url}? Escribe SI para continuar: ")
            if respuesta.strip().upper() != "SI":
                print("Cancelado: no se escribió nada en la base.")
                return 0
            print(f"✔ {subir_a_supabase(df, url, clave):,} filas insertadas como reales.")
        return 0
    except ErrorCarga as error:
        print(f"\n✘ {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
