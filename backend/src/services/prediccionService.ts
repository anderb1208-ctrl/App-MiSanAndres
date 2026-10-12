/**
 * Predicción de ocupación — cálculo del prototipo, antes del modelo de ML.
 *
 * Predicción puntual (`predecir`, `predecirVarios`):
 * 1. Base: promedio histórico del porcentaje a esa hora en ese mismo día de la semana
 *    (si tiene al menos MUESTRAS_MINIMAS_DIA_SEMANA registros); si no, el del tipo de día
 *    (entre semana / fin de semana). Hora de Colombia.
 * 2. Features (featuresPrediccion.ts): calendario (festivo, puente, temporada) y clima del
 *    proveedor si hay pronóstico para esa hora. Sin clima, la predicción sigue y lo indica.
 * 3. Factores multiplicativos (config/factoresPrediccion.ts) sobre la base, limitados a 0–100,
 *    y nivel Bajo/Medio/Alto con nivelDesdePorcentaje.
 * Fuera del horario del destino (o si está cerrado temporalmente) es "Cerrado", ocupación 0.
 *
 * Ocupación típica del día (`ocupacionTipicaDelDia`): curva histórica hora por hora de ese
 * día de la semana, sin factores (es lo "típico"), con las horas cerradas en 0.
 *
 * Es el único punto que conoce cómo se predice. Para usar el servicio de ML (POST /predict)
 * basta con enviarle las FeaturesPrediccion y reimplementar estas funciones con las mismas
 * firmas; controllers, rutas y la app no cambian.
 */
import type { Db } from '../config/supabase';
import { MUESTRAS_MINIMAS_DIA_SEMANA } from '../config/factoresPrediccion';
import type { CategoriaDestino, EstadoDestino, NivelOcupacion } from '../models/database.types';
import * as ocupacionModel from '../models/ocupacionModel';
import { diaSemanaIso, esFinDeSemana, formatearHora, horaEntera, nombreDia } from '../utils/fecha';
import { type ConHorario, estaEnHorario } from '../utils/horario';
import { nivelDesdePorcentaje } from '../utils/nivelOcupacion';
import * as climaService from './clima/climaService';
import type { ClimaHora } from './clima/tipos';
import { aplicarFactores, calcularFactores, type Factor } from './factoresPrediccion';
import { construirFeatures, type FeaturesPrediccion } from './featuresPrediccion';

export type TipoDia = 'entre_semana' | 'fin_de_semana';

export type EstadoAtencion = 'Abierto' | 'Cerrado';

export const FUENTE_PREDICCION = 'promedio_historico';
export const FUENTE_HORARIO = 'horario';

export interface DestinoAPredecir extends ConHorario {
  id_destino: number;
  capacidad: number;
  categoria: CategoriaDestino;
  latitud: number;
  longitud: number;
  estado?: EstadoDestino;
}

export interface BasePrediccion {
  /** Promedio histórico antes de los factores. */
  porcentaje: number;
  /** Histórico usado: el de ese día de la semana o, como respaldo, el del tipo de día. */
  origen: 'dia_semana' | TipoDia;
  muestras: number;
}

export interface Prediccion {
  destinoId: number;
  fecha: string;
  /** Hora solicitada, HH:MM. */
  hora: string;
  tipoDia: TipoDia;
  /** "Cerrado" fuera del horario del destino o si está cerrado temporalmente. */
  estado: EstadoAtencion;
  /** Porcentaje final, con factores. */
  porcentaje: number;
  /** null cuando el destino está cerrado. */
  nivel: NivelOcupacion | null;
  personasEstimadas: number;
  /** Registros históricos usados para la base (0 si está cerrado). */
  muestras: number;
  fuente: typeof FUENTE_PREDICCION | typeof FUENTE_HORARIO;
  /** null cuando está cerrado. */
  base: BasePrediccion | null;
  features: FeaturesPrediccion;
  /** Clima usado, o null si no hubo (ver motivoSinClima). */
  clima: ClimaHora | null;
  motivoSinClima: climaService.MotivoSinClima | null;
  /** Factores aplicados sobre la base, con su explicación. */
  factores: Factor[];
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

const personas = (porcentaje: number, capacidad: number) => Math.round((porcentaje / 100) * capacidad);

const puntoClima = (d: DestinoAPredecir): climaService.PuntoClima => ({
  clave: climaService.claveDestino(d.id_destino),
  latitud: Number(d.latitud),
  longitud: Number(d.longitud),
});

/** Verdadero si el destino atiende a esa hora (HH:MM). */
export const estaAbierto = (destino: DestinoAPredecir, hora: string) =>
  destino.estado !== 'cerrado_temporal' && estaEnHorario(destino, hora);

function construirPrediccion(
  destino: DestinoAPredecir,
  fecha: string,
  hora: string,
  base: BasePrediccion,
  clima: climaService.ResultadoClima,
): Prediccion {
  const { features, calendario } = construirFeatures(fecha, hora, clima.clima);
  const factores = calcularFactores(destino.categoria, features, calendario);
  const porcentaje = redondear(aplicarFactores(base.porcentaje, factores));
  return {
    destinoId: destino.id_destino,
    fecha,
    hora,
    tipoDia: tipoDia(fecha),
    estado: 'Abierto',
    porcentaje,
    nivel: nivelDesdePorcentaje(porcentaje),
    personasEstimadas: personas(porcentaje, destino.capacidad),
    muestras: base.muestras,
    fuente: FUENTE_PREDICCION,
    base,
    features,
    clima: clima.clima,
    motivoSinClima: clima.motivo,
    factores,
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
    base: null,
    features: construirFeatures(fecha, hora, null).features,
    clima: null,
    motivoSinClima: null,
    factores: [],
  };
}

const aBase = (p: ocupacionModel.PromedioHora, origen: BasePrediccion['origen']): BasePrediccion => ({
  porcentaje: redondear(p.promedio),
  origen,
  muestras: p.muestras,
});

/**
 * Bases de varios destinos a una hora: histórico de ese día de la semana y, para los que
 * no tengan suficientes muestras, el del tipo de día (una consulta más, solo si hace falta).
 */
async function basesPorHora(
  db: Db,
  fecha: string,
  hora: string,
  ids: number[],
): Promise<Map<number, BasePrediccion>> {
  // Con un solo destino se filtra en la base; con varios se traen todos de una vez.
  const filtro = { hora: horaEntera(hora), ...(ids.length === 1 && { idDestino: ids[0] }) };
  const bases = new Map<number, BasePrediccion>();

  const delDia = await ocupacionModel.promedioPorHora(db, { ...filtro, diaSemana: diaSemanaIso(fecha) });
  for (const p of delDia) {
    if (p.muestras >= MUESTRAS_MINIMAS_DIA_SEMANA) bases.set(p.id_destino, aBase(p, 'dia_semana'));
  }
  if (ids.some((id) => !bases.has(id))) {
    const delTipo = await ocupacionModel.promedioPorHora(db, { ...filtro, finDeSemana: esFinDeSemana(fecha) });
    for (const p of delTipo) if (!bases.has(p.id_destino)) bases.set(p.id_destino, aBase(p, tipoDia(fecha)));
  }
  return bases;
}

/** Predicción para una fecha y hora. "Cerrado" fuera del horario; null si no hay datos históricos. */
export async function predecir(
  db: Db,
  destino: DestinoAPredecir,
  fecha: string,
  hora: string,
): Promise<Prediccion | null> {
  if (!estaAbierto(destino, hora)) return prediccionCerrado(destino, fecha, hora);

  const punto = puntoClima(destino);
  const [bases, climas] = await Promise.all([
    basesPorHora(db, fecha, hora, [destino.id_destino]),
    climaService.climaEnHora([punto], fecha, hora),
  ]);
  const base = bases.get(destino.id_destino);
  if (!base) return null;
  const clima = climas.get(punto.clave) ?? { clima: null, motivo: 'proveedor_no_disponible' };
  return construirPrediccion(destino, fecha, hora, base, clima);
}

/** Predicciones de varios destinos para la misma fecha y hora (consultas y clima por lote). */
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

  const [bases, climas] = await Promise.all([
    basesPorHora(
      db,
      fecha,
      hora,
      abiertos.map((d) => d.id_destino),
    ),
    climaService.climaEnHora(abiertos.map(puntoClima), fecha, hora),
  ]);
  for (const destino of abiertos) {
    const base = bases.get(destino.id_destino);
    if (!base) continue;
    const clima = climas.get(puntoClima(destino).clave) ?? { clima: null, motivo: 'proveedor_no_disponible' };
    resultado.set(destino.id_destino, construirPrediccion(destino, fecha, hora, base, clima));
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
      const porcentaje = abierto ? redondear(p.promedio) : 0;
      return {
        hora,
        abierto,
        porcentaje,
        nivel: nivelDesdePorcentaje(porcentaje),
        personasEstimadas: personas(porcentaje, destino.capacidad),
      };
    });
  return { diaSemana, nombreDia: nombreDia(diaSemana), base, horas };
}
