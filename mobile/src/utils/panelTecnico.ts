import type { EstadoTicket, PrioridadTicket, Ticket } from '../services/tipos';

type TicketBase = Pick<Ticket, 'id' | 'estado' | 'prioridad' | 'tecnico' | 'fechaCreacion' | 'fechaActualizacion' | 'fechaCierre' | 'destino'>;

const HORA_MS = 60 * 60 * 1000;
const ACTIVOS: EstadoTicket[] = ['abierto', 'en_revision'];
const RESUELTOS: EstadoTicket[] = ['resuelto', 'cerrado'];
const RANGO_PRIORIDAD: Record<PrioridadTicket, number> = { alta: 0, media: 1, baja: 2 };
/** Colombia no tiene horario de verano: UTC−5 todo el año. */
const DESFASE_COLOMBIA_MS = 5 * HORA_MS;

export const esActivo = (t: Pick<Ticket, 'estado'>) => ACTIVOS.includes(t.estado);

/** "hace unos minutos", "hace 1 hora", "hace 5 horas", "hace 3 días". */
export function haceTiempo(iso: string, ahora: number = Date.now()): string {
  const ms = Math.max(0, ahora - new Date(iso).getTime());
  const horas = Math.floor(ms / HORA_MS);
  if (horas < 1) return 'hace unos minutos';
  if (horas < 24) return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** Duración en horas, corta: "menos de 1 h", "5 h", "2,5 días". */
export function formatearDuracion(horas: number): string {
  if (horas < 1) return 'menos de 1 h';
  if (horas < 48) return `${Math.round(horas)} h`;
  return `${(Math.round((horas / 24) * 10) / 10).toLocaleString('es-CO')} días`;
}

/** Lunes 00:00 de la semana actual en Colombia, en milisegundos. */
export function inicioDeSemana(ahora: number = Date.now()): number {
  const local = new Date(ahora - DESFASE_COLOMBIA_MS);
  const desdeLunes = (local.getUTCDay() + 6) % 7;
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - desdeLunes) + DESFASE_COLOMBIA_MS;
}

/**
 * Los tickets que más necesitan atención del técnico: activos y sin asignar o asignados a él;
 * prioridad alta primero y, en la misma prioridad, los que llevan más tiempo sin moverse.
 */
export function requiereAtencion<T extends TicketBase>(tickets: readonly T[] | null | undefined, idYo: string | null | undefined, cantidad = 3): T[] {
  return (tickets ?? [])
    .filter((t) => esActivo(t) && (!t.tecnico || t.tecnico.id === idYo))
    .sort(
      (a, b) =>
        RANGO_PRIORIDAD[a.prioridad] - RANGO_PRIORIDAD[b.prioridad] ||
        new Date(a.fechaActualizacion).getTime() - new Date(b.fechaActualizacion).getTime() ||
        a.id - b.id,
    )
    .slice(0, Math.max(0, cantidad));
}

export interface ActividadTecnico {
  /** Resueltos o cerrados por el técnico desde el lunes. */
  resueltosSemana: number;
  /** Promedio de horas entre la creación y el cierre de sus tickets resueltos; null si no hay. */
  promedioHoras: number | null;
  resueltos: number;
  asignados: number;
  /** resueltos / asignados (0–1); null si no tiene tickets asignados. */
  progreso: number | null;
}

export function actividadTecnico(tickets: readonly TicketBase[] | null | undefined, idYo: string | null | undefined, ahora: number = Date.now()): ActividadTecnico {
  const mios = (tickets ?? []).filter((t) => idYo && t.tecnico?.id === idYo);
  const resueltos = mios.filter((t) => RESUELTOS.includes(t.estado));
  const conCierre = resueltos.filter((t) => t.fechaCierre);
  const semana = inicioDeSemana(ahora);
  const horas = conCierre.map((t) => (new Date(t.fechaCierre!).getTime() - new Date(t.fechaCreacion).getTime()) / HORA_MS).filter((h) => h >= 0);
  return {
    resueltosSemana: conCierre.filter((t) => new Date(t.fechaCierre!).getTime() >= semana).length,
    promedioHoras: horas.length > 0 ? horas.reduce((a, h) => a + h, 0) / horas.length : null,
    resueltos: resueltos.length,
    asignados: mios.length,
    progreso: mios.length > 0 ? resueltos.length / mios.length : null,
  };
}

export interface DestinoReportado {
  id: number;
  nombre: string;
  abiertos: number;
}

/** Destinos con más tickets activos (abiertos o en revisión). */
export function destinosConMasReportes(tickets: readonly TicketBase[] | null | undefined, cantidad = 3): DestinoReportado[] {
  const porDestino = new Map<number, DestinoReportado>();
  for (const t of tickets ?? []) {
    if (!esActivo(t) || !t.destino) continue;
    const actual = porDestino.get(t.destino.id) ?? { id: t.destino.id, nombre: t.destino.nombre, abiertos: 0 };
    actual.abiertos++;
    porDestino.set(t.destino.id, actual);
  }
  return [...porDestino.values()].sort((a, b) => b.abiertos - a.abiertos || a.nombre.localeCompare(b.nombre, 'es')).slice(0, cantidad);
}
