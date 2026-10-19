/**
 * Proveedor de clima Open-Meteo (https://open-meteo.com).
 * - Gratis para uso no comercial y sin clave de API. Sus límites son por IP (600 llamadas
 *   por minuto, 5.000 por hora, 10.000 por día): en un hosting con IP compartida, como el
 *   plan gratuito de Render, otros servicios pueden agotarlos y Open-Meteo responde 429.
 *   Con una clave de su API comercial (OPEN_METEO_API_KEY + OPEN_METEO_URL) no aplica.
 * - Datos con licencia CC BY 4.0: hay que atribuir "Weather data by Open-Meteo.com".
 * - Acepta varias coordenadas en una sola petición, así que un listado de destinos
 *   cuesta una llamada.
 *
 * Cada falla se clasifica (timeout, error_red, limite_excedido, error_http,
 * respuesta_invalida). Las transitorias (timeout, red, HTTP 5xx) se reintentan con espera
 * creciente (esperaReintentoMs × 2^intento). Un 429 se reintenta solo si trae Retry-After
 * corto (≤ MAX_RETRY_AFTER_EN_PETICION_MS); si pide más, el error lleva `reintentarEnMs`
 * y climaService espera eso antes de volver a consultar.
 *
 * Identificación: cada petición manda un User-Agent con el nombre de la app y el repositorio
 * (Open-Meteo pide uso no comercial, sin abuso, y atribución CC BY 4.0).
 */
import { ZONA_HORARIA } from '../../utils/fecha';
import {
  type Atribucion,
  type ClimaHora,
  type Coordenada,
  ErrorProveedorClima,
  type OpcionesPronostico,
  type ProveedorClima,
} from './tipos';

export { ErrorProveedorClima } from './tipos';

export const URL_OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const VARIABLES = ['temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code', 'wind_speed_10m'];
export const USER_AGENT =
  'MiSanAndres/1.1 (backend de una app de turismo de San Andres, proyecto academico no comercial; +https://github.com/anderb1208-ctrl/App-MiSanAndres)';
/** Un Retry-After más largo que esto no se espera dentro de la petición del usuario. */
export const MAX_RETRY_AFTER_EN_PETICION_MS = 3000;

export const ATRIBUCION_OPEN_METEO: Atribucion = {
  texto: 'Weather data by Open-Meteo.com',
  url: 'https://open-meteo.com/',
  licencia: 'CC BY 4.0',
  urlLicencia: 'https://creativecommons.org/licenses/by/4.0/',
};

interface RespuestaPunto {
  hourly?: {
    time: string[];
    temperature_2m?: (number | null)[];
    precipitation_probability?: (number | null)[];
    precipitation?: (number | null)[];
    weather_code?: (number | null)[];
    wind_speed_10m?: (number | null)[];
  };
}

export interface OpcionesOpenMeteo {
  /** URL del endpoint de pronóstico (por defecto la API gratuita). */
  url?: string;
  /** Clave de la API comercial de Open-Meteo (opcional). Nunca se registra. */
  apiKey?: string;
  /** Tiempo máximo de espera por intento, ms. */
  timeoutMs?: number;
  /** Reintentos ante fallas transitorias (timeout, red, HTTP 5xx). */
  reintentos?: number;
  /** Pausa antes de reintentar, ms. */
  esperaReintentoMs?: number;
  /** Inyectable para pruebas. */
  fetch?: typeof fetch;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Las fallas que pueden resolverse solas al reintentar (un 429 solo si pide esperar poco). */
const esTransitoria = (e: ErrorProveedorClima) =>
  e.tipo === 'timeout' ||
  e.tipo === 'error_red' ||
  (e.tipo === 'error_http' && (e.estadoHttp ?? 0) >= 500) ||
  (e.tipo === 'limite_excedido' && e.reintentarEnMs !== undefined && e.reintentarEnMs <= MAX_RETRY_AFTER_EN_PETICION_MS);

/** Cabecera Retry-After en ms: segundos ("120") o fecha HTTP. undefined si no viene o no se entiende. */
export function leerRetryAfter(valor: string | null | undefined, ahora = Date.now()): number | undefined {
  if (!valor) return undefined;
  const texto = valor.trim();
  if (/^\d+$/.test(texto)) return Number(texto) * 1000;
  const fecha = Date.parse(texto);
  return Number.isNaN(fecha) ? undefined : Math.max(0, fecha - ahora);
}

/** Clasifica un error lanzado por fetch (antes de recibir respuesta). */
function errorDeConexion(e: unknown, timeoutMs: number): ErrorProveedorClima {
  const error = e as Error & { cause?: { code?: string; message?: string } };
  const codigo = error.cause?.code;
  if (error.name === 'TimeoutError' || error.name === 'AbortError' || codigo === 'UND_ERR_CONNECT_TIMEOUT' || codigo === 'ETIMEDOUT') {
    return new ErrorProveedorClima('timeout', `sin respuesta en ${timeoutMs} ms`);
  }
  return new ErrorProveedorClima('error_red', `error de red: ${codigo ?? error.cause?.message ?? error.message}`);
}

/** Motivo que Open-Meteo explica en el cuerpo de sus errores ({"error": true, "reason": "..."}). */
async function motivoDelCuerpo(respuesta: Response): Promise<string> {
  const texto = await respuesta.text().catch(() => '');
  try {
    const reason = (JSON.parse(texto) as { reason?: unknown }).reason;
    if (typeof reason === 'string') return reason.slice(0, 200);
  } catch {
    // No era JSON: se usa el texto tal cual (recortado).
  }
  return texto.replace(/\s+/g, ' ').slice(0, 200);
}

export class OpenMeteoProvider implements ProveedorClima {
  readonly nombre = 'Open-Meteo';
  readonly atribucion = ATRIBUCION_OPEN_METEO;
  readonly timeoutMs: number;
  readonly reintentos: number;
  private readonly url: string;
  private readonly apiKey: string | undefined;
  private readonly esperaReintentoMs: number;
  private readonly fetch: typeof fetch;

  constructor(opciones: OpcionesOpenMeteo = {}) {
    this.url = opciones.url ?? URL_OPEN_METEO;
    this.apiKey = opciones.apiKey;
    this.timeoutMs = opciones.timeoutMs ?? 6000;
    this.reintentos = opciones.reintentos ?? 1;
    this.esperaReintentoMs = opciones.esperaReintentoMs ?? 500;
    this.fetch = opciones.fetch ?? globalThis.fetch;
  }

  /** URL de la petición (pública para poder probarla). Incluye la clave si hay: no registrarla. */
  construirUrl(puntos: Coordenada[], opciones: OpcionesPronostico = {}): string {
    const params = new URLSearchParams({
      latitude: puntos.map((p) => p.latitud.toFixed(4)).join(','),
      longitude: puntos.map((p) => p.longitud.toFixed(4)).join(','),
      hourly: VARIABLES.join(','),
      timezone: ZONA_HORARIA,
      past_days: String(opciones.diasPasados ?? 1),
      forecast_days: String(opciones.diasPronostico ?? 16),
    });
    if (this.apiKey) params.set('apikey', this.apiKey);
    return `${this.url}?${params}`;
  }

  async pronostico(puntos: Coordenada[], opciones?: OpcionesPronostico): Promise<ClimaHora[][]> {
    if (puntos.length === 0) return [];
    for (let intento = 0; ; intento++) {
      try {
        return await this.intentar(puntos, opciones);
      } catch (e) {
        const error = e instanceof ErrorProveedorClima ? e : new ErrorProveedorClima('respuesta_invalida', (e as Error).message);
        if (intento >= this.reintentos || !esTransitoria(error)) {
          if (intento > 0) error.message += ` (tras ${intento + 1} intentos)`;
          throw error;
        }
        // Espera creciente; si el proveedor dijo cuánto esperar (Retry-After), se respeta.
        await esperar(Math.max(this.esperaReintentoMs * 2 ** intento, error.reintentarEnMs ?? 0));
      }
    }
  }

  private async intentar(puntos: Coordenada[], opciones?: OpcionesPronostico): Promise<ClimaHora[][]> {
    let respuesta: Response;
    try {
      respuesta = await this.fetch(this.construirUrl(puntos, opciones), {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      });
    } catch (e) {
      throw errorDeConexion(e, this.timeoutMs);
    }

    if (!respuesta.ok) {
      const motivo = await motivoDelCuerpo(respuesta);
      const tipo = respuesta.status === 429 ? 'limite_excedido' : 'error_http';
      const reintentarEn = leerRetryAfter(respuesta.headers?.get('retry-after'));
      throw new ErrorProveedorClima(tipo, `HTTP ${respuesta.status}${motivo ? `: ${motivo}` : ''}`, respuesta.status, reintentarEn);
    }

    let cuerpo: unknown;
    try {
      cuerpo = await respuesta.json();
    } catch (e) {
      if ((e as Error).name === 'TimeoutError' || (e as Error).name === 'AbortError') throw errorDeConexion(e, this.timeoutMs);
      throw new ErrorProveedorClima('respuesta_invalida', 'la respuesta no es JSON válido');
    }

    // Con una sola coordenada responde un objeto; con varias, una lista en el mismo orden.
    const lista = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]) as RespuestaPunto[];
    if (lista.length !== puntos.length) {
      throw new ErrorProveedorClima('respuesta_invalida', `devolvió ${lista.length} puntos y se pidieron ${puntos.length}`);
    }
    return lista.map(aSerie);
  }
}

function aSerie(punto: RespuestaPunto): ClimaHora[] {
  const h = punto?.hourly;
  if (!h || !Array.isArray(h.time)) throw new ErrorProveedorClima('respuesta_invalida', 'respuesta sin datos por hora');
  const valor = (serie: (number | null)[] | undefined, i: number) => serie?.[i] ?? null;
  return h.time.map((fechaHora, i) => ({
    fechaHora,
    temperatura: valor(h.temperature_2m, i),
    probLluvia: valor(h.precipitation_probability, i),
    precipitacion: valor(h.precipitation, i),
    codigoClima: valor(h.weather_code, i),
    viento: valor(h.wind_speed_10m, i),
  }));
}
