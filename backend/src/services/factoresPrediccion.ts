/**
 * Convierte las features de una predicción en factores multiplicativos con su
 * explicación ("Lluvia probable: -20 %"). Los valores salen de config/factoresPrediccion.ts.
 */
import {
  CODIGOS_TORMENTA,
  FACTOR_FESTIVO,
  FACTOR_LLUVIA,
  FACTOR_PUENTE,
  FACTOR_TEMPORADA_ALTA,
  FACTOR_TORMENTA,
  UMBRAL_LLUVIA,
} from '../config/factoresPrediccion';
import type { CategoriaDestino } from '../models/database.types';
import type { InfoCalendario } from './calendarioService';
import type { ClimaFeatures, FeaturesPrediccion } from './featuresPrediccion';

export type CodigoFactor = 'tormenta' | 'lluvia' | 'festivo' | 'puente' | 'temporada_alta';

export interface Factor {
  codigo: CodigoFactor;
  /** Multiplicador aplicado al porcentaje (0,8 = −20 %). */
  multiplicador: number;
  /** Efecto en %, redondeado (−20, +25). */
  efecto: number;
  /** "Lluvia probable: -20 %" */
  texto: string;
  /** Contexto del factor ("70 % de probabilidad de lluvia", "Día de la Raza"). */
  detalle: string | null;
}

export const esTormenta = (c: ClimaFeatures) => c.codigoClima !== null && CODIGOS_TORMENTA.includes(c.codigoClima);

export const esLluviaProbable = (c: ClimaFeatures) =>
  (c.probLluvia ?? 0) >= UMBRAL_LLUVIA.probLluvia || (c.precipitacion ?? 0) >= UMBRAL_LLUVIA.precipitacionMm;

function factor(codigo: CodigoFactor, etiqueta: string, multiplicador: number, detalle: string | null): Factor {
  const efecto = Math.round((multiplicador - 1) * 100);
  return { codigo, multiplicador, efecto, texto: `${etiqueta}: ${efecto > 0 ? '+' : ''}${efecto} %`, detalle };
}

function detalleLluvia(c: ClimaFeatures): string | null {
  const partes = [
    c.probLluvia !== null ? `${Math.round(c.probLluvia)} % de probabilidad` : null,
    c.precipitacion ? `${c.precipitacion} mm` : null,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(', ') : null;
}

/** Factores que aplican a un destino de esa categoría, en el orden en que se explican. */
export function calcularFactores(
  categoria: CategoriaDestino,
  features: FeaturesPrediccion,
  calendario: InfoCalendario,
): Factor[] {
  const factores: Factor[] = [];
  const clima = features.clima;

  if (clima && esTormenta(clima)) {
    factores.push(factor('tormenta', 'Tormenta', FACTOR_TORMENTA[categoria], detalleLluvia(clima)));
  } else if (clima && esLluviaProbable(clima)) {
    factores.push(factor('lluvia', 'Lluvia probable', FACTOR_LLUVIA[categoria], detalleLluvia(clima)));
  }

  if (features.esFestivo) {
    factores.push(factor('festivo', 'Festivo', FACTOR_FESTIVO, calendario.nombreFestivo));
  } else if (features.esPuente) {
    factores.push(factor('puente', 'Puente festivo', FACTOR_PUENTE, 'Fin de semana largo'));
  }

  if (features.temporada === 'alta') {
    factores.push(factor('temporada_alta', 'Temporada alta', FACTOR_TEMPORADA_ALTA, calendario.motivoTemporada));
  }

  // Un multiplicador de 1 no cambia nada: no se muestra.
  return factores.filter((f) => f.multiplicador !== 1);
}

/** Aplica los factores y limita el resultado entre 0 y 100. */
export function aplicarFactores(porcentajeBase: number, factores: Factor[]): number {
  const ajustado = factores.reduce((p, f) => p * f.multiplicador, porcentajeBase);
  return Math.min(100, Math.max(0, ajustado));
}
