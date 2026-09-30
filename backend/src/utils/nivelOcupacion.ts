import type { NivelOcupacion } from '../models/database.types';

/**
 * Rangos de nivel de ocupación (único lugar donde se definen):
 * Bajo < 40 %, Medio 40–70 %, Alto > 70 %.
 */
export const LIMITE_BAJO = 40;
export const LIMITE_ALTO = 70;

export const NIVELES: readonly NivelOcupacion[] = ['Bajo', 'Medio', 'Alto'];

export function nivelDesdePorcentaje(porcentaje: number): NivelOcupacion {
  if (porcentaje < LIMITE_BAJO) return 'Bajo';
  if (porcentaje <= LIMITE_ALTO) return 'Medio';
  return 'Alto';
}

/** Adjetivo concordado con "ocupación": "ocupación baja/media/alta". */
export const ADJETIVO_OCUPACION: Record<NivelOcupacion, string> = {
  Bajo: 'baja',
  Medio: 'media',
  Alto: 'alta',
};

/** Distancia entre niveles: 0 iguales, 1 adyacentes, 2 opuestos. */
export function distanciaNiveles(a: NivelOcupacion, b: NivelOcupacion): number {
  return Math.abs(NIVELES.indexOf(a) - NIVELES.indexOf(b));
}
