/**
 * Temporadas turísticas de San Andrés.
 *
 * SUPUESTOS: son las temporadas altas habituales del turismo nacional en Colombia
 * (vacaciones escolares y de fin de año), no datos oficiales de la isla. Se pueden
 * ajustar aquí sin tocar el resto del código.
 */

export interface RangoTemporada {
  nombre: string;
  /** MM-DD, inclusive. */
  desde: string;
  /** MM-DD, inclusive. Si es menor que `desde`, el rango cruza el cambio de año. */
  hasta: string;
}

export const TEMPORADAS_ALTAS: readonly RangoTemporada[] = [
  { nombre: 'Fin y comienzo de año', desde: '12-15', hasta: '01-15' },
  { nombre: 'Vacaciones de mitad de año', desde: '06-15', hasta: '07-15' },
];

/** Semana Santa (de Domingo de Ramos a Domingo de Resurrección) también es temporada alta. */
export const SEMANA_SANTA_ES_TEMPORADA_ALTA = true;

/**
 * Receso escolar de octubre (también temporada alta): del sábado anterior a la semana de
 * receso hasta el lunes festivo del 12 de octubre, es decir, del festivo trasladado − 9 días
 * hasta ese lunes. Igual en ml/calendario.py.
 */
export const RECESO_OCTUBRE_ES_TEMPORADA_ALTA = true;

/** Días seguidos sin trabajo (fin de semana + festivos) a partir de los cuales hay "puente". */
export const DIAS_MINIMOS_PUENTE = 3;
