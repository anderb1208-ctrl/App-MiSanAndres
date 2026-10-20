import type { EstadoTicket, PrioridadTicket, Ticket } from '../services/tipos';
import { esActivo } from './panelTecnico';
import { ESTADOS_TICKET, ETIQUETA_CATEGORIA_TICKET, PRIORIDADES_TICKET } from './tickets';

export interface FiltrosTickets {
  estado?: EstadoTicket;
  prioridad?: PrioridadTicket;
  /** Solo los asignados al usuario. */
  mios?: boolean;
  /** Solo los activos que nadie tiene asignados. */
  sinAsignar?: boolean;
  /** Busca en asunto, descripción, categoría, destino y número ("#12"). */
  texto?: string;
}

export type OrdenTickets = 'recientes' | 'antiguos' | 'prioridad';
export const ORDENES: { valor: OrdenTickets; etiqueta: string }[] = [
  { valor: 'recientes', etiqueta: 'Más recientes' },
  { valor: 'antiguos', etiqueta: 'Más antiguos' },
  { valor: 'prioridad', etiqueta: 'Prioridad' },
];

type TicketFiltrable = Pick<Ticket, 'id' | 'asunto' | 'descripcion' | 'categoria' | 'destino' | 'estado' | 'prioridad' | 'tecnico' | 'fechaCreacion'>;

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function filtrarTickets<T extends TicketFiltrable>(tickets: readonly T[] | null | undefined, f: FiltrosTickets, idYo?: string | null): T[] {
  const q = normalizar((f.texto ?? '').trim().replace(/^#/, ''));
  return (tickets ?? []).filter((t) => {
    if (f.estado && t.estado !== f.estado) return false;
    if (f.prioridad && t.prioridad !== f.prioridad) return false;
    if (f.mios && (!idYo || t.tecnico?.id !== idYo)) return false;
    if (f.sinAsignar && (t.tecnico || !esActivo(t))) return false;
    if (!q) return true;
    const texto = normalizar([String(t.id), t.asunto, t.descripcion, ETIQUETA_CATEGORIA_TICKET[t.categoria], t.destino?.nombre ?? ''].join(' '));
    return texto.includes(q);
  });
}

const RANGO_PRIORIDAD: Record<PrioridadTicket, number> = { alta: 0, media: 1, baja: 2 };

export function ordenarTickets<T extends Pick<Ticket, 'id' | 'prioridad' | 'fechaCreacion'>>(tickets: readonly T[], orden: OrdenTickets): T[] {
  const fecha = (t: T) => new Date(t.fechaCreacion).getTime();
  return [...tickets].sort((a, b) => {
    if (orden === 'antiguos') return fecha(a) - fecha(b) || a.id - b.id;
    if (orden === 'prioridad') return RANGO_PRIORIDAD[a.prioridad] - RANGO_PRIORIDAD[b.prioridad] || fecha(b) - fecha(a);
    return fecha(b) - fecha(a) || b.id - a.id;
  });
}

/**
 * Conteo de cada chip con los DEMÁS filtros aplicados: "Abierto 3" dice cuántos verías al tocarlo.
 */
export function conteosChips(tickets: readonly TicketFiltrable[] | null | undefined, f: FiltrosTickets, idYo?: string | null) {
  const estado = Object.fromEntries(
    ESTADOS_TICKET.map((e) => [e, filtrarTickets(tickets, { ...f, estado: e }, idYo).length]),
  ) as Record<EstadoTicket, number>;
  const prioridad = Object.fromEntries(
    PRIORIDADES_TICKET.map((p) => [p, filtrarTickets(tickets, { ...f, prioridad: p }, idYo).length]),
  ) as Record<PrioridadTicket, number>;
  return {
    estado,
    prioridad,
    mios: filtrarTickets(tickets, { ...f, mios: true }, idYo).length,
    sinAsignar: filtrarTickets(tickets, { ...f, sinAsignar: true }, idYo).length,
  };
}
