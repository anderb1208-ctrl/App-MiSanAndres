/**
 * Predicción de ocupación — cálculo simple del MVP.
 *
 * Modelo: promedio histórico del porcentaje de ocupación del destino a la misma
 * hora y en el mismo tipo de día (entre semana / fin de semana), en hora de Colombia.
 *
 * Es el único punto que conoce cómo se predice. Para usar el servicio de ML
 * (POST /predict) basta con reimplementar estas tres funciones conservando sus
 * firmas; controllers y rutas no cambian.
 */
import type { Db } from '../config/supabase';
import type { NivelOcupacion } from '../models/database.types';
import * as ocupacionModel from '../models/ocupacionModel';
import { esFinDeSemana, formatearHora, horaEntera } from '../utils/fecha';
import { nivelDesdePorcentaje } from '../utils/nivelOcupacion';

export type TipoDia = 'entre_semana' | 'fin_de_semana';

export const FUENTE_PREDICCION = 'promedio_historico';

export interface DestinoAPredecir {
  id_destino: number;
  capacidad: number;
}

export interface Prediccion {
  destinoId: number;
  fecha: string;
  /** Hora solicitada, HH:MM. */
  hora: string;
  tipoDia: TipoDia;
  porcentaje: number;
  nivel: NivelOcupacion;
  personasEstimadas: number;
  /** Cantidad de registros históricos usados para el cálculo. */
  muestras: number;
  fuente: typeof FUENTE_PREDICCION;
}

export interface PuntoPrevision {
  /** HH:00 */
  hora: string;
  porcentaje: number;
  nivel: NivelOcupacion;
  personasEstimadas: number;
}

const tipoDia = (fecha: string): TipoDia => (esFinDeSemana(fecha) ? 'fin_de_semana' : 'entre_semana');

const redondear = (n: number) => Math.round(n * 10) / 10;

function construirPrediccion(
  destino: DestinoAPredecir,
  fecha: string,
  hora: string,
  promedio: ocupacionModel.PromedioHora,
): Prediccion {
  const porcentaje = redondear(promedio.promedio);
  return {
    destinoId: destino.id_destino,
    fecha,
    hora,
    tipoDia: tipoDia(fecha),
    porcentaje,
    nivel: nivelDesdePorcentaje(porcentaje),
    personasEstimadas: Math.round((porcentaje / 100) * destino.capacidad),
    muestras: promedio.muestras,
    fuente: FUENTE_PREDICCION,
  };
}

/** Predicción para una fecha y hora. null si no hay datos históricos. */
export async function predecir(
  db: Db,
  destino: DestinoAPredecir,
  fecha: string,
  hora: string,
): Promise<Prediccion | null> {
  const [promedio] = await ocupacionModel.promedioPorHora(db, {
    finDeSemana: esFinDeSemana(fecha),
    hora: horaEntera(hora),
    idDestino: destino.id_destino,
  });
  return promedio ? construirPrediccion(destino, fecha, hora, promedio) : null;
}

/** Predicciones de varios destinos para la misma fecha y hora (una sola consulta). */
export async function predecirVarios(
  db: Db,
  destinos: DestinoAPredecir[],
  fecha: string,
  hora: string,
): Promise<Map<number, Prediccion>> {
  const resultado = new Map<number, Prediccion>();
  if (destinos.length === 0) return resultado;

  const promedios = await ocupacionModel.promedioPorHora(db, {
    finDeSemana: esFinDeSemana(fecha),
    hora: horaEntera(hora),
  });
  const porDestino = new Map(promedios.map((p) => [p.id_destino, p]));

  for (const destino of destinos) {
    const promedio = porDestino.get(destino.id_destino);
    if (promedio) resultado.set(destino.id_destino, construirPrediccion(destino, fecha, hora, promedio));
  }
  return resultado;
}

/** Curva prevista del día: una predicción por cada hora con datos (0–23). */
export async function predecirDia(
  db: Db,
  destino: DestinoAPredecir,
  fecha: string,
): Promise<{ tipoDia: TipoDia; horas: PuntoPrevision[] }> {
  const promedios = await ocupacionModel.promedioPorHora(db, {
    finDeSemana: esFinDeSemana(fecha),
    idDestino: destino.id_destino,
  });
  const horas = [...promedios]
    .sort((a, b) => a.hora - b.hora)
    .map((p) => {
      const { porcentaje, nivel, personasEstimadas } = construirPrediccion(
        destino,
        fecha,
        formatearHora(p.hora),
        p,
      );
      return { hora: formatearHora(p.hora), porcentaje, nivel, personasEstimadas };
    });
  return { tipoDia: tipoDia(fecha), horas };
}
