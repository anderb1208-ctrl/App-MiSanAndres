/**
 * Variables de entrada de la predicción de ocupación.
 *
 * Es la definición única: el cálculo actual (promedio histórico + factores) las usa,
 * y el futuro modelo de ML (Random Forest, POST /predict) recibirá exactamente estas.
 * Para entrenar, salen de `ocupacion.fecha_hora` (calendario) y de `clima_hora` (clima).
 */
import { infoDelDia, type InfoCalendario, type Temporada } from './calendarioService';
import type { ClimaHora } from './clima/tipos';
import { horaEntera } from '../utils/fecha';

export interface ClimaFeatures {
  /** °C */
  temperatura: number | null;
  /** Probabilidad de precipitación, %. */
  probLluvia: number | null;
  /** mm en la hora. */
  precipitacion: number | null;
  /** Código WMO. */
  codigoClima: number | null;
  /** km/h */
  viento: number | null;
}

export interface FeaturesPrediccion {
  /** Hora del día, 0–23 (Colombia). */
  hora: number;
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  esFinDeSemana: boolean;
  esFestivo: boolean;
  esPuente: boolean;
  temporada: Temporada;
  /** null si no hay clima para esa fecha y hora. */
  clima: ClimaFeatures | null;
}

export function aClimaFeatures(clima: ClimaHora): ClimaFeatures {
  const { temperatura, probLluvia, precipitacion, codigoClima, viento } = clima;
  return { temperatura, probLluvia, precipitacion, codigoClima, viento };
}

/** Features de una fecha y hora; también devuelve el calendario para explicar los factores. */
export function construirFeatures(
  fecha: string,
  hora: string,
  clima: ClimaHora | null,
): { features: FeaturesPrediccion; calendario: InfoCalendario } {
  const calendario = infoDelDia(fecha);
  return {
    calendario,
    features: {
      hora: horaEntera(hora),
      diaSemana: calendario.diaSemana,
      esFinDeSemana: calendario.esFinDeSemana,
      esFestivo: calendario.esFestivo,
      esPuente: calendario.esPuente,
      temporada: calendario.temporada,
      clima: clima ? aClimaFeatures(clima) : null,
    },
  };
}
