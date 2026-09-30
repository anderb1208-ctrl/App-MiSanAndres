import { solicitud } from './api';
import type { OcupacionDelDia, PrediccionDelDia } from './tipos';

/** Registros reales de ocupación de un día (YYYY-MM-DD, hora de Colombia). */
export function obtenerOcupacionDelDia(destinoId: number, fecha: string) {
  return solicitud<OcupacionDelDia>(`/ocupacion/${destinoId}`, { consulta: { fecha } });
}

/** Curva prevista de todo el día, hora por hora. */
export function obtenerPrediccionDelDia(destinoId: number, fecha: string) {
  return solicitud<PrediccionDelDia>(`/ocupacion/${destinoId}/prediccion/dia`, { consulta: { fecha } });
}
