/**
 * Reseñas: una por usuario y destino (1 a 5 estrellas y comentario opcional). El promedio
 * solo cuenta las visibles; el administrador puede ocultar reseñas. No hay reseñas de
 * ejemplo: todas las que se ven las escribió un usuario real.
 */
import type { Db } from '../config/supabase';
import type { ResenaRow } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as resenaModel from '../models/resenaModel';
import type { CuerpoResena } from '../middleware/esquemas';
import { noEncontrado } from '../utils/errores';

export interface Resena {
  id: number;
  idDestino: number;
  estrellas: number;
  comentario: string | null;
  fecha: string;
  /** null si no se conoce el nombre (la app muestra "Viajero"). */
  autor: string | null;
  esMia: boolean;
  oculta: boolean;
}

export interface ResenasDestino {
  calificacion: resenaModel.Calificacion | null;
  resenas: Resena[];
}

const aResena = (f: ResenaRow, autor: string | null, idUsuario: string | null): Resena => ({
  id: f.id_resena,
  idDestino: f.id_destino,
  estrellas: f.estrellas,
  comentario: f.comentario,
  fecha: f.fecha_actualizacion,
  autor,
  esMia: idUsuario !== null && f.id_usuario === idUsuario,
  oculta: f.oculta,
});

async function exigirDestino(db: Db, idDestino: number) {
  const destino = await destinoModel.obtenerVisible(db, idDestino);
  if (!destino) throw noEncontrado(`No existe un destino con id ${idDestino}.`);
}

/** Reseñas visibles de un destino con su promedio. */
export async function deDestino(db: Db, idDestino: number): Promise<ResenasDestino> {
  await exigirDestino(db, idDestino);
  const [filas, resumen] = await Promise.all([
    resenaModel.listarPorDestino(db, idDestino),
    resenaModel.resumen(db, [idDestino]),
  ]);
  return {
    calificacion: resumen.get(idDestino) ?? null,
    resenas: filas.map((f) => aResena(f, f.autor?.nombre ?? null, null)),
  };
}

export async function obtenerPropia(db: Db, idUsuario: string, idDestino: number): Promise<Resena | null> {
  const fila = await resenaModel.obtenerPropia(db, idUsuario, idDestino);
  return fila ? aResena(fila, null, idUsuario) : null;
}

/** Crea la reseña propia del destino o reemplaza la que ya tenía. */
export async function guardarPropia(
  db: Db,
  idUsuario: string,
  idDestino: number,
  cuerpo: CuerpoResena,
): Promise<Resena> {
  await exigirDestino(db, idDestino);
  const existente = await resenaModel.obtenerPropia(db, idUsuario, idDestino);
  const fila = existente
    ? await resenaModel.actualizar(db, existente.id_resena, cuerpo)
    : await resenaModel.crear(db, { id_usuario: idUsuario, id_destino: idDestino, ...cuerpo });
  return aResena(fila, null, idUsuario);
}

export async function borrarPropia(db: Db, idUsuario: string, idDestino: number): Promise<void> {
  await resenaModel.borrarPropia(db, idUsuario, idDestino);
}

/** Administrador: todas las reseñas de un destino, también las ocultas. */
export async function listarAdmin(db: Db, idDestino: number): Promise<Resena[]> {
  const filas = await resenaModel.listarPorDestino(db, idDestino, true);
  return filas.map((f) => aResena(f, f.autor?.nombre ?? null, null));
}

export async function ocultar(db: Db, idResena: number, oculta: boolean): Promise<Resena> {
  return aResena(await resenaModel.ocultar(db, idResena, oculta), null, null);
}
