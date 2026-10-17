import { solicitud } from './api';
import type { Presupuesto, ResultadoRecomendaciones } from './tipos';

/** Sin presupuesto usa el guardado en las preferencias; con él, actúa como filtro rápido. */
export function obtenerRecomendaciones(presupuesto?: Presupuesto | null) {
  return solicitud<ResultadoRecomendaciones>('/recomendaciones', {
    autenticado: true,
    consulta: presupuesto ? { presupuestoMin: presupuesto.minCop, presupuestoMax: presupuesto.maxCop } : undefined,
  });
}
