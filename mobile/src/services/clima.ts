import { solicitud } from './api';
import type { ClimaDestino, ClimaIsla } from './tipos';

/** Clima de la hora actual y de las próximas `horas` en un destino. */
export function obtenerClimaDestino(id: number, horas = 12) {
  return solicitud<ClimaDestino>(`/destinos/${id}/clima`, { consulta: { horas } });
}

/** Clima del centro de la isla (resumen de Inicio). */
export function obtenerClimaIsla(horas = 3) {
  return solicitud<ClimaIsla>('/clima', { consulta: { horas } });
}
