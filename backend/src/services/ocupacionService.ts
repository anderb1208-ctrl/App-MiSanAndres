import type { Db } from '../config/supabase';
import type { NivelOcupacion } from '../models/database.types';
import * as ocupacionModel from '../models/ocupacionModel';
import { noEncontrado } from '../utils/errores';
import { aFechaHoraLocal, rangoDelDia } from '../utils/fecha';
import { nivelDesdePorcentaje } from '../utils/nivelOcupacion';
import * as destinoService from './destinoService';
import * as prediccionService from './prediccionService';

export interface RegistroOcupacion {
  /** HH:MM en hora de Colombia. */
  hora: string;
  fechaHora: string;
  cantidadPersonas: number;
  porcentaje: number;
  nivel: NivelOcupacion;
}

const SIN_HISTORIAL = 'No hay datos históricos suficientes para predecir la ocupación de este destino.';

/** Registros reales de ocupación de un día (hora de Colombia). */
export async function registrosDelDia(db: Db, destinoId: number, fecha: string) {
  await destinoService.obtenerOFallar(db, destinoId);
  const { desde, hasta } = rangoDelDia(fecha);
  const filas = await ocupacionModel.listarRegistros(db, destinoId, desde, hasta);

  const registros: RegistroOcupacion[] = filas.map((f) => {
    const porcentaje = Number(f.porcentaje_ocupacion);
    return {
      hora: aFechaHoraLocal(f.fecha_hora).hora,
      fechaHora: f.fecha_hora,
      cantidadPersonas: f.cantidad_personas,
      porcentaje,
      nivel: nivelDesdePorcentaje(porcentaje),
    };
  });
  return { destinoId, fecha, registros };
}

/** Predicción puntual para una fecha y hora. */
export async function prediccion(db: Db, destinoId: number, fecha: string, hora: string) {
  const destino = await destinoService.obtenerOFallar(db, destinoId);
  const resultado = await prediccionService.predecir(db, destino, fecha, hora);
  if (!resultado) throw noEncontrado(SIN_HISTORIAL);
  return resultado;
}

/** Curva prevista de todo el día, hora por hora. */
export async function prediccionDelDia(db: Db, destinoId: number, fecha: string) {
  const destino = await destinoService.obtenerOFallar(db, destinoId);
  const { tipoDia, horas } = await prediccionService.predecirDia(db, destino, fecha);
  if (horas.length === 0) throw noEncontrado(SIN_HISTORIAL);
  return { destinoId, fecha, tipoDia, fuente: prediccionService.FUENTE_PREDICCION, horas };
}
