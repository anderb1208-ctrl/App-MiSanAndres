"""
Lanzador de la comparación y el entrenamiento de modelos (el código está en
misanandres_ml/modelos/comparar.py). Se conserva en la raíz de ml/ para que los comandos
documentados sigan funcionando:

    python entrenar_modelo.py --comparar    entrena los tres modelos, elige al ganador y
                                            regenera artefactos/ y reportes/
    python entrenar_modelo.py               reentrena solo al ganador (rápido, sin búsqueda)
"""
import sys

from misanandres_ml.modelos.comparar import main

if __name__ == "__main__":
    sys.exit(main())
