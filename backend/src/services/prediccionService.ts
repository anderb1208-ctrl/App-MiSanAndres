/**
 * Predicción de ocupación — cálculo simple del MVP.
 *
 * - Predicción puntual (`predecir`, `predecirVarios`): promedio histórico del
 *   porcentaje de ocupación a la misma hora y en el mismo tipo de día
 *   (entre semana / fin de semana), en hora de Colombia.
 * - Ocupación típica del día (`ocupacionTipicaDelDia`): curva hora por hora con el
 *   promedio de ese mismo día de la semana (p. ej. todos los martes). Si aún no hay
 *   histórico de ese día, usa el del tipo de día.
 * - Fuera del horario del destino (o si está cerrado temporalmente) la predicción
 *   es "Cerrado" con ocupación 0, sin consultar el histórico.
 *
 * Es el único punto que conoce cómo se predice. Para usar el servicio de ML
 * (POST /predict) basta con reimplementar estas funciones conservando sus
 * firmas; controllers, rutas y la app no cambian.
 */
import type { Db } from '../config/supabase';
import type { EstadoDestino, NivelOcupacion } from '../models/database.types';
import * as ocupacionModel from '../models/ocupacionModel';
import { diaSemanaIso, esFinDeSemana, formatearHora, horaEntera, nombreDia } from '../utils/fecha';
import { type ConHorario, estaEnHorario } from '../utils/horario';
import { nivelDesdePorcentaje } from '../utils/nivelOcupacion';

export type TipoDia = 'entre_semana' | 'fin_de_semana';

export type EstadoAtencion = 'Abierto' | 'Cerrado';

export const FUENTE_PREDICCION = 'promedio_historico';
export const FUENTE_HORARIO = 'horario';

export interface DestinoAPredecir extends ConHorario {
  id_destino: number;
  capacidad: number;
  estado?: EstadoDestino;
}

export interface Prediccion {
  destinoId: number;
  fecha: string;
  /** Hora solicitada, HH:MM. */
  hora: string;
  tipoDia: TipoDia;
  /** "Cerrado" fuera del horario del destino o si está cerrado temporalmente. */
  estado: EstadoAtencion;
  porcentaje: number;
  /** null cuando el destino está cerrado. */
  nivel: NivelOcupacion | null;
  personasEstimadas: number;
  /** Cantidad de registros históricos usados para el cálculo (0 si está cerrado). */
  muestras: number;
  fuente: typeof FUENTE_PREDICCION | typeof FUENTE_HORARIO;
}

export interface PuntoPrevision {
  /** HH:00 */
  hora: string;
  /** false si a esa hora el destino está fuera de su horario. */
  abierto: boolean;
  porcentaje: number;
  nivel: NivelOcupacion;
  personasEstimadas: number;
}

const tipoDia = (fecha: string): TipoDia => (esFinDeSemana(fecha) ? 'fin_de_semana' : 'entre_semana');

const redondear = (n: number) => Math.round(n * 10) / 10;

/** Verdadero si el destino atiende a esa hora (HH:MM). */
export const estaAbierto = (destino: DestinoAPredecir, hora: string) =>
  destino.estado !== 'cerrado_temporal' && estaEnHorario(destino, hora);

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
    estado: 'Abierto',
    porcentaje,
    nivel: nivelDesdePorcentaje(porcentaje),
    personasEstimadas: Math.round((porcentaje / 100) * destino.capacidad),
    muestras: promedio.muestras,
    fuente: FUENTE_PREDICCION,
  };
}

function prediccionCerrado(destino: DestinoAPredecir, fecha: string, hora: string): Prediccion {
  return {
    destinoId: destino.id_destino,
    fecha,
    hora,
    tipoDia: tipoDia(fecha),
    estado: 'Cerrado',
    porcentaje: 0,
    nivel: null,
    personasEstimadas: 0,
    muestras: 0,
    fuente: FUENTE_HORARIO,
  };
}

/** Predicción para una fecha y hora. "Cerrado" fuera del horario; null si no hay datos históricos. */
export async function predecir(
  db: Db,
  destino: DestinoAPredecir,
  fecha: string,
  hora: string,
): Promise<Prediccion | null> {
  if (!estaAbierto(destino, hora)) return prediccionCerrado(destino, fecha, hora);

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
  const abiertos = destinos.filter((d) => estaAbierto(d, hora));
  for (const destino of destinos) {
    if (!abiertos.includes(destino)) resultado.set(destino.id_destino, prediccionCerrado(destino, fecha, hora));
  }
  if (abiertos.length === 0) return resultado;

  const promedios = await ocupacionModel.promedioPorHora(db, {
    finDeSemana: esFinDeSemana(fecha),
    hora: horaEntera(hora),
  });
  const porDestino = new Map(promedios.map((p) => [p.id_destino, p]));

  for (const destino of abiertos) {
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
 * Las horas fuera del horario del destino van con `abierto: false` y ocupación 0.
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
    .map((p): PuntoPrevision => {
      const hora = formatearHora(p.hora);
      const abierto = estaAbierto(destino, hora);
      const { porcentaje, personasEstimadas } = construirPrediccion(destino, fecha, hora, {
        ...p,
        promedio: abierto ? p.promedio : 0,
      });
      return { hora, abierto, porcentaje, nivel: nivelDesdePorcentaje(porcentaje), personasEstimadas };
    });
  return { diaSemana, nombreDia: nombreDia(diaSemana), base, horas };
}
