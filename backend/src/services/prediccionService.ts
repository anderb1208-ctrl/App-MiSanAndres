/**
 * Predicción de ocupación — cálculo simple del MVP.
 *
 * - Predicción puntual (`predecir`, `predecirVarios`): promedio histórico del
 *   porcentaje de ocupación a la misma hora y en el mismo tipo de día
 *   (entre semana / fin de semana), en hora de Colombia.
 * - Ocupación típica del día (`ocupacionTipicaDelDia`): curva hora por hora con el
 *   promedio de ese mismo día de la semana (p. ej. todos los martes). Si aún no hay
 *   histórico de ese día, usa el del tipo de día.
 *
 * Es el único punto que conoce cómo se predice. Para usar el servicio de ML
 * (POST /predict) basta con reimplementar estas funciones conservando sus
 * firmas; controllers, rutas y la app no cambian.
 */
import type { Db } from '../config/supabase';
import type { NivelOcupacion } from '../models/database.types';
import * as ocupacionModel from '../models/ocupacionModel';
import { diaSemanaIso, esFinDeSemana, formatearHora, horaEntera, nombreDia } from '../utils/fecha';
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

export interface OcupacionTipica {
  /** Día de la semana ISO de la fecha: 1 = lunes … 7 = domingo. */
  diaSemana: number;
  /** "martes", para la etiqueta "Ocupación típica de un martes". */
  nombreDia: string;
  /** Histórico usado: el del mismo día de la semana, o el del tipo de día como respaldo. */
  base: 'dia_semana' | TipoDia;
  horas: PuntoPrevision[];
}

/**
 * Ocupación típica de cada hora (0–23) para el día de la semana de `fecha`.
 * Si no hay histórico de ese día, usa el del tipo de día (entre semana / fin de semana).
 */
export async function ocupacionTipicaDelDia(
  db: Db,
  destino: DestinoAPredecir,
  fecha: string,
): Promise<OcupacionTipica> {
  const diaSemana = diaSemanaIso(fecha);
  let base: OcupacionTipica['base'] = 'dia_semana';
  let promedios = await ocupacionModel.promedioPorHora(db, { diaSemana, idDestino: destino.id_destino });
  if (promedios.length === 0) {
    base = tipoDia(fecha);
    promedios = await ocupacionModel.promedioPorHora(db, {
      finDeSemana: esFinDeSemana(fecha),
      idDestino: destino.id_destino,
    });
  }

  const horas = [...promedios]
    .sort((a, b) => a.hora - b.hora)
    .map((p) => {
      const hora = formatearHora(p.hora);
      const { porcentaje, nivel, personasEstimadas } = construirPrediccion(destino, fecha, hora, p);
      return { hora, porcentaje, nivel, personasEstimadas };
    });
  return { diaSemana, nombreDia: nombreDia(diaSemana), base, horas };
}
