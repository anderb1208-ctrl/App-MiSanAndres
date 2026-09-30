import { solicitud } from './api';
import type { CategoriaDestino, Destino, DestinoDetalle, NivelOcupacion } from './tipos';

export function listarDestinos(filtros: { categoria?: CategoriaDestino; nivelOcupacion?: NivelOcupacion } = {}) {
  return solicitud<Destino[]>('/destinos', { consulta: filtros });
}

export function obtenerDestino(id: number) {
  return solicitud<DestinoDetalle>(`/destinos/${id}`);
}
