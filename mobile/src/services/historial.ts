import { solicitud } from './api';
import type { FiltroHistorial, PaginaHistorial, Pasaporte } from './tipos';

export const TAMANO_PAGINA_HISTORIAL = 20;

export function obtenerHistorial(filtro: FiltroHistorial, pagina = 1) {
  return solicitud<PaginaHistorial>('/historial', {
    consulta: { filtro, pagina, tamano: TAMANO_PAGINA_HISTORIAL },
    autenticado: true,
  });
}

export function borrarHistorial() {
  return solicitud<{ borradas: number }>('/historial', { metodo: 'DELETE', autenticado: true });
}

export function obtenerPasaporte() {
  return solicitud<Pasaporte>('/me/pasaporte', { autenticado: true });
}
