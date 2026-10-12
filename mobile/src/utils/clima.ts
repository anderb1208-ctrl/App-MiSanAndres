import type { ClimaHora, FactorPrediccion, MotivoSinClima } from '../services/tipos';
import type { NombreIcono } from './categorias';

interface EstadoTiempo {
  /** Texto breve en español. */
  texto: string;
  icono: NombreIcono;
}

/** Códigos WMO del estado del tiempo (los que usa Open-Meteo). */
const CODIGOS_WMO: Record<number, EstadoTiempo> = {
  0: { texto: 'Despejado', icono: 'wb-sunny' },
  1: { texto: 'Mayormente despejado', icono: 'wb-sunny' },
  2: { texto: 'Parcialmente nublado', icono: 'wb-cloudy' },
  3: { texto: 'Nublado', icono: 'cloud' },
  45: { texto: 'Niebla', icono: 'foggy' },
  48: { texto: 'Niebla con escarcha', icono: 'foggy' },
  51: { texto: 'Llovizna ligera', icono: 'grain' },
  53: { texto: 'Llovizna', icono: 'grain' },
  55: { texto: 'Llovizna intensa', icono: 'grain' },
  56: { texto: 'Llovizna helada', icono: 'grain' },
  57: { texto: 'Llovizna helada intensa', icono: 'grain' },
  61: { texto: 'Lluvia ligera', icono: 'water-drop' },
  63: { texto: 'Lluvia', icono: 'water-drop' },
  65: { texto: 'Lluvia fuerte', icono: 'umbrella' },
  66: { texto: 'Lluvia helada', icono: 'water-drop' },
  67: { texto: 'Lluvia helada fuerte', icono: 'umbrella' },
  71: { texto: 'Nevada ligera', icono: 'ac-unit' },
  73: { texto: 'Nevada', icono: 'ac-unit' },
  75: { texto: 'Nevada fuerte', icono: 'ac-unit' },
  77: { texto: 'Granizo fino', icono: 'ac-unit' },
  80: { texto: 'Chubascos ligeros', icono: 'water-drop' },
  81: { texto: 'Chubascos', icono: 'umbrella' },
  82: { texto: 'Chubascos fuertes', icono: 'umbrella' },
  85: { texto: 'Chubascos de nieve', icono: 'cloudy-snowing' },
  86: { texto: 'Chubascos de nieve fuertes', icono: 'cloudy-snowing' },
  95: { texto: 'Tormenta', icono: 'thunderstorm' },
  96: { texto: 'Tormenta con granizo', icono: 'thunderstorm' },
  99: { texto: 'Tormenta fuerte con granizo', icono: 'thunderstorm' },
};

const DESCONOCIDO: EstadoTiempo = { texto: 'Sin descripción', icono: 'cloud' };

/** Texto e ícono del estado del tiempo. */
export function estadoDelTiempo(codigo: number | null): EstadoTiempo {
  return codigo === null ? DESCONOCIDO : (CODIGOS_WMO[codigo] ?? DESCONOCIDO);
}

/** "29°" */
export const formatearTemperatura = (c: number | null) => (c === null ? '–' : `${Math.round(c)}°`);

/** "14:00" de "2026-10-12T14:00". */
export const horaDe = (c: ClimaHora) => c.fechaHora.slice(11, 16);

/** Por qué no hay clima, en una frase para el usuario. */
export const MOTIVO_SIN_CLIMA: Record<MotivoSinClima, string> = {
  fuera_de_rango: 'No hay pronóstico del clima para esa fecha.',
  proveedor_no_disponible: 'El servicio del clima no responde en este momento.',
  sin_datos: 'No hay datos del clima para esta hora.',
};

/** Ícono de un factor de la predicción. */
export function iconoFactor(f: FactorPrediccion): NombreIcono {
  if (f.codigo === 'tormenta') return 'thunderstorm';
  if (f.codigo === 'lluvia') return 'umbrella';
  if (f.codigo === 'temporada_alta') return 'beach-access';
  return 'event';
}

export const ATRIBUCION_CLIMA = 'Datos del clima: Open-Meteo.com (CC BY 4.0)';
