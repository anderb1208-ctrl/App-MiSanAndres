"""
Exporta los destinos de Supabase a ml/datos/destinos.csv
(id, nombre, capacidad, categoría, horario de apertura y cierre, estado).

Uso:  python -m misanandres_ml.datos.exportar_destinos

Lee SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY del entorno o de ml/.env (solo lectura:
la tabla destino es pública por RLS). Si no hay credenciales o Supabase no responde,
copia el respaldo versionado datos/destinos_respaldo.csv (instantánea de los 30
destinos del 15 de octubre de 2026) y lo avisa.
"""
from __future__ import annotations

import os
import shutil
import sys

import pandas as pd
import requests

from misanandres_ml import config
from misanandres_ml.comun import COLUMNAS_DESTINO

CAMPOS = "id_destino,nombre,capacidad,categoria,horario_apertura,horario_cierre,estado"


def descargar_destinos(url: str, clave: str) -> pd.DataFrame:
    respuesta = requests.get(
        f"{url.rstrip('/')}/rest/v1/destino",
        params={"select": CAMPOS, "order": "id_destino"},
        headers={"apikey": clave, "Authorization": f"Bearer {clave}"},
        timeout=20,
    )
    respuesta.raise_for_status()
    destinos = pd.DataFrame(respuesta.json())
    if destinos.empty:
        raise RuntimeError("Supabase no devolvió destinos.")
    for col in ("horario_apertura", "horario_cierre"):
        destinos[col] = destinos[col].map(lambda v: str(v)[:5] if v else "")
    return destinos[COLUMNAS_DESTINO + ["estado"]]


def main() -> int:
    url = os.getenv("SUPABASE_URL")
    clave = os.getenv("SUPABASE_PUBLISHABLE_KEY")
    config.DIR_DATOS.mkdir(parents=True, exist_ok=True)
    if url and clave:
        try:
            destinos = descargar_destinos(url, clave)
            destinos.to_csv(config.DESTINOS_CSV, index=False)
            print(f"✔ {len(destinos)} destinos exportados de Supabase a {config.DESTINOS_CSV}")
            return 0
        except Exception as error:  # noqa: BLE001 — cualquier fallo de red cae al respaldo
            print(f"⚠ No se pudieron leer los destinos de Supabase ({error}).")
    else:
        print("⚠ Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY (entorno o ml/.env).")
    shutil.copyfile(config.DESTINOS_RESPALDO_CSV, config.DESTINOS_CSV)
    print(f"  Se usó el respaldo {config.DESTINOS_RESPALDO_CSV.name} → {config.DESTINOS_CSV}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
