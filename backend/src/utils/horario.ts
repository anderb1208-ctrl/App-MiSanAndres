/**
 * Horario de atención de un destino, en hora de Colombia.
 * La base guarda `time` ("09:00:00"); la API lo expone como HH:MM.
 */

export interface Horario {
  /** HH:MM */
  apertura: string;
  /** HH:MM, exclusivo. */
  cierre: string;
}

export interface ConHorario {
  horario_apertura?: string | null;
  horario_cierre?: string | null;
}

/** "09:00:00" → "09:00". */
export const aHoraMinuto = (valor: string) => valor.slice(0, 5);

/** Horario en HH:MM, o null si el destino no tiene horario (siempre accesible). */
export function horarioDe(destino: ConHorario): Horario | null {
  if (!destino.horario_apertura || !destino.horario_cierre) return null;
  return { apertura: aHoraMinuto(destino.horario_apertura), cierre: aHoraMinuto(destino.horario_cierre) };
}

/** Verdadero si la hora (HH:MM) cae dentro del horario: apertura ≤ hora < cierre. */
export function estaEnHorario(destino: ConHorario, hora: string): boolean {
  const horario = horarioDe(destino);
  if (!horario) return true;
  return horario.apertura <= hora && hora < horario.cierre;
}
