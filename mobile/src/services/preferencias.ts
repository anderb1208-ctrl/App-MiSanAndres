import { solicitud } from './api';
import type { Catalogo, Preferencias } from './tipos';

export function obtenerCatalogo() {
  return solicitud<Catalogo>('/preferencias/catalogo');
}

export function obtenerPreferencias() {
  return solicitud<Preferencias>('/preferencias', { autenticado: true });
}

export function guardarPreferencias(preferencias: Preferencias) {
  return solicitud<Preferencias>('/preferencias', { metodo: 'PUT', cuerpo: preferencias, autenticado: true });
}

export function restablecerPreferencias() {
  return solicitud<void>('/preferencias', { metodo: 'DELETE', autenticado: true });
}
