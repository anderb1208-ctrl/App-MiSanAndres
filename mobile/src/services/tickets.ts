import { solicitud } from './api';
import type { ComentarioTicket, EstadoTicket, NuevoTicket, PrioridadTicket, Ticket, TicketDetalle } from './tipos';

export interface FiltrosTickets {
  estado?: EstadoTicket;
  prioridad?: PrioridadTicket;
  asignadosAMi?: boolean;
}

export function listarTickets(filtros: FiltrosTickets = {}) {
  return solicitud<Ticket[]>('/tickets', {
    autenticado: true,
    consulta: {
      estado: filtros.estado,
      prioridad: filtros.prioridad,
      asignadosAMi: filtros.asignadosAMi ? 'true' : undefined,
    },
  });
}

export function obtenerTicket(id: number) {
  return solicitud<TicketDetalle>(`/tickets/${id}`, { autenticado: true });
}

export function crearTicket(ticket: NuevoTicket) {
  return solicitud<Ticket>('/tickets', { metodo: 'POST', cuerpo: ticket, autenticado: true });
}

/** Solo técnico o administrador (el backend lo verifica). */
export function actualizarTicket(
  id: number,
  cambios: { estado?: EstadoTicket; prioridad?: PrioridadTicket; idTecnico?: string | null },
) {
  return solicitud<Ticket>(`/tickets/${id}`, { metodo: 'PATCH', cuerpo: cambios, autenticado: true });
}

export function comentarTicket(id: number, comentario: string) {
  return solicitud<ComentarioTicket>(`/tickets/${id}/comentarios`, {
    metodo: 'POST',
    cuerpo: { comentario },
    autenticado: true,
  });
}
