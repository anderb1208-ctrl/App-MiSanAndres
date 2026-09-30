import { solicitud } from './api';
import type { ResultadoRecomendaciones } from './tipos';

export function obtenerRecomendaciones() {
  return solicitud<ResultadoRecomendaciones>('/recomendaciones', { autenticado: true });
}
