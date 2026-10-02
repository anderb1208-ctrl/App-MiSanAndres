/**
 * Fechas en hora de Colombia (America/Bogota, UTC−5 todo el año, sin horario de verano).
 */
export const ZONA_HORARIA = 'America/Bogota';
const OFFSET = '-05:00';

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export interface FechaHoraLocal {
  /** YYYY-MM-DD */
  fecha: string;
  /** HH:MM */
  hora: string;
}

/** Fecha y hora actuales en Colombia. */
export function ahoraEnColombia(ahora: Date = new Date()): FechaHoraLocal {
  const partes = Object.fromEntries(formato.formatToParts(ahora).map((p) => [p.type, p.value]));
  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}`,
  };
}

/** Fecha y hora (HH:MM) en Colombia de un instante ISO. */
export function aFechaHoraLocal(iso: string): FechaHoraLocal {
  return ahoraEnColombia(new Date(iso));
}

/** Día de la semana ISO de una fecha (YYYY-MM-DD): 1 = lunes … 7 = domingo. */
export function diaSemanaIso(fecha: string): number {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

/** Verdadero si la fecha (YYYY-MM-DD) cae sábado o domingo. */
export function esFinDeSemana(fecha: string): boolean {
  return diaSemanaIso(fecha) >= 6;
}

const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** Nombre del día de la semana ISO ("martes"). */
export const nombreDia = (diaIso: number) => NOMBRES_DIA[diaIso - 1] ?? '';

/** Instantes UTC (ISO) de inicio y fin (exclusivo) de un día de Colombia. */
export function rangoDelDia(fecha: string): { desde: string; hasta: string } {
  const inicio = new Date(`${fecha}T00:00:00${OFFSET}`);
  const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
  return { desde: inicio.toISOString(), hasta: fin.toISOString() };
}

/** Hora entera (0–23) de un texto HH:MM. */
export function horaEntera(hora: string): number {
  return Number(hora.slice(0, 2));
}

export const formatearHora = (h: number) => `${String(h).padStart(2, '0')}:00`;
