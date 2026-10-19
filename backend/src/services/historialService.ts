/**
 * Historial del usuario (pantalla Historial de la app), con filtros:
 *   recientes   todas sus interacciones, de la más reciente a la más antigua
 *   semana      las de los últimos 7 días
 *   mes         las de los últimos 30 días
 *   mas_vistos  sus destinos con más interacciones
 *   populares   los destinos con más interacciones de TODOS los usuarios en los últimos
 *               30 días: solo totales agregados por destino, sin datos personales
 * En recientes, semana y mes las visitas repetidas al mismo destino el mismo día (hora de
 * Colombia) se juntan en un ítem con `veces`; la app agrupa por `dia` con encabezados.
 */
import type { Db } from '../config/supabase';
import type { CategoriaDestino, TipoInteraccion } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as interaccionModel from '../models/interaccionModel';
import { ErrorBaseDatos, servicioNoDisponible } from '../utils/errores';
import { aFechaHoraLocal } from '../utils/fecha';

export const FILTROS_HISTORIAL = ['recientes', 'semana', 'mes', 'mas_vistos', 'populares'] as const;
export type FiltroHistorial = (typeof FILTROS_HISTORIAL)[number];

/** Interacciones que se leen como máximo para armar el historial (las más recientes). */
export const MAX_INTERACCIONES = 1000;
export const DIAS_POPULARES = 30;
const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_FILTRO: Partial<Record<FiltroHistorial, number>> = { semana: 7, mes: 30 };

export interface DestinoHistorial {
  id: number;
  nombre: string;
  categoria: CategoriaDestino;
  imagenUrl: string | null;
}

export interface ItemHistorial {
  idDestino: number;
  /** null si el destino ya no está disponible. */
  destino: DestinoHistorial | null;
  /** Interacciones juntadas en este ítem ("Visto 3 veces"). */
  veces: number;
  /** Tipos de interacción del ítem, sin repetir (vista, favorito, …). */
  tipos: TipoInteraccion[];
  /** Última interacción del ítem (ISO); null en populares. */
  ultimaVez: string | null;
  /** Día en Colombia (YYYY-MM-DD) para agrupar con encabezados; null en más vistos y populares. */
  dia: string | null;
  /** Solo en populares: cuántas personas distintas lo consultaron (agregado). */
  personas?: number;
}

export interface PaginaHistorial {
  filtro: FiltroHistorial;
  pagina: number;
  tamano: number;
  total: number;
  hayMas: boolean;
  items: ItemHistorial[];
}

type Fila = interaccionModel.InteraccionConDestinoImagen;

const aDestinoHistorial = (d: Fila['destino']): DestinoHistorial | null =>
  d ? { id: d.id_destino, nombre: d.nombre, categoria: d.categoria, imagenUrl: d.imagen_url } : null;

/** Junta las filas con la misma clave conservando el orden de la primera aparición (la más reciente). */
function agrupar(filas: Fila[], clave: (f: Fila) => string, conDia: boolean): ItemHistorial[] {
  const grupos = new Map<string, ItemHistorial>();
  for (const f of filas) {
    const k = clave(f);
    const item = grupos.get(k);
    if (item) {
      item.veces += 1;
      if (!item.tipos.includes(f.tipo_interaccion)) item.tipos.push(f.tipo_interaccion);
    } else {
      grupos.set(k, {
        idDestino: f.id_destino,
        destino: aDestinoHistorial(f.destino),
        veces: 1,
        tipos: [f.tipo_interaccion],
        ultimaVez: f.fecha_hora,
        dia: conDia ? aFechaHoraLocal(f.fecha_hora).fecha : null,
      });
    }
  }
  return [...grupos.values()];
}

export function agruparPorDia(filas: Fila[]): ItemHistorial[] {
  return agrupar(filas, (f) => `${aFechaHoraLocal(f.fecha_hora).fecha}|${f.id_destino}`, true);
}

export function agruparPorDestino(filas: Fila[]): ItemHistorial[] {
  return agrupar(filas, (f) => String(f.id_destino), false).sort(
    (a, b) => b.veces - a.veces || (b.ultimaVez ?? '').localeCompare(a.ultimaVez ?? ''),
  );
}

async function populares(db: Db, ahora: Date): Promise<ItemHistorial[]> {
  const desde = new Date(ahora.getTime() - DIAS_POPULARES * DIA_MS).toISOString();
  let totales: Awaited<ReturnType<typeof interaccionModel.populares>>;
  try {
    totales = await interaccionModel.populares(db, desde, 100);
  } catch (error) {
    // PGRST202: la función no existe todavía (falta aplicar la migración destinos_populares).
    if (error instanceof ErrorBaseDatos && error.codigoBd === 'PGRST202') {
      throw servicioNoDisponible('Los destinos populares aún no están disponibles en el servidor.');
    }
    throw error;
  }
  const destinos = new Map((await destinoModel.listarVisibles(db)).map((d) => [d.id_destino, d]));
  return totales.map((t) => {
    const d = destinos.get(t.id_destino);
    return {
      idDestino: t.id_destino,
      destino: d ? { id: d.id_destino, nombre: d.nombre, categoria: d.categoria, imagenUrl: d.imagen_url } : null,
      veces: Number(t.vistas),
      tipos: [],
      ultimaVez: null,
      dia: null,
      personas: Number(t.usuarios),
    };
  });
}

export async function historial(
  db: Db,
  idUsuario: string,
  consulta: { filtro: FiltroHistorial; pagina: number; tamano: number },
  ahora: Date = new Date(),
): Promise<PaginaHistorial> {
  const { filtro, pagina, tamano } = consulta;
  let items: ItemHistorial[];
  if (filtro === 'populares') {
    items = await populares(db, ahora);
  } else {
    const dias = DIAS_FILTRO[filtro];
    const desde = dias ? new Date(ahora.getTime() - dias * DIA_MS).toISOString() : null;
    const filas = await interaccionModel.listarParaHistorial(db, idUsuario, desde, MAX_INTERACCIONES);
    items = filtro === 'mas_vistos' ? agruparPorDestino(filas) : agruparPorDia(filas);
  }
  const inicio = (pagina - 1) * tamano;
  return {
    filtro,
    pagina,
    tamano,
    total: items.length,
    hayMas: inicio + tamano < items.length,
    items: items.slice(inicio, inicio + tamano),
  };
}

/** Borra todo el historial del usuario. */
export async function borrar(db: Db, idUsuario: string): Promise<{ borradas: number }> {
  return { borradas: await interaccionModel.borrarDelUsuario(db, idUsuario) };
}
