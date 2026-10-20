import type { Destino, NivelOcupacion } from '../services/tipos';

/** Grupo de un destino en el resumen de Inicio: un nivel de ocupación o cerrado. */
export type GrupoOcupacion = NivelOcupacion | 'Cerrado';

/** Orden de los segmentos de la barra: de más tranquilo a más lleno, y cerrados al final. */
export const GRUPOS_OCUPACION: GrupoOcupacion[] = ['Bajo', 'Medio', 'Alto', 'Cerrado'];

export interface DistribucionOcupacion {
  conteo: Record<GrupoOcupacion, number>;
  /** Destinos con algún grupo (suma de los cuatro). */
  total: number;
  /** Destinos sin previsión utilizable (sin ocupación o con datos incompletos). */
  sinDatos: number;
}

export interface SegmentoOcupacion {
  grupo: GrupoOcupacion;
  cantidad: number;
  /** Parte del total, entre 0 y 1. */
  fraccion: number;
}

type DestinoResumen = Pick<Destino, 'estado' | 'ocupacionActual'>;

const esNivel = (valor: unknown): valor is NivelOcupacion => valor === 'Bajo' || valor === 'Medio' || valor === 'Alto';

/**
 * Grupo de un destino, o null si no hay datos para ubicarlo. Los inactivos no cuentan.
 * Cerrado: cierre temporal o fuera de horario (la previsión dice "Cerrado").
 */
export function grupoOcupacion(d: DestinoResumen): GrupoOcupacion | null | 'inactivo' {
  if (d.estado === 'inactivo') return 'inactivo';
  if (d.estado === 'cerrado_temporal' || d.ocupacionActual?.estado === 'Cerrado') return 'Cerrado';
  const nivel = d.ocupacionActual?.nivel;
  return esNivel(nivel) ? nivel : null;
}

/** Cuántos destinos hay en cada nivel y cuántos están cerrados ahora. */
export function distribuirPorNivel(destinos: readonly DestinoResumen[] | null | undefined): DistribucionOcupacion {
  const conteo: Record<GrupoOcupacion, number> = { Bajo: 0, Medio: 0, Alto: 0, Cerrado: 0 };
  let sinDatos = 0;
  for (const d of destinos ?? []) {
    const grupo = grupoOcupacion(d);
    if (grupo === 'inactivo') continue;
    if (grupo === null) sinDatos++;
    else conteo[grupo]++;
  }
  const total = conteo.Bajo + conteo.Medio + conteo.Alto + conteo.Cerrado;
  return { conteo, total, sinDatos };
}

/** Segmentos con al menos un destino, en el orden de GRUPOS_OCUPACION. */
export function segmentosDistribucion(dist: DistribucionOcupacion): SegmentoOcupacion[] {
  if (dist.total === 0) return [];
  return GRUPOS_OCUPACION.filter((g) => dist.conteo[g] > 0).map((grupo) => ({
    grupo,
    cantidad: dist.conteo[grupo],
    fraccion: dist.conteo[grupo] / dist.total,
  }));
}

/**
 * Los `cantidad` destinos abiertos con menor ocupación prevista ahora (empate: por nombre).
 * Descarta cerrados, inactivos y los que no tienen nivel o porcentaje válido.
 */
export function masTranquilos<T extends Pick<Destino, 'nombre' | 'estado' | 'ocupacionActual'>>(
  destinos: readonly T[] | null | undefined,
  cantidad = 3,
): T[] {
  return (destinos ?? [])
    .filter((d) => {
      const o = d.ocupacionActual;
      return d.estado === 'abierto' && o?.estado === 'Abierto' && esNivel(o.nivel) && Number.isFinite(o.porcentaje);
    })
    .sort((a, b) => a.ocupacionActual!.porcentaje - b.ocupacionActual!.porcentaje || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, Math.max(0, cantidad));
}

/** Hora de la previsión ("19:07") según el primer destino que la tenga; null si ninguno. */
export function horaPrevision(destinos: readonly Pick<Destino, 'ocupacionActual'>[] | null | undefined): string | null {
  for (const d of destinos ?? []) {
    const hora = d.ocupacionActual?.hora;
    if (hora) return hora.slice(0, 5);
  }
  return null;
}
