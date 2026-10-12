/**
 * Calendario de Colombia, sin API externa: día de la semana, festivos, puentes y
 * temporada turística. Las fechas son textos YYYY-MM-DD (hora de Colombia).
 *
 * Festivos según la Ley 51 de 1983 ("Ley Emiliani"):
 * - Fijos: 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
 * - Se trasladan al lunes siguiente: 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov.
 * - Según la Pascua: Jueves y Viernes Santo (fijos); Ascensión, Corpus Christi y
 *   Sagrado Corazón (trasladados al lunes: Pascua + 43, + 64 y + 71 días).
 *
 * No se usa el paquete date-holidays: para Colombia incluye el 13 de julio
 * ("Virgen de Chiquinquirá"), que no es festivo nacional, y marca la Pascua como festivo.
 */
import {
  DIAS_MINIMOS_PUENTE,
  SEMANA_SANTA_ES_TEMPORADA_ALTA,
  TEMPORADAS_ALTAS,
} from '../config/calendario';
import { diaSemanaIso, esFinDeSemana, nombreDia } from '../utils/fecha';

export type Temporada = 'alta' | 'normal';

export interface Festivo {
  /** YYYY-MM-DD */
  fecha: string;
  nombre: string;
}

export interface InfoCalendario {
  fecha: string;
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  nombreDia: string;
  esFinDeSemana: boolean;
  esFestivo: boolean;
  nombreFestivo: string | null;
  /** Parte de un fin de semana largo (fin de semana + festivo, o Semana Santa). */
  esPuente: boolean;
  temporada: Temporada;
  /** Por qué es temporada alta ("Vacaciones de mitad de año"), o null. */
  motivoTemporada: string | null;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Suma días a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);
}

const deFecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/** Domingo de Pascua (calendario gregoriano, algoritmo anónimo de Meeus/Jones/Butcher). */
export function domingoDePascua(anio: number): string {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return deFecha(anio, mes, dia);
}

/** La misma fecha si cae lunes; si no, el lunes siguiente (Ley Emiliani). */
export function trasladarALunes(fecha: string): string {
  return sumarDias(fecha, (8 - diaSemanaIso(fecha)) % 7);
}

const FIJOS: [mes: number, dia: number, nombre: string][] = [
  [1, 1, 'Año Nuevo'],
  [5, 1, 'Día del Trabajo'],
  [7, 20, 'Día de la Independencia'],
  [8, 7, 'Batalla de Boyacá'],
  [12, 8, 'Inmaculada Concepción'],
  [12, 25, 'Navidad'],
];

const TRASLADABLES: [mes: number, dia: number, nombre: string][] = [
  [1, 6, 'Día de los Reyes Magos'],
  [3, 19, 'Día de San José'],
  [6, 29, 'San Pedro y San Pablo'],
  [8, 15, 'Asunción de la Virgen'],
  [10, 12, 'Día de la Raza'],
  [11, 1, 'Todos los Santos'],
  [11, 11, 'Independencia de Cartagena'],
];

/** Días desde el Domingo de Pascua; los tres últimos ya incluyen el traslado al lunes. */
const SEGUN_PASCUA: [dias: number, nombre: string][] = [
  [-3, 'Jueves Santo'],
  [-2, 'Viernes Santo'],
  [43, 'Ascensión del Señor'],
  [64, 'Corpus Christi'],
  [71, 'Sagrado Corazón de Jesús'],
];

const cacheFestivos = new Map<number, Map<string, string>>();

function festivosPorFecha(anio: number): Map<string, string> {
  let festivos = cacheFestivos.get(anio);
  if (festivos) return festivos;

  festivos = new Map();
  for (const [mes, dia, nombre] of FIJOS) festivos.set(deFecha(anio, mes, dia), nombre);
  for (const [mes, dia, nombre] of TRASLADABLES) festivos.set(trasladarALunes(deFecha(anio, mes, dia)), nombre);
  const pascua = domingoDePascua(anio);
  for (const [dias, nombre] of SEGUN_PASCUA) festivos.set(sumarDias(pascua, dias), nombre);

  cacheFestivos.set(anio, festivos);
  return festivos;
}

/** Festivos de Colombia de un año, ordenados por fecha. */
export function festivosDelAnio(anio: number): Festivo[] {
  return [...festivosPorFecha(anio)]
    .map(([fecha, nombre]) => ({ fecha, nombre }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** El festivo de esa fecha, o null. */
export function festivoDe(fecha: string): Festivo | null {
  const nombre = festivosPorFecha(Number(fecha.slice(0, 4))).get(fecha);
  return nombre ? { fecha, nombre } : null;
}

const esDiaNoLaboral = (fecha: string) => esFinDeSemana(fecha) || festivoDe(fecha) !== null;

/** Verdadero si la fecha es parte de un bloque de días no laborales de al menos DIAS_MINIMOS_PUENTE días. */
export function esPuente(fecha: string): boolean {
  if (!esDiaNoLaboral(fecha)) return false;
  let dias = 1;
  for (let d = sumarDias(fecha, -1); esDiaNoLaboral(d) && dias < 10; d = sumarDias(d, -1)) dias++;
  for (let d = sumarDias(fecha, 1); esDiaNoLaboral(d) && dias < 10; d = sumarDias(d, 1)) dias++;
  return dias >= DIAS_MINIMOS_PUENTE;
}

const enRango = (mesDia: string, desde: string, hasta: string) =>
  desde <= hasta ? mesDia >= desde && mesDia <= hasta : mesDia >= desde || mesDia <= hasta;

/** Temporada de la fecha y, si es alta, el motivo. */
export function temporadaDe(fecha: string): { temporada: Temporada; motivo: string | null } {
  const mesDia = fecha.slice(5);
  const rango = TEMPORADAS_ALTAS.find((t) => enRango(mesDia, t.desde, t.hasta));
  if (rango) return { temporada: 'alta', motivo: rango.nombre };

  if (SEMANA_SANTA_ES_TEMPORADA_ALTA) {
    const pascua = domingoDePascua(Number(fecha.slice(0, 4)));
    if (fecha >= sumarDias(pascua, -7) && fecha <= pascua) return { temporada: 'alta', motivo: 'Semana Santa' };
  }
  return { temporada: 'normal', motivo: null };
}

/** Todo lo que el calendario sabe de una fecha. */
export function infoDelDia(fecha: string): InfoCalendario {
  const diaSemana = diaSemanaIso(fecha);
  const festivo = festivoDe(fecha);
  const { temporada, motivo } = temporadaDe(fecha);
  return {
    fecha,
    diaSemana,
    nombreDia: nombreDia(diaSemana),
    esFinDeSemana: diaSemana >= 6,
    esFestivo: festivo !== null,
    nombreFestivo: festivo?.nombre ?? null,
    esPuente: esPuente(fecha),
    temporada,
    motivoTemporada: motivo,
  };
}
