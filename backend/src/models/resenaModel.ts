import type { Db } from '../config/supabase';
import type { ResenaRow } from './database.types';
import { verificar, verificarLista, verificarOperacion } from './verificar';

export interface ResenaConAutor extends ResenaRow {
  autor: { nombre: string | null } | null;
}

export interface Calificacion {
  promedio: number;
  cantidad: number;
}

/** Reseñas visibles de un destino (RLS: las no ocultas, las propias y todas si es admin). */
export async function listarPorDestino(db: Db, idDestino: number, incluirOcultas = false): Promise<ResenaConAutor[]> {
  let consulta = db.from('resena').select('*, autor:usuario (nombre)').eq('id_destino', idDestino);
  if (!incluirOcultas) consulta = consulta.eq('oculta', false);
  const resultado = await consulta.order('fecha_creacion', { ascending: false }).limit(100);
  return verificarLista(resultado, 'Listar reseñas') as unknown as ResenaConAutor[];
}

/** Promedio y cantidad de reseñas visibles (no ocultas) por destino. */
export async function resumen(db: Db, idsDestino: number[]): Promise<Map<number, Calificacion>> {
  const mapa = new Map<number, Calificacion>();
  if (idsDestino.length === 0) return mapa;
  const filas = verificarLista(
    await db.from('resena').select('id_destino, estrellas').in('id_destino', idsDestino).eq('oculta', false),
    'Resumen de reseñas',
  );
  const sumas = new Map<number, { suma: number; n: number }>();
  for (const f of filas) {
    const s = sumas.get(f.id_destino) ?? { suma: 0, n: 0 };
    s.suma += f.estrellas;
    s.n += 1;
    sumas.set(f.id_destino, s);
  }
  for (const [id, s] of sumas) mapa.set(id, { promedio: Math.round((s.suma / s.n) * 10) / 10, cantidad: s.n });
  return mapa;
}

export async function obtenerPropia(db: Db, idUsuario: string, idDestino: number): Promise<ResenaRow | null> {
  return verificar(
    await db.from('resena').select('*').eq('id_usuario', idUsuario).eq('id_destino', idDestino).maybeSingle(),
    'Obtener reseña propia',
  );
}

export async function crear(db: Db, r: { id_usuario: string; id_destino: number; estrellas: number; comentario: string | null }): Promise<ResenaRow> {
  return verificar(await db.from('resena').insert(r).select('*').single(), 'Crear reseña') as ResenaRow;
}

export async function actualizar(db: Db, idResena: number, cambios: { estrellas: number; comentario: string | null }): Promise<ResenaRow> {
  const resultado = await db
    .from('resena')
    .update({ ...cambios, fecha_actualizacion: new Date().toISOString() })
    .eq('id_resena', idResena)
    .select('*')
    .single();
  return verificar(resultado, 'Actualizar reseña') as ResenaRow;
}

export async function borrarPropia(db: Db, idUsuario: string, idDestino: number): Promise<void> {
  const { error } = await db.from('resena').delete().eq('id_usuario', idUsuario).eq('id_destino', idDestino);
  verificarOperacion(error, 'Borrar reseña');
}

/** Ocultar o mostrar (solo administrador: lo verifica la función de la base). */
export async function ocultar(db: Db, idResena: number, oculta: boolean): Promise<ResenaRow> {
  return verificar(await db.rpc('ocultar_resena', { p_id_resena: idResena, p_oculta: oculta }), 'Ocultar reseña') as ResenaRow;
}
