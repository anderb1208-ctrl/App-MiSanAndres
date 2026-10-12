import type { Horario, ImagenDestino, RangoPrecio } from '../services/tipos';

/** Significado de cada rango de precio, para acompañar el símbolo. */
export const ETIQUETA_PRECIO: Record<RangoPrecio, string> = {
  Gratis: 'Gratis',
  $: '$ · Económico',
  $$: '$$ · Moderado',
  $$$: '$$$ · Costoso',
};

/** "09:00 – 16:00". */
export const formatearHorario = (h: Horario) => `${h.apertura} – ${h.cierre}`;

/** "Foto: Joao Carlos Medau · CC BY 2.0", o null si no hay datos de crédito. */
export function creditoFoto(imagen: ImagenDestino | null): string | null {
  if (!imagen) return null;
  const partes = [imagen.autor, imagen.licencia].filter(Boolean);
  return partes.length > 0 ? `Foto: ${partes.join(' · ')}` : null;
}
