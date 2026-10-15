"""
Valida un dataset de ocupación (simulado o real) antes de entrenar.

Uso:  python validar_dataset.py [--dataset mock|real] [--archivo ruta.csv]

Revisa: columnas, vacíos, rangos (porcentaje 0–100, personas ≥ 0 y ≤ capacidad),
coherencia con el calendario (hora, día, festivo, puente, temporada), duplicados,
horas fuera del horario del destino, destinos desconocidos, filas de ejemplo de la
plantilla y cobertura por destino. Imprime un reporte y termina con código 1 si hay
errores (las advertencias no hacen fallar).
"""
from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

import calendario
import config
from comun import a_fecha_hora_local, horas_abiertas, leer_dataset, leer_destinos

MAX_EJEMPLOS = 5
VERDADEROS = {"true", "1", "si", "sí", "verdadero", "t", "s", "yes"}
FALSOS = {"false", "0", "no", "falso", "f", "n"}
RANGOS_CLIMA = {"temperatura": (15, 40), "precipitacion": (0, 200), "viento": (0, 150)}


@dataclass
class Reporte:
    errores: list[str] = field(default_factory=list)
    advertencias: list[str] = field(default_factory=list)
    resumen: dict = field(default_factory=dict)
    cobertura: pd.DataFrame | None = None

    @property
    def ok(self) -> bool:
        return not self.errores

    def texto(self) -> str:
        lineas = ["", "Validación del dataset", "=" * 60]
        for clave, valor in self.resumen.items():
            lineas.append(f"  {clave}: {valor}")
        if self.cobertura is not None and not self.cobertura.empty:
            lineas += ["", "Cobertura por destino:", self.cobertura.to_string(index=False)]
        if self.advertencias:
            lineas += ["", f"Advertencias ({len(self.advertencias)}):"] + [f"  ⚠ {a}" for a in self.advertencias]
        if self.errores:
            lineas += ["", f"ERRORES ({len(self.errores)}):"] + [f"  ✘ {e}" for e in self.errores]
        lineas += ["", "✔ Dataset válido." if self.ok else "✘ El dataset NO es válido: corrige los errores y vuelve a validar."]
        return "\n".join(lineas)


def _filas(mascara: pd.Series) -> str:
    """Números de fila del CSV (la fila 1 es el encabezado) de los primeros casos."""
    indices = list(mascara[mascara].index[:MAX_EJEMPLOS])
    texto = ", ".join(str(i + 2) for i in indices)
    resto = int(mascara.sum()) - len(indices)
    return texto + (f" y {resto} más" if resto > 0 else "")


def a_booleano(serie: pd.Series) -> pd.Series:
    """Convierte true/false, 1/0, sí/no… a booleano; lo que no se entienda queda como NA."""
    texto = serie.astype("string").str.strip().str.lower()
    return texto.map(lambda v: True if v in VERDADEROS else False if v in FALSOS else pd.NA)


def buscar_filas_ejemplo(datos: pd.DataFrame) -> pd.Series:
    texto = datos.astype("string").apply(lambda col: col.str.contains(config.MARCA_EJEMPLO, case=False, na=False))
    return texto.any(axis=1)


def validar(datos: pd.DataFrame, destinos: pd.DataFrame) -> Reporte:
    r = Reporte()
    r.resumen["Filas"] = f"{len(datos):,}"
    if datos.empty:
        r.errores.append("El archivo no tiene filas.")
        return r

    ejemplo = buscar_filas_ejemplo(datos)
    if ejemplo.any():
        r.errores.append(
            f"Hay filas de EJEMPLO de la plantilla (filas {_filas(ejemplo)}): bórralas y deja solo datos reales."
        )

    faltan = [c for c in config.COLUMNAS_DATASET if c not in datos.columns]
    sobran = [c for c in datos.columns if c not in config.COLUMNAS_DATASET]
    if faltan:
        r.errores.append(f"Faltan columnas: {', '.join(faltan)}.")
        return r
    if sobran:
        r.advertencias.append(f"Columnas que no se usan (se ignoran): {', '.join(sobran)}.")

    # Vacíos: el clima puede faltar (el modelo lo imputa); lo demás es obligatorio.
    for col in config.COLUMNAS_DATASET:
        vacios = datos[col].isna() | (datos[col].astype("string").str.strip() == "")
        if not vacios.any():
            continue
        if col in config.COLUMNAS_CLIMA:
            r.advertencias.append(f"{col}: {int(vacios.sum()):,} valores vacíos (se rellenan al entrenar).")
        else:
            r.errores.append(f"{col}: {int(vacios.sum()):,} valores vacíos (filas {_filas(vacios)}).")

    fecha_hora = a_fecha_hora_local(datos["fecha_hora"])
    fecha_invalida = fecha_hora.isna() & datos["fecha_hora"].notna()
    if fecha_invalida.any():
        r.errores.append(f"fecha_hora con formato inválido (filas {_filas(fecha_invalida)}). Usa AAAA-MM-DD HH:MM.")

    numericas = {c: pd.to_numeric(datos[c], errors="coerce") for c in
                 ["id_destino", "hora", "dia_semana", "cantidad_personas", "porcentaje_ocupacion", *config.COLUMNAS_CLIMA]}
    for col, valores in numericas.items():
        no_numero = valores.isna() & datos[col].notna() & (datos[col].astype("string").str.strip() != "")
        if no_numero.any():
            r.errores.append(f"{col} debe ser un número (filas {_filas(no_numero)}).")

    # Destinos
    capacidades = destinos.set_index("id_destino")["capacidad"]
    id_destino = numericas["id_destino"]
    desconocidos = id_destino.notna() & ~id_destino.isin(capacidades.index)
    if desconocidos.any():
        ids = sorted(id_destino[desconocidos].astype(int).unique().tolist())[:10]
        r.errores.append(f"id_destino que no existe en destinos.csv: {ids} (filas {_filas(desconocidos)}).")

    # Rangos
    pct, personas = numericas["porcentaje_ocupacion"], numericas["cantidad_personas"]
    fuera = (pct < 0) | (pct > 100)
    if fuera.any():
        r.errores.append(f"porcentaje_ocupacion fuera de 0–100 (filas {_filas(fuera)}).")
    negativas = personas < 0
    if negativas.any():
        r.errores.append(f"cantidad_personas negativa (filas {_filas(negativas)}).")
    no_entero = personas.notna() & (personas % 1 != 0)
    if no_entero.any():
        r.errores.append(f"cantidad_personas debe ser un número entero (filas {_filas(no_entero)}).")
    capacidad = id_destino.map(capacidades)
    sobrecupo = personas > capacidad
    if sobrecupo.any():
        r.errores.append(f"cantidad_personas supera la capacidad del destino (filas {_filas(sobrecupo)}).")
    esperado = personas / capacidad * 100
    diferencia = (pct - esperado).abs()
    if (diferencia > 5).any():
        r.errores.append(
            f"porcentaje_ocupacion no corresponde a cantidad_personas / capacidad (diferencia > 5 puntos; filas {_filas(diferencia > 5)})."
        )
    elif (diferencia > 1.5).any():
        r.advertencias.append(f"porcentaje_ocupacion difiere más de 1,5 puntos de personas / capacidad (filas {_filas(diferencia > 1.5)}).")
    for col, (minimo, maximo) in RANGOS_CLIMA.items():
        raro = (numericas[col] < minimo) | (numericas[col] > maximo)
        if raro.any():
            r.advertencias.append(f"{col} fuera del rango esperado {minimo}–{maximo} (filas {_filas(raro)}).")

    # Coherencia con el calendario (mismas reglas que el backend)
    validas = fecha_hora.notna()
    if validas.any():
        fechas = fecha_hora[validas].dt.date
        por_dia = {f: calendario.info_del_dia(f) for f in fechas.unique()}
        info = pd.DataFrame([por_dia[f] for f in fechas], index=fechas.index)
        comparaciones = {
            "hora": (numericas["hora"][validas], fecha_hora[validas].dt.hour),
            "dia_semana": (numericas["dia_semana"][validas], info["dia_semana"]),
            "es_fin_de_semana": (a_booleano(datos["es_fin_de_semana"][validas]), info["es_fin_de_semana"]),
            "es_festivo": (a_booleano(datos["es_festivo"][validas]), info["es_festivo"]),
            "es_puente": (a_booleano(datos["es_puente"][validas]), info["es_puente"]),
            "temporada": (datos["temporada"][validas].astype("string").str.strip().str.lower(), info["temporada"]),
        }
        for col, (dado, calculado) in comparaciones.items():
            distinto = dado.notna() & (dado.astype(str) != calculado.astype(str))
            distinto = distinto.reindex(datos.index, fill_value=False)
            if distinto.any():
                r.errores.append(f"{col} no coincide con fecha_hora según el calendario de Colombia (filas {_filas(distinto)}).")
        for col in ("es_fin_de_semana", "es_festivo", "es_puente"):
            raro = datos[col].notna() & a_booleano(datos[col]).isna()
            if raro.any():
                r.errores.append(f"{col} debe ser verdadero/falso (filas {_filas(raro)}).")

        # Duplicados y horario
        claves = pd.DataFrame({"id": id_destino, "fh": fecha_hora})
        duplicado = claves.duplicated(keep="first") & validas
        if duplicado.any():
            r.errores.append(f"Filas repetidas para el mismo destino y fecha_hora (filas {_filas(duplicado)}).")
        horario = destinos.set_index("id_destino")[["horario_apertura", "horario_cierre"]]
        abiertas = {int(i): set(horas_abiertas(a, c)) for i, (a, c) in horario.iterrows()}
        fuera_horario = pd.Series(
            [
                bool(pd.notna(i) and pd.notna(fh) and int(i) in abiertas and fh.hour not in abiertas[int(i)])
                for i, fh in zip(id_destino, fecha_hora)
            ],
            index=datos.index,
        )
        if fuera_horario.any():
            r.errores.append(f"Horas fuera del horario de atención del destino (filas {_filas(fuera_horario)}).")

        r.resumen["Desde"] = str(fecha_hora.min())
        r.resumen["Hasta"] = str(fecha_hora.max())
        r.cobertura = cobertura_por_destino(claves.dropna(), destinos)
        sin_datos = destinos.loc[~destinos["id_destino"].isin(r.cobertura["id_destino"]), "nombre"].tolist()
        if sin_datos:
            r.advertencias.append(f"{len(sin_datos)} destinos sin datos: {', '.join(sin_datos[:8])}{'…' if len(sin_datos) > 8 else ''}.")
    r.resumen["Destinos con datos"] = f"{id_destino[~desconocidos].nunique()} de {len(destinos)}"
    return r


def cobertura_por_destino(claves: pd.DataFrame, destinos: pd.DataFrame) -> pd.DataFrame:
    """Filas, rango de fechas y semanas cubiertas por destino."""
    if claves.empty:
        return pd.DataFrame(columns=["id_destino", "nombre", "filas", "desde", "hasta", "semanas"])
    g = claves.assign(id=claves["id"].astype(int)).groupby("id")["fh"]
    tabla = pd.DataFrame({"filas": g.size(), "desde": g.min().dt.date, "hasta": g.max().dt.date})
    tabla["semanas"] = ((g.max() - g.min()).dt.days / 7).round(1)
    tabla = tabla.reset_index().rename(columns={"id": "id_destino"})
    return tabla.merge(destinos[["id_destino", "nombre"]], on="id_destino", how="left")[
        ["id_destino", "nombre", "filas", "desde", "hasta", "semanas"]
    ]


def validar_archivo(ruta: Path, destinos: pd.DataFrame | None = None) -> Reporte:
    return validar(leer_dataset(ruta), destinos if destinos is not None else leer_destinos())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida un dataset de ocupación.")
    config.agregar_argumento_dataset(parser)
    parser.add_argument("--archivo", type=Path, help="CSV a validar (por defecto, el del dataset activo).")
    args = parser.parse_args(argv)
    ruta = args.archivo or config.ruta_dataset(config.dataset_activo(args.dataset))
    print(f"Archivo: {ruta}")
    reporte = validar_archivo(ruta)
    print(reporte.texto())
    return 0 if reporte.ok else 1


if __name__ == "__main__":
    sys.exit(main())
