import { solicitud } from './api';
import type { DatosMapa } from './tipos';

/** Todos los destinos con coordenadas y la ocupación de ahora, en una sola llamada. */
export function obtenerMapa() {
  return solicitud<DatosMapa>('/mapa');
}
