/**
 * Proveedor de clima Open-Meteo (https://open-meteo.com).
 * - Gratis para uso no comercial y sin clave de API (límite: 10.000 llamadas al día).
 * - Datos con licencia CC BY 4.0: hay que atribuir "Weather data by Open-Meteo.com".
 * - Acepta varias coordenadas en una sola petición, así que un listado de destinos
 *   cuesta una llamada.
 */
import { ZONA_HORARIA } from '../../utils/fecha';
import type { Atribucion, ClimaHora, Coordenada, OpcionesPronostico, ProveedorClima } from './tipos';

const URL_PRONOSTICO = 'https://api.open-meteo.com/v1/forecast';
const VARIABLES = ['temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code', 'wind_speed_10m'];

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

export class ErrorProveedorClima extends Error {
  override name = 'ErrorProveedorClima';
}

export interface OpcionesOpenMeteo {
  /** Tiempo máximo de espera por petición, ms. */
  timeoutMs?: number;
  /** Inyectable para pruebas. */
  fetch?: typeof fetch;
}

export class OpenMeteoProvider implements ProveedorClima {
  readonly nombre = 'Open-Meteo';
  readonly atribucion = ATRIBUCION_OPEN_METEO;
  private readonly timeoutMs: number;
  private readonly fetch: typeof fetch;

  constructor(opciones: OpcionesOpenMeteo = {}) {
    this.timeoutMs = opciones.timeoutMs ?? 4000;
    this.fetch = opciones.fetch ?? globalThis.fetch;
  }

  /** URL de la petición (pública para poder probarla). */
  construirUrl(puntos: Coordenada[], opciones: OpcionesPronostico = {}): string {
    const params = new URLSearchParams({
      latitude: puntos.map((p) => p.latitud.toFixed(4)).join(','),
      longitude: puntos.map((p) => p.longitud.toFixed(4)).join(','),
      hourly: VARIABLES.join(','),
      timezone: ZONA_HORARIA,
      past_days: String(opciones.diasPasados ?? 1),
      forecast_days: String(opciones.diasPronostico ?? 16),
    });
    return `${URL_PRONOSTICO}?${params}`;
  }

  async pronostico(puntos: Coordenada[], opciones?: OpcionesPronostico): Promise<ClimaHora[][]> {
    if (puntos.length === 0) return [];

    let cuerpo: unknown;
    try {
      const respuesta = await this.fetch(this.construirUrl(puntos, opciones), {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: 'application/json' },
      });
      if (!respuesta.ok) throw new ErrorProveedorClima(`Open-Meteo respondió ${respuesta.status}`);
      cuerpo = await respuesta.json();
    } catch (e) {
      if (e instanceof ErrorProveedorClima) throw e;
      throw new ErrorProveedorClima(`Open-Meteo no respondió: ${(e as Error).message}`);
    }

    // Con una sola coordenada responde un objeto; con varias, una lista en el mismo orden.
    const lista = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]) as RespuestaPunto[];
    if (lista.length !== puntos.length) throw new ErrorProveedorClima('Open-Meteo devolvió una cantidad inesperada de puntos');
    return lista.map(aSerie);
  }
}

function aSerie(punto: RespuestaPunto): ClimaHora[] {
  const h = punto.hourly;
  if (!h || !Array.isArray(h.time)) throw new ErrorProveedorClima('Respuesta de Open-Meteo sin datos por hora');
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
