import type { CategoriaTicket, EstadoDestino, EstadoTicket, PrioridadTicket, Rol } from '../services/tipos';
import type { NombreIcono } from './categorias';

export const ETIQUETA_ROL: Record<Rol, string> = {
  turista: 'Turista',
  tecnico: 'Técnico',
  administrador: 'Administrador',
};

export const ICONO_ROL: Record<Rol, NombreIcono> = {
  turista: 'person',
  tecnico: 'build',
  administrador: 'admin-panel-settings',
};

export const CATEGORIAS_TICKET: { valor: CategoriaTicket; etiqueta: string; icono: NombreIcono }[] = [
  { valor: 'informacion_incorrecta', etiqueta: 'Información incorrecta', icono: 'info-outline' },
  { valor: 'destino', etiqueta: 'Problema en un destino', icono: 'place' },
  { valor: 'app', etiqueta: 'Falla de la app', icono: 'bug-report' },
  { valor: 'sugerencia', etiqueta: 'Sugerencia', icono: 'lightbulb-outline' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'help-outline' },
];

export const ETIQUETA_CATEGORIA_TICKET = Object.fromEntries(CATEGORIAS_TICKET.map((c) => [c.valor, c.etiqueta])) as Record<
  CategoriaTicket,
  string
>;

export const ESTADOS_TICKET: EstadoTicket[] = ['abierto', 'en_revision', 'resuelto', 'cerrado'];
export const ETIQUETA_ESTADO_TICKET: Record<EstadoTicket, string> = {
  abierto: 'Abierto',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};
export const ICONO_ESTADO_TICKET: Record<EstadoTicket, NombreIcono> = {
  abierto: 'mark-email-unread',
  en_revision: 'manage-search',
  resuelto: 'task-alt',
  cerrado: 'lock-outline',
};

export const PRIORIDADES_TICKET: PrioridadTicket[] = ['baja', 'media', 'alta'];
export const ETIQUETA_PRIORIDAD: Record<PrioridadTicket, string> = { baja: 'Baja', media: 'Media', alta: 'Alta' };

export const ESTADOS_DESTINO: EstadoDestino[] = ['abierto', 'cerrado_temporal', 'inactivo'];
export const ETIQUETA_ESTADO_DESTINO: Record<EstadoDestino, string> = {
  abierto: 'Abierto',
  cerrado_temporal: 'Cerrado temporalmente',
  inactivo: 'Oculto',
};
