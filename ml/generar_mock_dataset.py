"""
Alias de generar_dataset_simulado.py (nombre anterior, se conserva para no romper
comandos ni scripts existentes). Ver ese archivo.

Uso:  python generar_mock_dataset.py [--desde 2024-10-01] [--hasta 2026-10-18] [--semilla 42]
"""
from __future__ import annotations

import sys

from generar_dataset_simulado import AVISO, COLUMNAS_SALIDA, generar, guardar, main  # noqa: F401

if __name__ == "__main__":
    sys.exit(main())
