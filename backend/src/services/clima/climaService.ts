/**
 * Clima por hora para los destinos, con caché en memoria.
 *
 * - Cada punto (destino o centro de la isla) se guarda 30 minutos; los que faltan se
 *   piden juntos en una sola llamada al proveedor.
 * - Si el proveedor falla, no se vuelve a intentar durante 1 minuto (así una caída de la
 *   API no hace esperar el timeout en cada consulta) y se responde sin clima.
 * - Fuera del rango del pronóstico (ayer a hoy + 15 días) no se consulta al proveedor.
 *
 * Nada de esto conoce a Open-Meteo: el proveedor se cambia con `usarProveedorClima`.
 */
import { ahoraEnColombia, horaEntera } from '../../utils/fecha';
import { sumarDias } from '../calendarioService';
import { OpenMeteoProvider } from './openMeteoProvider';
import type { Atribucion, ClimaHora, Coordenada, ProveedorClima } from './tipos';

export const VIGENCIA_CACHE_MS = 30 * 60 * 1000;
export const ESPERA_TRAS_FALLO_MS = 60 * 1000;
const DIAS_PASADOS = 1;
const DIAS_PRONOSTICO = 16;

export type MotivoSinClima = 'fuera_de_rango' | 'proveedor_no_disponible' | 'sin_datos';

export type ResultadoClima = { clima: ClimaHora; motivo: null } | { clima: null; motivo: MotivoSinClima };

export interface PuntoClima extends Coordenada {
  /** Identifica el punto en la caché ("destino:5", "isla"). */
  clave: string;
}

export interface Pronostico {
  disponible: boolean;
  motivoSinClima: MotivoSinClima | null;
  /** Clima de la hora actual. */
  actual: ClimaHora | null;
  /** Horas siguientes a la actual. */
  proximasHoras: ClimaHora[];
  atribucion: Atribucion;
}

export const claveDestino = (idDestino: number) => `destino:${idDestino}`;

/** Centro aproximado de la isla (sector La Loma), para el resumen del clima en Inicio. */
export const CENTRO_ISLA: PuntoClima & { nombre: string } = {
  clave: 'isla',
  nombre: 'San Andrés',
  latitud: 12.556,
  longitud: -81.718,
};

interface EntradaCache {
  porHora: Map<string, ClimaHora>;
  ordenada: ClimaHora[];
  vence: number;
}

let proveedor: ProveedorClima = new OpenMeteoProvider();
const cache = new Map<string, EntradaCache>();
const enCurso = new Map<string, Promise<void>>();
let sinProveedorHasta = 0;

/** Cambia el proveedor (otro servicio, o uno falso en las pruebas) y vacía la caché. */
export function usarProveedorClima(nuevo: ProveedorClima) {
  proveedor = nuevo;
  limpiarCacheClima();
}

export function limpiarCacheClima() {
  cache.clear();
  enCurso.clear();
  sinProveedorHasta = 0;
}

export const atribucionClima = () => proveedor.atribucion;

/** "2026-10-12" + "14:30" → "2026-10-12T14:00" (clave horaria del proveedor). */
const claveHora = (fecha: string, hora: string) => `${fecha}T${String(horaEntera(hora)).padStart(2, '0')}:00`;

function dentroDelRango(fecha: string): boolean {
  const hoy = ahoraEnColombia().fecha;
  return fecha >= sumarDias(hoy, -DIAS_PASADOS) && fecha <= sumarDias(hoy, DIAS_PRONOSTICO - 1);
}

async function pedir(puntos: PuntoClima[]): Promise<void> {
  const clave = puntos.map((p) => p.clave).sort().join('|');
  const pendiente = enCurso.get(clave);
  if (pendiente) return pendiente;

  const peticion = (async () => {
    try {
      const series = await proveedor.pronostico(puntos, { diasPasados: DIAS_PASADOS, diasPronostico: DIAS_PRONOSTICO });
      const vence = Date.now() + VIGENCIA_CACHE_MS;
      puntos.forEach((p, i) => {
        const ordenada = series[i] ?? [];
        cache.set(p.clave, { ordenada, porHora: new Map(ordenada.map((c) => [c.fechaHora, c])), vence });
      });
    } catch (e) {
      sinProveedorHasta = Date.now() + ESPERA_TRAS_FALLO_MS;
      if (process.env.NODE_ENV !== 'test') console.warn(`[clima] ${proveedor.nombre} no disponible:`, (e as Error).message);
    } finally {
      enCurso.delete(clave);
    }
  })();
  enCurso.set(clave, peticion);
  return peticion;
}

/** Series vigentes de los puntos; las que faltan se piden juntas. Las que no se pudieron obtener no aparecen. */
async function seriesDe(puntos: PuntoClima[]): Promise<Map<string, EntradaCache>> {
  const ahora = Date.now();
  const faltan = puntos.filter((p) => !((cache.get(p.clave)?.vence ?? 0) > ahora));
  if (faltan.length > 0 && ahora >= sinProveedorHasta) await pedir(faltan);

  const resultado = new Map<string, EntradaCache>();
  for (const p of puntos) {
    const entrada = cache.get(p.clave);
    if (entrada) resultado.set(p.clave, entrada);
  }
  return resultado;
}

const tieneDatos = (c: ClimaHora) =>
  [c.temperatura, c.probLluvia, c.precipitacion, c.codigoClima, c.viento].some((v) => v !== null);

/** Clima de cada punto en una fecha y hora (HH:MM) de Colombia. */
export async function climaEnHora(
  puntos: PuntoClima[],
  fecha: string,
  hora: string,
): Promise<Map<string, ResultadoClima>> {
  const resultado = new Map<string, ResultadoClima>();
  if (puntos.length === 0) return resultado;
  if (!dentroDelRango(fecha)) {
    for (const p of puntos) resultado.set(p.clave, { clima: null, motivo: 'fuera_de_rango' });
    return resultado;
  }

  const series = await seriesDe(puntos);
  const buscada = claveHora(fecha, hora);
  for (const p of puntos) {
    const serie = series.get(p.clave);
    const clima = serie?.porHora.get(buscada);
    if (!serie) resultado.set(p.clave, { clima: null, motivo: 'proveedor_no_disponible' });
    else if (!clima) resultado.set(p.clave, { clima: null, motivo: 'fuera_de_rango' });
    else if (!tieneDatos(clima)) resultado.set(p.clave, { clima: null, motivo: 'sin_datos' });
    else resultado.set(p.clave, { clima, motivo: null });
  }
  return resultado;
}

/** Clima del centro de la isla (resumen de Inicio). */
export async function pronosticoIsla(horas: number) {
  return { lugar: CENTRO_ISLA.nombre, ...(await pronosticoDesdeAhora(CENTRO_ISLA, horas)) };
}

/** Clima de la hora actual y de las `horas` siguientes en un punto. */
export async function pronosticoDesdeAhora(punto: PuntoClima, horas: number): Promise<Pronostico> {
  const { fecha, hora } = ahoraEnColombia();
  const serie = (await seriesDe([punto])).get(punto.clave);
  const base = { atribucion: proveedor.atribucion };
  if (!serie) return { ...base, disponible: false, motivoSinClima: 'proveedor_no_disponible', actual: null, proximasHoras: [] };

  const ahora = claveHora(fecha, hora);
  const actual = serie.porHora.get(ahora) ?? null;
  const proximasHoras = serie.ordenada.filter((c) => c.fechaHora > ahora).slice(0, horas);
  if (!actual && proximasHoras.length === 0) {
    return { ...base, disponible: false, motivoSinClima: 'sin_datos', actual: null, proximasHoras: [] };
  }
  return { ...base, disponible: true, motivoSinClima: null, actual, proximasHoras };
}
