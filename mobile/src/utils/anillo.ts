import type { NivelOcupacion } from '../services/tipos';
import type { DistribucionOcupacion, GrupoOcupacion } from './resumenOcupacion';

/** Segmento del anillo: un nivel de ocupación de los destinos abiertos (fracciones de la vuelta). */
export interface SegmentoAnillo {
  grupo: NivelOcupacion;
  cantidad: number;
  /** Inicio y fin, entre 0 y 1, desde arriba en el sentido del reloj. */
  inicio: number;
  fin: number;
}

export interface Anillo {
  abiertos: number;
  total: number;
  segmentos: SegmentoAnillo[];
}

export interface FilaLeyenda {
  grupo: GrupoOcupacion;
  etiqueta: string;
  cantidad: number;
}

const NIVELES_ANILLO: NivelOcupacion[] = ['Bajo', 'Medio', 'Alto'];
const ETIQUETA: Record<GrupoOcupacion, string> = { Bajo: 'Baja', Medio: 'Media', Alto: 'Alta', Cerrado: 'Cerrados' };
const HABLADO: Record<GrupoOcupacion, [string, string]> = {
  Bajo: ['baja', 'baja'],
  Medio: ['media', 'media'],
  Alto: ['alta', 'alta'],
  Cerrado: ['cerrado', 'cerrados'],
};

/**
 * Segmentos del anillo: cada nivel ocupa su parte del TOTAL de destinos (los cerrados son la
 * pista que queda sin pintar), uno tras otro desde arriba. Entre segmentos queda una separación
 * pequeña (fracción de la vuelta) si el segmento es más largo que ella.
 */
export function calcularAnillo(dist: DistribucionOcupacion, separacion = 0.012): Anillo {
  const abiertos = dist.conteo.Bajo + dist.conteo.Medio + dist.conteo.Alto;
  const total = dist.total;
  if (total <= 0 || abiertos <= 0) return { abiertos, total: Math.max(0, total), segmentos: [] };
  const conDatos = NIVELES_ANILLO.filter((g) => dist.conteo[g] > 0);
  const segmentos: SegmentoAnillo[] = [];
  let cursor = 0;
  conDatos.forEach((grupo, i) => {
    const largo = dist.conteo[grupo] / total;
    const hayOtro = i < conDatos.length - 1 || (abiertos === total && conDatos.length > 1);
    const recorte = hayOtro && largo > separacion * 2 ? separacion : 0;
    segmentos.push({ grupo, cantidad: dist.conteo[grupo], inicio: cursor, fin: cursor + largo - recorte });
    cursor += largo;
  });
  return { abiertos, total, segmentos };
}

/**
 * Trazo SVG de un segmento sobre un círculo de circunferencia `c` (strokeDasharray y
 * strokeDashoffset, con el círculo girado para empezar arriba). Con extremos redondeados,
 * cada extremo sobresale medio grosor: se acorta y desplaza para que no se salga del segmento.
 * Un segmento más corto que el grosor se dibuja como un punto.
 */
export function trazoSegmento(seg: Pick<SegmentoAnillo, 'inicio' | 'fin'>, c: number, grosor: number, redondeado = true) {
  const largoPx = Math.max(0, (seg.fin - seg.inicio) * c);
  const ajuste = redondeado ? grosor : 0;
  const visible = Math.max(0.01, largoPx - ajuste);
  const desplazamiento = seg.inicio * c + (redondeado ? Math.min(grosor / 2, largoPx / 2) : 0);
  return { dasharray: `${visible} ${c}`, dashoffset: -desplazamiento };
}

/** Filas de la leyenda, siempre en el mismo orden: Baja, Media, Alta y Cerrados. */
export function filasLeyenda(dist: DistribucionOcupacion): FilaLeyenda[] {
  return (['Bajo', 'Medio', 'Alto', 'Cerrado'] as GrupoOcupacion[]).map((grupo) => ({
    grupo,
    etiqueta: ETIQUETA[grupo],
    cantidad: dist.conteo[grupo],
  }));
}

/** "3 media, 1 alta, 26 cerrados" (sin los grupos en cero). */
export function descripcionAnillo(dist: DistribucionOcupacion): string {
  const partes = (['Bajo', 'Medio', 'Alto', 'Cerrado'] as GrupoOcupacion[])
    .filter((g) => dist.conteo[g] > 0)
    .map((g) => `${dist.conteo[g]} ${HABLADO[g][dist.conteo[g] === 1 ? 0 : 1]}`);
  return partes.length > 0 ? partes.join(', ') : 'sin destinos con previsión';
}

/** Etiqueta hablada completa del anillo: "4 abiertos: 3 media, 1 alta, 26 cerrados". */
export function etiquetaAnillo(dist: DistribucionOcupacion): string {
  const abiertos = dist.conteo.Bajo + dist.conteo.Medio + dist.conteo.Alto;
  return `${abiertos} ${abiertos === 1 ? 'abierto' : 'abiertos'}: ${descripcionAnillo(dist)}`;
}
