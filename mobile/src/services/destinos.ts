import { solicitud } from './api';
import type { CategoriaDestino, Destino, DestinoDetalle, NivelOcupacion } from './tipos';

/** `q` busca por nombre (coincidencia parcial, sin distinguir mayúsculas). */
export function listarDestinos(
  filtros: { q?: string; categoria?: CategoriaDestino; nivelOcupacion?: NivelOcupacion } = {},
) {
  return solicitud<Destino[]>('/destinos', { consulta: filtros });
}

export function obtenerDestino(id: number) {
  return solicitud<DestinoDetalle>(`/destinos/${id}`);
}
