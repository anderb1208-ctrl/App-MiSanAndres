/**
 * Predicción de ocupación: único punto que controllers y otros servicios usan para predecir.
 *
 * Predicción puntual (`predecir`, `predecirVarios`):
 * 1. Fuera del horario del destino (o si está cerrado temporalmente) es "Cerrado", ocupación 0,
 *    sin consultar a ningún proveedor.
 * 2. Features (featuresPrediccion.ts): calendario (festivo, puente, temporada) y clima del
 *    proveedor de clima si hay pronóstico para esa hora. Sin clima, la predicción sigue y lo indica.
 * 3. El porcentaje lo calcula el ProveedorPrediccion configurado en PREDICCION_PROVEEDOR
 *    (prediccion/proveedores.ts): heurístico (promedio histórico + factores), ML (servicio de
 *    ml/) o auto (ML con respaldo heurístico). Nivel Bajo/Medio/Alto con nivelDesdePorcentaje.
 * Cada predicción indica qué proveedor la generó y si se basa en datos simulados o reales.
 *
 * Ocupación típica del día (`ocupacionTipicaDelDia`): curva histórica hora por hora de ese
 * día de la semana, sin factores (es lo "típico"), con las horas cerradas en 0. Usa siempre el
 * histórico de la tabla ocupacion.
 */
import type { Db } from '../config/supabase';
import type { NivelOcupacion } from '../models/database.types';
import * as ocupacionModel from '../models/ocupacionModel';
import { diaSemanaIso, esFinDeSemana, formatearHora, nombreDia } from '../utils/fecha';
import { estadoEfectivo } from '../utils/estadoDestino';
import { estaEnHorario } from '../utils/horario';
import { nivelDesdePorcentaje } from '../utils/nivelOcupacion';
import * as climaService from './clima/climaService';
import type { ClimaHora } from './clima/tipos';
import type { Factor } from './factoresPrediccion';
import { construirFeatures, type FeaturesPrediccion } from './featuresPrediccion';
import { redondear, tipoDia } from './prediccion/heuristicoProvider';
import { proveedorActual } from './prediccion/proveedores';
import type {
  BasePrediccion,
  DestinoAPredecir,
  EntradaPrediccion,
  OrigenDatos,
  ProveedorUsado,
  ResultadoProveedor,
  TipoDia,
} from './prediccion/tipos';

export type { BasePrediccion, DestinoAPredecir, OrigenDatos, ProveedorUsado, TipoDia } from './prediccion/tipos';

export type EstadoAtencion = 'Abierto' | 'Cerrado';

export const FUENTE_PREDICCION = 'promedio_historico';
export const FUENTE_MODELO_ML = 'modelo_ml';
export const FUENTE_HORARIO = 'horario';

/** Texto para la app mientras la estimación se base en datos simulados. */
export const MENSAJE_DATOS_SIMULADOS = 'Estimación basada en datos simulados';

export interface Prediccion {
  destinoId: number;
  fecha: string;
  /** Hora solicitada, HH:MM. */
  hora: string;
  tipoDia: TipoDia;
  /** "Cerrado" fuera del horario del destino o si está cerrado temporalmente. */
  estado: EstadoAtencion;
  /** Porcentaje final. */
  porcentaje: number;
  /** null cuando el destino está cerrado. */
  nivel: NivelOcupacion | null;
  personasEstimadas: number;
  /** Registros históricos usados para la base (0 si está cerrado o la generó el modelo de ML). */
  muestras: number;
  fuente: typeof FUENTE_PREDICCION | typeof FUENTE_MODELO_ML | typeof FUENTE_HORARIO;
  /** Quién generó la predicción: heurístico, modelo de ML u "horario" (cerrado, sin cálculo). */
  proveedor: ProveedorUsado | 'horario';
  /** true si se pidió ML (PREDICCION_PROVEEDOR=auto) y respondió el heurístico porque el servicio falló. */
  proveedorRespaldo: boolean;
  /** Datos en que se basa la estimación; null si está cerrado. */
  origenDatos: OrigenDatos | null;
  datosSimulados: boolean;
  /** "Estimación basada en datos simulados" mientras los datos sean sintéticos; si no, null. */
  mensajeOrigen: string | null;
  /** Promedio histórico usado (solo heurístico); null cuando está cerrado o con ML. */
  base: BasePrediccion | null;
  features: FeaturesPrediccion;
  /** Clima usado, o null si no hubo (ver motivoSinClima). */
  clima: ClimaHora | null;
  motivoSinClima: climaService.MotivoSinClima | null;
  /** Factores aplicados sobre la base (heurístico), con su explicación. */
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

const personas = (porcentaje: number, capacidad: number) => Math.round((porcentaje / 100) * capacidad);

const puntoClima = (d: DestinoAPredecir): climaService.PuntoClima => ({
  clave: climaService.claveDestino(d.id_destino),
  latitud: Number(d.latitud),
  longitud: Number(d.longitud),
});

/** Verdadero si el destino atiende a esa hora (HH:MM). */
export const estaAbierto = (destino: DestinoAPredecir, hora: string) =>
  estadoEfectivo(destino) !== 'cerrado_temporal' && estaEnHorario(destino, hora);

function construirPrediccion(
  entrada: EntradaPrediccion,
  fecha: string,
  hora: string,
  clima: climaService.ResultadoClima,
  r: ResultadoProveedor,
): Prediccion {
  const simulados = r.origenDatos === 'sintetico';
  return {
    destinoId: entrada.destino.id_destino,
    fecha,
    hora,
    tipoDia: tipoDia(fecha),
    estado: 'Abierto',
    porcentaje: r.porcentaje,
    nivel: nivelDesdePorcentaje(r.porcentaje),
    personasEstimadas: personas(r.porcentaje, entrada.destino.capacidad),
    muestras: r.muestras,
    fuente: r.fuente,
    proveedor: r.proveedor,
    proveedorRespaldo: r.respaldo,
    origenDatos: r.origenDatos,
    datosSimulados: simulados,
    mensajeOrigen: simulados ? MENSAJE_DATOS_SIMULADOS : null,
    base: r.base,
    features: entrada.features,
    clima: clima.clima,
    motivoSinClima: clima.motivo,
    factores: r.factores,
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
    proveedor: 'horario',
    proveedorRespaldo: false,
    origenDatos: null,
    datosSimulados: false,
    mensajeOrigen: null,
    base: null,
    features: construirFeatures(fecha, hora, null).features,
    clima: null,
    motivoSinClima: null,
    factores: [],
  };
}

/** Predicciones de varios destinos para la misma fecha y hora (clima y proveedor por lote). */
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

  const climas = await climaService.climaEnHora(abiertos.map(puntoClima), fecha, hora);
  const climaDe = (d: DestinoAPredecir): climaService.ResultadoClima =>
    climas.get(puntoClima(d).clave) ?? { clima: null, motivo: 'sin_datos' };
  const entradas: EntradaPrediccion[] = abiertos.map((destino) => {
    const { features, calendario } = construirFeatures(fecha, hora, climaDe(destino).clima);
    return { destino, features, calendario, clima: climaDe(destino).clima };
  });

  const predicciones = await proveedorActual().predecirVarios(db, entradas, fecha, hora);
  for (const entrada of entradas) {
    const r = predicciones.get(entrada.destino.id_destino);
    if (r) resultado.set(entrada.destino.id_destino, construirPrediccion(entrada, fecha, hora, climaDe(entrada.destino), r));
  }
  return resultado;
}

/** Predicción para una fecha y hora. "Cerrado" fuera del horario; null si no se puede predecir. */
export async function predecir(
  db: Db,
  destino: DestinoAPredecir,
  fecha: string,
  hora: string,
): Promise<Prediccion | null> {
  const predicciones = await predecirVarios(db, [destino], fecha, hora);
  return predicciones.get(destino.id_destino) ?? null;
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
