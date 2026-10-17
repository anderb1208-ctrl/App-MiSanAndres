import type { EstadoDestino } from '../models/database.types';

/**
 * Estado operativo real de un destino: un cierre temporal con fecha de fin ya vencida
 * cuenta como abierto. Así el cierre "hasta" funciona sin tareas programadas: se evalúa
 * en cada consulta.
 */
export function estadoEfectivo(
  d: { estado?: EstadoDestino | null; cierre_hasta?: string | null },
  ahora: Date = new Date(),
): EstadoDestino {
  const estado = d.estado ?? 'abierto';
  if (estado === 'cerrado_temporal' && d.cierre_hasta && new Date(d.cierre_hasta).getTime() <= ahora.getTime()) {
    return 'abierto';
  }
  return estado;
}
