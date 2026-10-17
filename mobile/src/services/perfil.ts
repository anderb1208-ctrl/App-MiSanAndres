import { solicitud } from './api';
import type { Perfil } from './tipos';

export function obtenerPerfil() {
  return solicitud<Perfil>('/perfil', { autenticado: true });
}

export function actualizarNombre(nombre: string) {
  return solicitud<Perfil>('/perfil', { metodo: 'PUT', cuerpo: { nombre }, autenticado: true });
}

/** Usuario del token con su rol (el rol lo decide el backend, nunca la app). */
export function obtenerMe() {
  return solicitud<Perfil>('/me', { autenticado: true });
}
