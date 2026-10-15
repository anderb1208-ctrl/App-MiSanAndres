/**
 * Clima por hora para los destinos, con caché en memoria.
 *
 * - Cada punto (destino o centro de la isla) se guarda 30 minutos; los que faltan se
 *   piden juntos en una sola llamada al proveedor.
 * - Si el proveedor falla, no se vuelve a intentar durante un rato (1 minuto; 5 si fue por
 *   límite de peticiones), así una caída no hace esperar el timeout en cada consulta, y se
 *   responde sin clima indicando el motivo concreto (timeout, error_red, limite_excedido,
 *   error_http, respuesta_invalida). Cada falla y la recuperación se registran en el log.
 * - Fuera del rango del pronóstico (ayer a hoy + 15 días) no se consulta al proveedor.
 * - Con CLIMA_PROVEEDOR=ninguno no hay proveedor y el motivo es "no_configurado".
 *
 * Nada de esto conoce a Open-Meteo: el proveedor se cambia con `usarProveedorClima`.
 */
import { env } from '../../config/env';
import { ahoraEnColombia, horaEntera } from '../../utils/fecha';
import { sumarDias } from '../calendarioService';
import { ATRIBUCION_OPEN_METEO, OpenMeteoProvider } from './openMeteoProvider';
import { type Atribucion, type ClimaHora, type Coordenada, ErrorProveedorClima, type FallaClima, type ProveedorClima } from './tipos';

export const VIGENCIA_CACHE_MS = 30 * 60 * 1000;
export const ESPERA_TRAS_FALLO_MS = 60 * 1000;
export const ESPERA_TRAS_LIMITE_MS = 5 * 60 * 1000;
const DIAS_PASADOS = 1;
const DIAS_PRONOSTICO = 16;

/**
 * Por qué una predicción o un pronóstico no trae clima:
 * fuera_de_rango (fecha fuera del pronóstico), sin_datos (el proveedor no tiene esa hora),
 * no_configurado (clima desactivado) o la falla concreta del proveedor (FallaClima).
 */
export type MotivoSinClima = 'fuera_de_rango' | 'sin_datos' | 'no_configurado' | FallaClima;

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

/** Estado del clima para /health (sin datos sensibles: ni URL ni clave). */
export interface EstadoClima {
  proveedor: string | null;
  estado: 'sin_consultar' | 'ok' | 'fallando' | 'no_configurado';
  ultimaRespuestaOk: string | null;
  ultimaFalla: { motivo: FallaClima; mensaje: string; fecha: string } | null;
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

/** Proveedor según la configuración (null = clima desactivado). */
export function crearProveedorClima(): ProveedorClima | null {
  if (env.CLIMA_PROVEEDOR === 'ninguno') return null;
  return new OpenMeteoProvider({
    url: env.OPEN_METEO_URL,
    apiKey: env.OPEN_METEO_API_KEY,
    timeoutMs: env.CLIMA_TIMEOUT_MS,
    reintentos: env.CLIMA_REINTENTOS,
  });
}

let proveedor: ProveedorClima | null = crearProveedorClima();
const cache = new Map<string, EntradaCache>();
const enCurso = new Map<string, Promise<void>>();
let sinProveedorHasta = 0;
let ultimaFalla: EstadoClima['ultimaFalla'] = null;
let ultimaRespuestaOk: string | null = null;

const registrar = (nivel: 'warn' | 'info', mensaje: string) => {
  if (env.NODE_ENV !== 'test') console[nivel](`[clima] ${mensaje}`);
};

if (proveedor instanceof OpenMeteoProvider) {
  registrar(
    'info',
    `Proveedor: ${proveedor.nombre} (timeout ${proveedor.timeoutMs} ms, ${proveedor.reintentos} reintento(s)${env.OPEN_METEO_API_KEY ? ', con clave de API' : ''}).`,
  );
} else if (!proveedor) {
  registrar('warn', 'Clima desactivado (CLIMA_PROVEEDOR=ninguno).');
}

/** Cambia el proveedor (otro servicio, uno falso en las pruebas, o null para desactivarlo) y vacía la caché. */
export function usarProveedorClima(nuevo: ProveedorClima | null) {
  proveedor = nuevo;
  limpiarCacheClima();
}

export function limpiarCacheClima() {
  cache.clear();
  enCurso.clear();
  sinProveedorHasta = 0;
  ultimaFalla = null;
  ultimaRespuestaOk = null;
}

export const atribucionClima = () => proveedor?.atribucion ?? ATRIBUCION_OPEN_METEO;

export function estadoClima(): EstadoClima {
  if (!proveedor) return { proveedor: null, estado: 'no_configurado', ultimaRespuestaOk: null, ultimaFalla: null };
  const estado = ultimaFalla && Date.now() < sinProveedorHasta ? 'fallando' : ultimaRespuestaOk ? 'ok' : ultimaFalla ? 'fallando' : 'sin_consultar';
  return { proveedor: proveedor.nombre, estado, ultimaRespuestaOk, ultimaFalla };
}

/** "2026-10-12" + "14:30" → "2026-10-12T14:00" (clave horaria del proveedor). */
const claveHora = (fecha: string, hora: string) => `${fecha}T${String(horaEntera(hora)).padStart(2, '0')}:00`;

function dentroDelRango(fecha: string): boolean {
  const hoy = ahoraEnColombia().fecha;
  return fecha >= sumarDias(hoy, -DIAS_PASADOS) && fecha <= sumarDias(hoy, DIAS_PRONOSTICO - 1);
}

async function pedir(actual: ProveedorClima, puntos: PuntoClima[]): Promise<void> {
  const clave = puntos.map((p) => p.clave).sort().join('|');
  const pendiente = enCurso.get(clave);
  if (pendiente) return pendiente;

  const peticion = (async () => {
    try {
      const series = await actual.pronostico(puntos, { diasPasados: DIAS_PASADOS, diasPronostico: DIAS_PRONOSTICO });
      const vence = Date.now() + VIGENCIA_CACHE_MS;
      puntos.forEach((p, i) => {
        const ordenada = series[i] ?? [];
        cache.set(p.clave, { ordenada, porHora: new Map(ordenada.map((c) => [c.fechaHora, c])), vence });
      });
      if (ultimaFalla) registrar('info', `${actual.nombre} responde de nuevo.`);
      ultimaFalla = null;
      ultimaRespuestaOk = new Date().toISOString();
    } catch (e) {
      const error = e instanceof ErrorProveedorClima ? e : new ErrorProveedorClima('error_red', (e as Error).message);
      const espera = error.tipo === 'limite_excedido' ? ESPERA_TRAS_LIMITE_MS : ESPERA_TRAS_FALLO_MS;
      sinProveedorHasta = Date.now() + espera;
      ultimaFalla = { motivo: error.tipo, mensaje: error.message, fecha: new Date().toISOString() };
      registrar('warn', `${actual.nombre} falló (${error.tipo}): ${error.message}. Sin clima durante ${espera / 1000} s.`);
    } finally {
      enCurso.delete(clave);
    }
  })();
  enCurso.set(clave, peticion);
  return peticion;
}

/** Series vigentes de los puntos; las que faltan se piden juntas. Las que no se pudieron obtener no aparecen. */
async function seriesDe(actual: ProveedorClima, puntos: PuntoClima[]): Promise<Map<string, EntradaCache>> {
  const ahora = Date.now();
  const faltan = puntos.filter((p) => !((cache.get(p.clave)?.vence ?? 0) > ahora));
  if (faltan.length > 0 && ahora >= sinProveedorHasta) await pedir(actual, faltan);

  const resultado = new Map<string, EntradaCache>();
  for (const p of puntos) {
    const entrada = cache.get(p.clave);
    if (entrada) resultado.set(p.clave, entrada);
  }
  return resultado;
}

/** Motivo cuando un punto se quedó sin serie: la última falla del proveedor. */
const motivoDeFalla = (): FallaClima => ultimaFalla?.motivo ?? 'error_red';

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
  const todos = (motivo: MotivoSinClima) => {
    for (const p of puntos) resultado.set(p.clave, { clima: null, motivo });
    return resultado;
  };
  if (!proveedor) return todos('no_configurado');
  if (!dentroDelRango(fecha)) return todos('fuera_de_rango');

  const series = await seriesDe(proveedor, puntos);
  const buscada = claveHora(fecha, hora);
  for (const p of puntos) {
    const serie = series.get(p.clave);
    const clima = serie?.porHora.get(buscada);
    if (!serie) resultado.set(p.clave, { clima: null, motivo: motivoDeFalla() });
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
  const base = { atribucion: atribucionClima() };
  const sinClima = (motivoSinClima: MotivoSinClima): Pronostico => ({
    ...base,
    disponible: false,
    motivoSinClima,
    actual: null,
    proximasHoras: [],
  });
  if (!proveedor) return sinClima('no_configurado');

  const { fecha, hora } = ahoraEnColombia();
  const serie = (await seriesDe(proveedor, [punto])).get(punto.clave);
  if (!serie) return sinClima(motivoDeFalla());

  const ahora = claveHora(fecha, hora);
  const actual = serie.porHora.get(ahora) ?? null;
  const proximasHoras = serie.ordenada.filter((c) => c.fechaHora > ahora).slice(0, horas);
  if (!actual && proximasHoras.length === 0) return sinClima('sin_datos');
  return { ...base, disponible: true, motivoSinClima: null, actual, proximasHoras };
}
