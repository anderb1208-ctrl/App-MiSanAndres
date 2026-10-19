import { solicitud } from './api';
import type { TipoInteraccion } from './tipos';

export function registrarInteraccion(idDestino: number, tipo: TipoInteraccion) {
  return solicitud<{ id: number }>('/interacciones', {
    metodo: 'POST',
    cuerpo: { idDestino, tipo },
    autenticado: true,
  });
}
