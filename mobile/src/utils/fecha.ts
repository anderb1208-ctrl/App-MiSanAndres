const ZONA = 'America/Bogota';

function partes(fecha: Date, opciones: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, ...opciones }).formatToParts(fecha).map((p) => [p.type, p.value]),
  );
}

/** Fecha de hoy en Colombia, YYYY-MM-DD (la que espera la API). */
export function hoyEnColombia(ahora = new Date()): string {
  const p = partes(ahora, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Hora actual en Colombia, 0–23. */
export function horaEnColombia(ahora = new Date()): number {
  return Number(partes(ahora, { hour: '2-digit', hourCycle: 'h23' }).hour);
}

/** Hora y minutos actuales en Colombia, HH:MM (la que espera la API). */
export function horaMinutoEnColombia(ahora = new Date()): string {
  const p = partes(ahora, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

/** "29 sep, 3:45 p. m." en hora de Colombia. */
export function formatearFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "septiembre de 2026". */
export function formatearMesAnio(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, month: 'long', year: 'numeric' }).format(new Date(iso));
}
