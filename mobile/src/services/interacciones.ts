import { solicitud } from './api';
import type { InteraccionHistorial, TipoInteraccion } from './tipos';

export function registrarInteraccion(idDestino: number, tipo: TipoInteraccion) {
  return solicitud<{ id: number }>('/interacciones', {
    metodo: 'POST',
    cuerpo: { idDestino, tipo },
    autenticado: true,
  });
}

export function obtenerHistorial(limite = 30) {
  return solicitud<InteraccionHistorial[]>('/interacciones', { consulta: { limite }, autenticado: true });
}
