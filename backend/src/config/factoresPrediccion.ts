/**
 * Factores multiplicativos que ajustan el promedio histórico de ocupación.
 * Es el único lugar donde viven: cambiar un valor aquí cambia la predicción
 * (y la explicación "factores" de la respuesta) sin tocar el resto del código.
 *
 * Son supuestos razonables para el prototipo, no valores medidos. Cuando exista
 * el modelo de ML, los aprenderá de `ocupacion` + `clima_hora`.
 */
import type { CategoriaDestino } from '../models/database.types';

/** Base: histórico del mismo día de la semana si tiene al menos estas muestras; si no, el del tipo de día. */
export const MUESTRAS_MINIMAS_DIA_SEMANA = 3;

/** Se considera "lluvia probable" desde cualquiera de estos umbrales. */
export const UMBRAL_LLUVIA = {
  /** Probabilidad de precipitación, %. */
  probLluvia: 60,
  /** Precipitación prevista en la hora, mm. */
  precipitacionMm: 0.5,
};

/** Códigos WMO de tormenta (95: tormenta; 96 y 99: tormenta con granizo). */
export const CODIGOS_TORMENTA: readonly number[] = [95, 96, 99];

/** Lluvia probable: menos gente al aire libre y algo más bajo techo. */
export const FACTOR_LLUVIA: Record<CategoriaDestino, number> = {
  playa: 0.8,
  cayo: 0.75,
  actividad: 0.85,
  buceo_snorkel: 0.85,
  naturaleza: 0.9,
  gastronomia: 1.1,
  cultura: 1.1,
};

/** Tormenta: reemplaza al factor de lluvia. Las lanchas a los cayos suelen suspenderse. */
export const FACTOR_TORMENTA: Record<CategoriaDestino, number> = {
  playa: 0.65,
  cayo: 0.5,
  actividad: 0.7,
  buceo_snorkel: 0.7,
  naturaleza: 0.8,
  gastronomia: 1.1,
  cultura: 1.1,
};

/** Festivo: la base suele ser la de un día laboral, así que lo acerca a un fin de semana. */
export const FACTOR_FESTIVO = 1.25;

/** Sábado o domingo de un puente festivo (el lunes festivo ya lleva FACTOR_FESTIVO). */
export const FACTOR_PUENTE = 1.1;

/** Temporada alta (fechas en config/calendario.ts). */
export const FACTOR_TEMPORADA_ALTA = 1.2;
