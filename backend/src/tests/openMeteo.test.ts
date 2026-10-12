import { ErrorProveedorClima, OpenMeteoProvider } from '../services/clima/openMeteoProvider';

const hourly = {
  time: ['2026-09-30T00:00', '2026-09-30T01:00'],
  temperature_2m: [28.6, 28.4],
  precipitation_probability: [34, null],
  precipitation: [0, 0.3],
  weather_code: [3, 61],
  wind_speed_10m: [14.1, 15],
};

/** fetch falso: nunca usa la red y guarda la URL pedida. */
function fetchFalso(respuesta: { ok?: boolean; status?: number; cuerpo?: unknown; error?: Error }) {
  const urls: string[] = [];
  const fn = jest.fn(async (url: string | URL | Request) => {
    urls.push(String(url));
    if (respuesta.error) throw respuesta.error;
    return {
      ok: respuesta.ok ?? true,
      status: respuesta.status ?? 200,
      json: async () => respuesta.cuerpo,
    } as Response;
  });
  return { fn: fn as unknown as typeof fetch, urls };
}

describe('OpenMeteoProvider', () => {
  it('pide las variables por hora en hora de Colombia, para varios puntos en una sola URL', () => {
    const url = new URL(
      new OpenMeteoProvider().construirUrl(
        [
          { latitud: 12.6005, longitud: -81.6899 },
          { latitud: 12.4822, longitud: -81.7316 },
        ],
        { diasPasados: 28, diasPronostico: 1 },
      ),
    );
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '12.6005,12.4822',
      longitude: '-81.6899,-81.7316',
      hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',
      timezone: 'America/Bogota',
      past_days: '28',
      forecast_days: '1',
    });
  });

  it('convierte la respuesta de un punto (objeto) a la serie común', async () => {
    const { fn } = fetchFalso({ cuerpo: { hourly } });
    const [serie] = await new OpenMeteoProvider({ fetch: fn }).pronostico([{ latitud: 12.6, longitud: -81.69 }]);
    expect(serie).toEqual([
      { fechaHora: '2026-09-30T00:00', temperatura: 28.6, probLluvia: 34, precipitacion: 0, codigoClima: 3, viento: 14.1 },
      { fechaHora: '2026-09-30T01:00', temperatura: 28.4, probLluvia: null, precipitacion: 0.3, codigoClima: 61, viento: 15 },
    ]);
  });

  it('con varios puntos responde una serie por punto, en orden', async () => {
    const { fn } = fetchFalso({ cuerpo: [{ hourly }, { hourly: { ...hourly, temperature_2m: [30, 31] } }] });
    const series = await new OpenMeteoProvider({ fetch: fn }).pronostico([
      { latitud: 12.6, longitud: -81.69 },
      { latitud: 12.48, longitud: -81.73 },
    ]);
    expect(series.map((s) => s[0]?.temperatura)).toEqual([28.6, 30]);
  });

  it('no llama a la red sin puntos', async () => {
    const { fn } = fetchFalso({ cuerpo: [] });
    expect(await new OpenMeteoProvider({ fetch: fn }).pronostico([])).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it.each([
    ['un error HTTP', { ok: false, status: 429 }],
    ['un timeout o fallo de red', { error: new Error('The operation was aborted due to timeout') }],
    ['una respuesta sin datos por hora', { cuerpo: { error: true, reason: 'x' } }],
    ['una cantidad de puntos distinta', { cuerpo: [{ hourly }, { hourly }] }],
  ])('lanza ErrorProveedorClima ante %s', async (_caso, respuesta) => {
    const { fn } = fetchFalso(respuesta);
    await expect(
      new OpenMeteoProvider({ fetch: fn }).pronostico([{ latitud: 12.6, longitud: -81.69 }]),
    ).rejects.toBeInstanceOf(ErrorProveedorClima);
  });

  it('usa un timeout en la petición', async () => {
    const { fn } = fetchFalso({ cuerpo: { hourly } });
    await new OpenMeteoProvider({ fetch: fn, timeoutMs: 1234 }).pronostico([{ latitud: 12.6, longitud: -81.69 }]);
    const opciones = (fn as unknown as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });
});
