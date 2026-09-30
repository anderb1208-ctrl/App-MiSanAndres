import type { Db } from '../config/supabase';
import type { CategoriaDestino, TipoInteraccion } from '../models/database.types';
import * as interaccionModel from '../models/interaccionModel';
import type { CuerpoInteraccion } from '../middleware/esquemas';
import * as destinoService from './destinoService';

export interface Interaccion {
  id: number;
  idDestino: number;
  tipo: TipoInteraccion;
  fechaHora: string;
}

export interface InteraccionHistorial extends Interaccion {
  destino: { id: number; nombre: string; categoria: CategoriaDestino } | null;
}

export async function registrar(db: Db, idUsuario: string, cuerpo: CuerpoInteraccion): Promise<Interaccion> {
  await destinoService.obtenerOFallar(db, cuerpo.idDestino);
  const fila = await interaccionModel.crear(db, {
    idUsuario,
    idDestino: cuerpo.idDestino,
    tipo: cuerpo.tipo,
  });
  return { id: fila.id_interaccion, idDestino: fila.id_destino, tipo: fila.tipo_interaccion, fechaHora: fila.fecha_hora };
}

export async function historial(db: Db, idUsuario: string, limite: number): Promise<InteraccionHistorial[]> {
  const filas = await interaccionModel.listarDelUsuario(db, idUsuario, limite);
  return filas.map((f) => ({
    id: f.id_interaccion,
    idDestino: f.id_destino,
    tipo: f.tipo_interaccion,
    fechaHora: f.fecha_hora,
    destino: f.destino
      ? { id: f.destino.id_destino, nombre: f.destino.nombre, categoria: f.destino.categoria }
      : null,
  }));
}
