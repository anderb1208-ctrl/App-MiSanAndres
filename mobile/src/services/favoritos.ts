import { solicitud } from './api';
import type { AvisosFavorito, Favorito } from './tipos';

export const listarFavoritos = () => solicitud<Favorito[]>('/favoritos', { autenticado: true });

export const agregarFavorito = (idDestino: number, avisos: Partial<AvisosFavorito> = {}) =>
  solicitud<Favorito>('/favoritos', { metodo: 'POST', cuerpo: { idDestino, ...avisos }, autenticado: true });

export const actualizarAvisosFavorito = (idDestino: number, avisos: Partial<AvisosFavorito>) =>
  solicitud<AvisosFavorito & { idDestino: number }>(`/favoritos/${idDestino}`, {
    metodo: 'PATCH',
    cuerpo: avisos,
    autenticado: true,
  });

export const quitarFavorito = (idDestino: number) =>
  solicitud<void>(`/favoritos/${idDestino}`, { metodo: 'DELETE', autenticado: true });

export const registrarDispositivo = (token: string, plataforma: 'ios' | 'android') =>
  solicitud<void>('/dispositivos', { metodo: 'POST', cuerpo: { token, plataforma }, autenticado: true });

export const quitarDispositivo = (token: string) =>
  solicitud<void>('/dispositivos', { metodo: 'DELETE', cuerpo: { token }, autenticado: true });
