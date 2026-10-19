/**
 * "Pasaporte del viajero": progreso del usuario calculado desde sus interacciones.
 *
 * Un destino cuenta como EXPLORADO si el usuario interactuó con él en la app (lo abrió, lo
 * guardó, lo compartió…). No significa que lo haya visitado físicamente: la app lo dice así.
 * Solo cuentan los destinos visibles (no inactivos).
 *
 * Insignias: por categoría (explorar N cayos, N playas…) y de avance general (Primeros
 * pasos, Medio camino, Isleño). Cada una trae su progreso y los destinos que faltan, para
 * que la app abra Explorar filtrado mostrando lo pendiente.
 */
import type { Db } from '../config/supabase';
import type { CategoriaDestino } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as favoritoModel from '../models/favoritoModel';
import * as interaccionModel from '../models/interaccionModel';
import { aFechaHoraLocal } from '../utils/fecha';

/** Interacciones que se leen como máximo (suficientes para cualquier uso normal). */
export const MAX_INTERACCIONES_PASAPORTE = 5000;

export interface Insignia {
  codigo: string;
  nombre: string;
  descripcion: string;
  /** Nombre del ícono de Material Icons. */
  icono: string;
  /** Categoría para filtrar Explorar; null en las de avance general. */
  categoria: CategoriaDestino | null;
  meta: number;
  progreso: number;
  desbloqueada: boolean;
  /** Destinos que faltan por explorar para esta insignia. */
  pendientes: number[];
}

export interface Pasaporte {
  explorados: number;
  total: number;
  /** 0–100, redondeado. */
  porcentaje: number;
  favoritos: number;
  /** Días distintos (hora de Colombia) con alguna interacción. */
  diasActivos: number;
  porCategoria: { categoria: CategoriaDestino; explorados: number; total: number }[];
  insignias: Insignia[];
}

interface DefinicionCategoria {
  codigo: string;
  categoria: CategoriaDestino;
  meta: number;
  nombre: string;
  descripcion: (meta: number) => string;
  icono: string;
}

/** Insignias por categoría: la meta se ajusta si la categoría tiene menos destinos. */
export const INSIGNIAS_CATEGORIA: readonly DefinicionCategoria[] = [
  { codigo: 'cayos', categoria: 'cayo', meta: 3, nombre: 'Navegante de cayos', descripcion: (n) => `Explora ${n} cayos`, icono: 'sailing' },
  { codigo: 'playas', categoria: 'playa', meta: 5, nombre: 'Amante de la playa', descripcion: (n) => `Explora ${n} playas`, icono: 'beach-access' },
  { codigo: 'sabores', categoria: 'gastronomia', meta: 3, nombre: 'Sabores isleños', descripcion: (n) => `Explora ${n} lugares para comer`, icono: 'restaurant' },
  { codigo: 'aventura', categoria: 'actividad', meta: 3, nombre: 'Aventurero', descripcion: (n) => `Explora ${n} actividades`, icono: 'kayaking' },
  { codigo: 'buceo', categoria: 'buceo_snorkel', meta: 2, nombre: 'Bajo el agua', descripcion: (n) => `Explora ${n} lugares de buceo o snorkel`, icono: 'scuba-diving' },
  { codigo: 'naturaleza', categoria: 'naturaleza', meta: 2, nombre: 'Naturaleza viva', descripcion: (n) => `Explora ${n} lugares de naturaleza`, icono: 'forest' },
  { codigo: 'cultura', categoria: 'cultura', meta: 2, nombre: 'Raíces isleñas', descripcion: (n) => `Explora ${n} lugares de cultura`, icono: 'museum' },
];

export async function obtener(db: Db, idUsuario: string): Promise<Pasaporte> {
  const [destinos, interacciones, favoritos] = await Promise.all([
    destinoModel.listarVisibles(db),
    interaccionModel.destinosYFechasDelUsuario(db, idUsuario, MAX_INTERACCIONES_PASAPORTE),
    favoritoModel.contar(db, idUsuario),
  ]);
  return calcular(destinos, interacciones, favoritos);
}

export function calcular(
  destinos: { id_destino: number; categoria: CategoriaDestino }[],
  interacciones: { id_destino: number; fecha_hora: string }[],
  favoritos: number,
): Pasaporte {
  const visibles = new Set(destinos.map((d) => d.id_destino));
  const explorados = new Set(interacciones.map((i) => i.id_destino).filter((id) => visibles.has(id)));
  const dias = new Set(interacciones.map((i) => aFechaHoraLocal(i.fecha_hora).fecha));
  const faltan = (lista: { id_destino: number }[]) => lista.map((d) => d.id_destino).filter((id) => !explorados.has(id));

  const porCategoria = new Map<CategoriaDestino, { id_destino: number }[]>();
  for (const d of destinos) porCategoria.set(d.categoria, [...(porCategoria.get(d.categoria) ?? []), d]);

  const insignias: Insignia[] = [];
  const total = destinos.length;
  const general = (codigo: string, nombre: string, descripcion: string, icono: string, meta: number) => {
    const progreso = Math.min(explorados.size, meta);
    insignias.push({
      codigo, nombre, descripcion, icono, categoria: null, meta, progreso,
      desbloqueada: progreso >= meta, pendientes: progreso >= meta ? [] : faltan(destinos),
    });
  };
  if (total > 0) general('primeros_pasos', 'Primeros pasos', 'Explora tu primer destino', 'directions-walk', 1);
  for (const def of INSIGNIAS_CATEGORIA) {
    const lista = porCategoria.get(def.categoria) ?? [];
    if (lista.length === 0) continue;
    const meta = Math.min(def.meta, lista.length);
    const progreso = Math.min(lista.filter((d) => explorados.has(d.id_destino)).length, meta);
    insignias.push({
      codigo: def.codigo, nombre: def.nombre, descripcion: def.descripcion(meta), icono: def.icono, categoria: def.categoria,
      meta, progreso, desbloqueada: progreso >= meta, pendientes: progreso >= meta ? [] : faltan(lista),
    });
  }
  if (total > 1) general('medio_camino', 'Medio camino', `Explora la mitad de la isla (${Math.ceil(total / 2)} destinos)`, 'explore', Math.ceil(total / 2));
  if (total > 0) general('isleno', 'Isleño', `Explora los ${total} destinos`, 'emoji-events', total);

  return {
    explorados: explorados.size,
    total,
    porcentaje: total ? Math.round((explorados.size / total) * 100) : 0,
    favoritos,
    diasActivos: dias.size,
    porCategoria: [...porCategoria].map(([categoria, lista]) => ({
      categoria,
      explorados: lista.filter((d) => explorados.has(d.id_destino)).length,
      total: lista.length,
    })),
    insignias,
  };
}
