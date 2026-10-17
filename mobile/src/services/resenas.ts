import { solicitud } from './api';
import type { Resena, ResenasDestino } from './tipos';

export function obtenerResenas(idDestino: number) {
  return solicitud<ResenasDestino>(`/destinos/${idDestino}/resenas`);
}

export async function obtenerMiResena(idDestino: number) {
  const { resena } = await solicitud<{ resena: Resena | null }>(`/destinos/${idDestino}/resena`, { autenticado: true });
  return resena;
}

/** Crea la reseña propia o reemplaza la anterior (una por destino). */
export function guardarResena(idDestino: number, estrellas: number, comentario: string | null) {
  return solicitud<Resena>(`/destinos/${idDestino}/resena`, {
    metodo: 'PUT',
    cuerpo: { estrellas, comentario },
    autenticado: true,
  });
}

export function borrarResena(idDestino: number) {
  return solicitud<void>(`/destinos/${idDestino}/resena`, { metodo: 'DELETE', autenticado: true });
}

// ---- Administrador ----

export function listarResenasAdmin(idDestino: number) {
  return solicitud<Resena[]>(`/admin/destinos/${idDestino}/resenas`, { autenticado: true });
}

export function ocultarResena(idResena: number, oculta: boolean) {
  return solicitud<Resena>(`/admin/resenas/${idResena}`, { metodo: 'PATCH', cuerpo: { oculta }, autenticado: true });
}
