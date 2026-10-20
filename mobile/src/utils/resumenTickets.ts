import type { Destino, EstadoTicket, MetricasAdmin, Ticket } from '../services/tipos';

/** Estados en los que un ticket todavía necesita trabajo. */
const ACTIVOS: EstadoTicket[] = ['abierto', 'en_revision'];
const esActivo = (t: Pick<Ticket, 'estado'>) => ACTIVOS.includes(t.estado);

export interface ResumenTecnico {
  /** Activos (abiertos o en revisión) asignados al técnico. */
  asignadosAMi: number;
  abiertos: number;
  enRevision: number;
}

/** Resumen del técnico a partir de todos los tickets que ve. */
export function resumenTecnico(
  tickets: readonly Pick<Ticket, 'estado' | 'tecnico'>[] | null | undefined,
  idUsuario: string | null | undefined,
): ResumenTecnico {
  const lista = tickets ?? [];
  return {
    asignadosAMi: idUsuario ? lista.filter((t) => esActivo(t) && t.tecnico?.id === idUsuario).length : 0,
    abiertos: lista.filter((t) => t.estado === 'abierto').length,
    enRevision: lista.filter((t) => t.estado === 'en_revision').length,
  };
}

export interface ResumenAdmin {
  ticketsAbiertos: number;
  /** Activos (abiertos o en revisión) que nadie tiene asignados. */
  sinAsignar: number;
  usuarios: number;
  destinosCerrados: number;
}

/** Resumen del administrador: tickets, usuarios y destinos cerrados temporalmente. */
export function resumenAdmin(
  metricas: Pick<MetricasAdmin, 'usuarios' | 'ticketsPorEstado'> | null | undefined,
  tickets: readonly Pick<Ticket, 'estado' | 'tecnico'>[] | null | undefined,
  destinos: readonly Pick<Destino, 'estado'>[] | null | undefined,
): ResumenAdmin {
  const lista = tickets ?? [];
  return {
    // Las métricas cuentan todos los tickets; si faltan, se cuentan los de la lista.
    ticketsAbiertos: metricas?.ticketsPorEstado.abierto ?? lista.filter((t) => t.estado === 'abierto').length,
    sinAsignar: lista.filter((t) => esActivo(t) && !t.tecnico).length,
    usuarios: metricas?.usuarios.total ?? 0,
    destinosCerrados: (destinos ?? []).filter((d) => d.estado === 'cerrado_temporal').length,
  };
}
