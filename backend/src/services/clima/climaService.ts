/**
 * Clima por hora de San Andrés, con UNA sola serie para toda la isla.
 *
 * San Andrés mide unos 12 km: todos los destinos comparten el pronóstico del centro de la
 * isla. Así el backend hace una sola consulta (un punto, varios días por hora) y la guarda
 * en memoria, compartida por todos los destinos y todas las peticiones (predicción,
 * recomendaciones, favoritos, mapa, detalle y clima de Inicio).
 *
 * - Vigencia: VIGENCIA_CACHE_MS (60 minutos). Con la caché vigente no se llama a nadie.
 * - Consultas simultáneas: si la caché venció y llegan varias peticiones a la vez, sale UNA
 *   sola consulta y las demás esperan su resultado.
 * - Si el proveedor falla (incluido un 429 de Open-Meteo), se sirve el último pronóstico
 *   bueno, aunque esté vencido, hasta MAXIMO_DESACTUALIZADO_MS (24 horas), marcado como
 *   `desactualizado`. Solo sin ningún dato guardado se responde sin clima con el motivo
 *   concreto (timeout, error_red, limite_excedido, error_http, respuesta_invalida).
 * - Tras un fallo no se reintenta enseguida: la espera crece con cada fallo seguido (1, 2, 4…
 *   minutos; desde 5 si fue por límite de peticiones; máximo 30) y respeta Retry-After.
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

export const VIGENCIA_CACHE_MS = 60 * 60 * 1000;
export const MAXIMO_DESACTUALIZADO_MS = 24 * 60 * 60 * 1000;
export const ESPERA_TRAS_FALLO_MS = 60 * 1000;
export const ESPERA_TRAS_LIMITE_MS = 5 * 60 * 1000;
export const ESPERA_MAXIMA_MS = 30 * 60 * 1000;
const DIAS_PASADOS = 1;
const DIAS_PRONOSTICO = 16;
const HORA_MS = 60 * 60 * 1000;

/**
 * Por qué una predicción o un pronóstico no trae clima:
 * fuera_de_rango (fecha fuera del pronóstico), sin_datos (el proveedor no tiene esa hora),
 * no_configurado (clima desactivado) o la falla concreta del proveedor (FallaClima).
 */
export type MotivoSinClima = 'fuera_de_rango' | 'sin_datos' | 'no_configurado' | FallaClima;

export type ResultadoClima =
  | {
      clima: ClimaHora;
      motivo: null;
      /** true si es el último pronóstico bueno guardado porque el proveedor falló. */
      desactualizado: boolean;
      /** Cuándo se obtuvo el pronóstico (ISO). */
      actualizadoEn: string;
    }
  | { clima: null; motivo: MotivoSinClima; desactualizado: false; actualizadoEn: null };

export interface PuntoClima extends Coordenada {
  /** Identifica el punto en la respuesta ("destino:5", "isla"). */
  clave: string;
}

export interface Pronostico {
  disponible: boolean;
  motivoSinClima: MotivoSinClima | null;
  /** true si es el último pronóstico bueno guardado (el proveedor está fallando). */
  desactualizado: boolean;
  /** Cuándo se obtuvo el pronóstico (ISO); null si no hay. */
  actualizadoEn: string | null;
  /** Clima de la hora actual. */
  actual: ClimaHora | null;
  /** Horas siguientes a la actual. */
  proximasHoras: ClimaHora[];
  atribucion: Atribucion;
}

/** Estado del clima para /health (sin datos sensibles: ni URL ni clave). */
export interface EstadoClima {
  proveedor: string | null;
  estado: 'sin_consultar' | 'ok' | 'desactualizado' | 'fallando' | 'no_configurado';
  ultimaRespuestaOk: string | null;
  ultimaFalla: { motivo: FallaClima; mensaje: string; fecha: string } | null;
  /** Consultas al proveedor en la última hora (para comprobar que no se repiten). */
  consultasUltimaHora: number;
  /** Cuándo se puede volver a consultar tras un fallo (ISO), o null. */
  proximoIntento: string | null;
}

export const claveDestino = (idDestino: number) => `destino:${idDestino}`;

/** Centro aproximado de la isla (sector La Loma): el punto del pronóstico de toda la isla. */
export const CENTRO_ISLA: PuntoClima & { nombre: string } = {
  clave: 'isla',
  nombre: 'San Andrés',
  latitud: 12.556,
  longitud: -81.718,
};

interface SerieIsla {
  porHora: Map<string, ClimaHora>;
  ordenada: ClimaHora[];
  /** Date.now() al obtenerla. */
  obtenida: number;
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
let serie: SerieIsla | null = null;
let enCurso: Promise<void> | null = null;
let sinProveedorHasta = 0;
let fallosSeguidos = 0;
let ultimaFalla: EstadoClima['ultimaFalla'] = null;
let ultimaRespuestaOk: string | null = null;
let consultas: number[] = [];

const registrar = (nivel: 'warn' | 'info', mensaje: string) => {
  if (env.NODE_ENV !== 'test') console[nivel](`[clima] ${mensaje}`);
};

if (proveedor instanceof OpenMeteoProvider) {
  registrar(
    'info',
    `Proveedor: ${proveedor.nombre}, una consulta para toda la isla cada ${VIGENCIA_CACHE_MS / 60000} min ` +
      `(timeout ${proveedor.timeoutMs} ms, ${proveedor.reintentos} reintento(s)${env.OPEN_METEO_API_KEY ? ', con clave de API' : ''}).`,
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
  serie = null;
  enCurso = null;
  sinProveedorHasta = 0;
  fallosSeguidos = 0;
  ultimaFalla = null;
  ultimaRespuestaOk = null;
  consultas = [];
}

export const atribucionClima = () => proveedor?.atribucion ?? ATRIBUCION_OPEN_METEO;

export function estadoClima(): EstadoClima {
  const ahora = Date.now();
  consultas = consultas.filter((t) => t > ahora - HORA_MS);
  if (!proveedor) {
    return { proveedor: null, estado: 'no_configurado', ultimaRespuestaOk: null, ultimaFalla: null, consultasUltimaHora: 0, proximoIntento: null };
  }
  const vigente = serie !== null && ahora < serie.obtenida + VIGENCIA_CACHE_MS;
  const usable = serie !== null && ahora < serie.obtenida + MAXIMO_DESACTUALIZADO_MS;
  const estado = vigente ? 'ok' : ultimaFalla ? (usable ? 'desactualizado' : 'fallando') : ultimaRespuestaOk ? 'ok' : 'sin_consultar';
  return {
    proveedor: proveedor.nombre,
    estado,
    ultimaRespuestaOk,
    ultimaFalla,
    consultasUltimaHora: consultas.length,
    proximoIntento: ahora < sinProveedorHasta ? new Date(sinProveedorHasta).toISOString() : null,
  };
}

/** Espera antes de volver a consultar tras `fallos` fallos seguidos: crece al doble, con tope. */
export function esperaTrasFallo(error: ErrorProveedorClima, fallos: number): number {
  const base = error.tipo === 'limite_excedido' ? ESPERA_TRAS_LIMITE_MS : ESPERA_TRAS_FALLO_MS;
  const creciente = Math.min(base * 2 ** Math.max(0, fallos - 1), ESPERA_MAXIMA_MS);
  return Math.max(creciente, error.reintentarEnMs ?? 0);
}

/** UNA consulta al proveedor para toda la isla; las peticiones simultáneas comparten la misma. */
function refrescar(actual: ProveedorClima): Promise<void> {
  if (enCurso) return enCurso;
  consultas.push(Date.now());
  enCurso = (async () => {
    try {
      const [ordenada = []] = await actual.pronostico([CENTRO_ISLA], { diasPasados: DIAS_PASADOS, diasPronostico: DIAS_PRONOSTICO });
      serie = { ordenada, porHora: new Map(ordenada.map((c) => [c.fechaHora, c])), obtenida: Date.now() };
      if (ultimaFalla) registrar('info', `${actual.nombre} responde de nuevo.`);
      ultimaFalla = null;
      fallosSeguidos = 0;
      sinProveedorHasta = 0;
      ultimaRespuestaOk = new Date().toISOString();
    } catch (e) {
      const error = e instanceof ErrorProveedorClima ? e : new ErrorProveedorClima('error_red', (e as Error).message);
      fallosSeguidos += 1;
      const espera = esperaTrasFallo(error, fallosSeguidos);
      sinProveedorHasta = Date.now() + espera;
      ultimaFalla = { motivo: error.tipo, mensaje: error.message, fecha: new Date().toISOString() };
      const respaldo = serie && Date.now() < serie.obtenida + MAXIMO_DESACTUALIZADO_MS ? 'se usa el último pronóstico guardado' : 'sin clima';
      registrar('warn', `${actual.nombre} falló (${error.tipo}): ${error.message}. Próximo intento en ${Math.round(espera / 1000)} s; ${respaldo}.`);
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

/** Serie de la isla: la vigente, una nueva o, si el proveedor falla, la última buena (≤ 24 h). */
async function serieIsla(actual: ProveedorClima): Promise<{ serie: SerieIsla; desactualizado: boolean } | null> {
  const vigente = () => serie !== null && Date.now() < serie.obtenida + VIGENCIA_CACHE_MS;
  if (!vigente() && (enCurso || Date.now() >= sinProveedorHasta)) await refrescar(actual);
  if (!serie) return null;
  if (vigente()) return { serie, desactualizado: false };
  if (Date.now() < serie.obtenida + MAXIMO_DESACTUALIZADO_MS) return { serie, desactualizado: true };
  return null;
}

/** Motivo cuando no hay serie: la última falla del proveedor. */
const motivoDeFalla = (): FallaClima => ultimaFalla?.motivo ?? 'error_red';

/** "2026-10-12" + "14:30" → "2026-10-12T14:00" (clave horaria del proveedor). */
const claveHora = (fecha: string, hora: string) => `${fecha}T${String(horaEntera(hora)).padStart(2, '0')}:00`;

function dentroDelRango(fecha: string): boolean {
  const hoy = ahoraEnColombia().fecha;
  return fecha >= sumarDias(hoy, -DIAS_PASADOS) && fecha <= sumarDias(hoy, DIAS_PRONOSTICO - 1);
}

const tieneDatos = (c: ClimaHora) =>
  [c.temperatura, c.probLluvia, c.precipitacion, c.codigoClima, c.viento].some((v) => v !== null);

const sinClima = (motivo: MotivoSinClima): ResultadoClima => ({ clima: null, motivo, desactualizado: false, actualizadoEn: null });

/**
 * Clima de cada punto en una fecha y hora (HH:MM) de Colombia. Todos los puntos reciben el
 * clima de la isla: una sola serie, sin consultas por destino.
 */
export async function climaEnHora(
  puntos: PuntoClima[],
  fecha: string,
  hora: string,
): Promise<Map<string, ResultadoClima>> {
  const resultado = new Map<string, ResultadoClima>();
  if (puntos.length === 0) return resultado;
  const paraTodos = (r: ResultadoClima) => {
    for (const p of puntos) resultado.set(p.clave, r);
    return resultado;
  };
  if (!proveedor) return paraTodos(sinClima('no_configurado'));
  if (!dentroDelRango(fecha)) return paraTodos(sinClima('fuera_de_rango'));

  const isla = await serieIsla(proveedor);
  if (!isla) return paraTodos(sinClima(motivoDeFalla()));
  const clima = isla.serie.porHora.get(claveHora(fecha, hora));
  if (!clima) return paraTodos(sinClima('fuera_de_rango'));
  if (!tieneDatos(clima)) return paraTodos(sinClima('sin_datos'));
  return paraTodos({ clima, motivo: null, desactualizado: isla.desactualizado, actualizadoEn: new Date(isla.serie.obtenida).toISOString() });
}

/** Clima del centro de la isla (resumen de Inicio). */
export async function pronosticoIsla(horas: number) {
  return { lugar: CENTRO_ISLA.nombre, ...(await pronosticoDesdeAhora(CENTRO_ISLA, horas)) };
}

/** Clima de la hora actual y de las `horas` siguientes. El punto solo importa para la respuesta: se usa la serie de la isla. */
export async function pronosticoDesdeAhora(_punto: PuntoClima, horas: number): Promise<Pronostico> {
  const base = { atribucion: atribucionClima() };
  const vacio = (motivoSinClima: MotivoSinClima): Pronostico => ({
    ...base,
    disponible: false,
    motivoSinClima,
    desactualizado: false,
    actualizadoEn: null,
    actual: null,
    proximasHoras: [],
  });
  if (!proveedor) return vacio('no_configurado');

  const { fecha, hora } = ahoraEnColombia();
  const isla = await serieIsla(proveedor);
  if (!isla) return vacio(motivoDeFalla());

  const ahora = claveHora(fecha, hora);
  const actual = isla.serie.porHora.get(ahora) ?? null;
  const proximasHoras = isla.serie.ordenada.filter((c) => c.fechaHora > ahora).slice(0, horas);
  if (!actual && proximasHoras.length === 0) return vacio('sin_datos');
  return {
    ...base,
    disponible: true,
    motivoSinClima: null,
    desactualizado: isla.desactualizado,
    actualizadoEn: new Date(isla.serie.obtenida).toISOString(),
    actual,
    proximasHoras,
  };
}
