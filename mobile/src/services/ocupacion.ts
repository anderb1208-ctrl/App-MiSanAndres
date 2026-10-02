import { solicitud } from './api';
import type { OcupacionDelDia, OcupacionTipicaDelDia } from './tipos';

/** Registros reales de ocupación de un día (YYYY-MM-DD, hora de Colombia). */
export function obtenerOcupacionDelDia(destinoId: number, fecha: string) {
  return solicitud<OcupacionDelDia>(`/ocupacion/${destinoId}`, { consulta: { fecha } });
}

/** Ocupación típica de cada hora para ese día de la semana (la calcula prediccionService). */
export function obtenerOcupacionTipica(destinoId: number, fecha: string) {
  return solicitud<OcupacionTipicaDelDia>(`/ocupacion/${destinoId}/prediccion/dia`, { consulta: { fecha } });
}
