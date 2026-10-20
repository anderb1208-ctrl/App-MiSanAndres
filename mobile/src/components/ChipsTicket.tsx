import type { EstadoDestino, EstadoTicket, PrioridadTicket } from '../services/tipos';
import { ticketColors } from '../theme';
import { ETIQUETA_ESTADO_DESTINO, ETIQUETA_ESTADO_TICKET, ETIQUETA_PRIORIDAD } from '../utils/tickets';
import { ChipEstado } from './ChipEstado';

/** Estado de un ticket con su color (Abierto, En revisión, Resuelto, Cerrado). */
export function ChipEstadoTicket({ estado, tamano }: { estado: EstadoTicket; tamano?: 'sm' | 'md' }) {
  const etiqueta = ETIQUETA_ESTADO_TICKET[estado];
  return <ChipEstado etiqueta={etiqueta} accesible={`Estado: ${etiqueta}`} tono={ticketColors.estado[estado]} tamano={tamano} />;
}

/** Prioridad de un ticket ("Prioridad alta" con ícono de alerta). */
export function ChipPrioridad({ prioridad, tamano }: { prioridad: PrioridadTicket; tamano?: 'sm' | 'md' }) {
  const etiqueta = `Prioridad ${ETIQUETA_PRIORIDAD[prioridad].toLowerCase()}`;
  return (
    <ChipEstado
      etiqueta={etiqueta}
      tono={ticketColors.prioridad[prioridad]}
      icono={prioridad === 'alta' ? 'priority-high' : undefined}
      tamano={tamano}
    />
  );
}

/** Estado de un destino en el panel del administrador (Abierto, Cerrado temporalmente, Oculto). */
const TONO_DESTINO = {
  abierto: ticketColors.estado.resuelto,
  cerrado_temporal: ticketColors.prioridad.alta,
  inactivo: ticketColors.estado.cerrado,
} as const;

export function ChipEstadoDestino({ estado, tamano }: { estado: EstadoDestino; tamano?: 'sm' | 'md' }) {
  const etiqueta = ETIQUETA_ESTADO_DESTINO[estado];
  return <ChipEstado etiqueta={etiqueta} accesible={`Estado: ${etiqueta}`} tono={TONO_DESTINO[estado]} tamano={tamano} />;
}
