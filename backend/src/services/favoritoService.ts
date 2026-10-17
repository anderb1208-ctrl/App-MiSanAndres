/**
 * Favoritos del usuario con sus dos avisos ("cuando abra" y "cuando cierre") y registro de
 * dispositivos para las notificaciones push. Todo con el JWT del usuario (RLS: lo propio).
 */
import type { Db } from '../config/supabase';
import type { UsuarioAuth } from '../models/authModel';
import * as destinoModel from '../models/destinoModel';
import * as dispositivoModel from '../models/dispositivoModel';
import * as favoritoModel from '../models/favoritoModel';
import type { FavoritoRow } from '../models/database.types';
import type { CuerpoAvisosFavorito, CuerpoDispositivo, CuerpoFavorito } from '../middleware/esquemas';
import { noEncontrado } from '../utils/errores';
import { aDestino, type Destino } from './destinoService';

export interface Avisos {
  avisarApertura: boolean;
  avisarCierre: boolean;
}

export interface Favorito extends Avisos {
  idDestino: number;
  fechaCreacion: string;
  /** null si el destino se ocultó. */
  destino: Destino | null;
}

const aAvisos = (f: FavoritoRow): Avisos => ({ avisarApertura: f.avisar_apertura, avisarCierre: f.avisar_cierre });

export async function listar(db: Db, usuario: UsuarioAuth): Promise<Favorito[]> {
  const filas = await favoritoModel.listar(db, usuario.id);
  return filas.map((f) => ({
    idDestino: f.id_destino,
    fechaCreacion: f.fecha_creacion,
    ...aAvisos(f),
    destino: f.destino && f.destino.estado !== 'inactivo' ? aDestino(f.destino) : null,
  }));
}

/** Agrega el destino a favoritos (si ya estaba, actualiza los avisos). */
export async function agregar(db: Db, usuario: UsuarioAuth, cuerpo: CuerpoFavorito): Promise<Favorito> {
  const destino = await destinoModel.obtenerVisible(db, cuerpo.idDestino);
  if (!destino) throw noEncontrado(`No existe un destino con id ${cuerpo.idDestino}.`);
  const fila = await favoritoModel.guardar(db, {
    id_usuario: usuario.id,
    id_destino: cuerpo.idDestino,
    avisar_apertura: cuerpo.avisarApertura,
    avisar_cierre: cuerpo.avisarCierre,
  });
  return { idDestino: fila.id_destino, fechaCreacion: fila.fecha_creacion, ...aAvisos(fila), destino: aDestino(destino) };
}

export async function actualizarAvisos(db: Db, usuario: UsuarioAuth, idDestino: number, cuerpo: CuerpoAvisosFavorito): Promise<Avisos & { idDestino: number }> {
  const fila = await favoritoModel.actualizar(db, usuario.id, idDestino, {
    ...(cuerpo.avisarApertura !== undefined && { avisar_apertura: cuerpo.avisarApertura }),
    ...(cuerpo.avisarCierre !== undefined && { avisar_cierre: cuerpo.avisarCierre }),
  });
  if (!fila) throw noEncontrado(`El destino ${idDestino} no está en tus favoritos.`);
  return { idDestino, ...aAvisos(fila) };
}

export async function quitar(db: Db, usuario: UsuarioAuth, idDestino: number): Promise<void> {
  await favoritoModel.quitar(db, usuario.id, idDestino);
}

export async function registrarDispositivo(db: Db, cuerpo: CuerpoDispositivo): Promise<void> {
  await dispositivoModel.registrar(db, cuerpo.token, cuerpo.plataforma);
}

export async function quitarDispositivo(db: Db, token: string): Promise<void> {
  await dispositivoModel.quitar(db, token);
}
