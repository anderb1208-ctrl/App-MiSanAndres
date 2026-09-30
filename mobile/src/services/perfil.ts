import { solicitud } from './api';
import type { Perfil } from './tipos';

export function obtenerPerfil() {
  return solicitud<Perfil>('/perfil', { autenticado: true });
}

export function actualizarNombre(nombre: string) {
  return solicitud<Perfil>('/perfil', { metodo: 'PUT', cuerpo: { nombre }, autenticado: true });
}
