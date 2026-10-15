import request from 'supertest';
import { crearApp } from '../app';
import * as destinoModel from '../models/destinoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import { ESPERA_TRAS_FALLO_MS, ESPERA_TRAS_LIMITE_MS, usarProveedorClima } from '../services/clima/climaService';
import { OpenMeteoProvider } from '../services/clima/openMeteoProvider';
import { ErrorProveedorClima, type FallaClima } from '../services/clima/tipos';
import * as fecha from '../utils/fecha';
import { proveedorFalso } from './climaFalso';
import { destinos, promediosHora } from './fixtures';

jest.mock('../models/destinoModel');
jest.mock('../models/ocupacionModel');

const app = crearApp();
jest.spyOn(fecha, 'ahoraEnColombia').mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });

beforeEach(() => {
  jest.mocked(destinoModel.obtenerVisible).mockImplementation(async (_db, id) => destinos.find((d) => d.id_destino === id) ?? null);
  jest.mocked(ocupacionModel.promedioPorHora).mockImplementation(async (_db, filtros) =>
    promediosHora.filter((p) => filtros.idDestino === undefined || p.id_destino === filtros.idDestino),
  );
});

const PUNTO = [{ latitud: 12.6, longitud: -81.69 }];
const hourly = { time: ['2026-09-30T12:00'], temperature_2m: [29], precipitation_probability: [10], precipitation: [0], weather_code: [1], wind_speed_10m: [15] };
const ok = () => new Response(JSON.stringify({ hourly }), { status: 200 });

/** fetch que nunca responde: solo termina cuando se agota el timeout (abort). */
const sinRespuesta = (_url: string | URL | Request, init?: RequestInit) =>
  new Promise<Response>((_r, rechazar) => init?.signal?.addEventListener('abort', () => rechazar(init.signal?.reason)));

const errorDeRed = () => Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }));

function proveedor(fetchFalso: jest.Mock, extra: Partial<ConstructorParameters<typeof OpenMeteoProvider>[0]> = {}) {
  return new OpenMeteoProvider({ fetch: fetchFalso as unknown as typeof fetch, timeoutMs: 50, esperaReintentoMs: 1, ...extra });
}

async function fallaDe(promesa: Promise<unknown>): Promise<ErrorProveedorClima> {
  const error = await promesa.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorProveedorClima);
  return error as ErrorProveedorClima;
}

describe('OpenMeteoProvider: clasificación de fallas y reintento', () => {
  it('éxito', async () => {
    const f = jest.fn(ok);
    const [serie] = await proveedor(f).pronostico(PUNTO);
    expect(serie?.[0]).toMatchObject({ temperatura: 29, viento: 15 });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^MiSanAndres\//);
  });

  it('timeout: reintenta una vez y luego falla como "timeout"', async () => {
    const f = jest.fn(sinRespuesta);
    const error = await fallaDe(proveedor(f).pronostico(PUNTO));
    expect(error.tipo).toBe('timeout');
    expect(error.message).toContain('sin respuesta en 50 ms');
    expect(error.message).toContain('tras 2 intentos');
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('un timeout seguido de una respuesta correcta se recupera con el reintento', async () => {
    const f = jest.fn().mockImplementationOnce(sinRespuesta).mockImplementationOnce(ok);
    const [serie] = await proveedor(f).pronostico(PUNTO);
    expect(serie).toHaveLength(1);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('error de red: "error_red" con el código del sistema', async () => {
    const f = jest.fn(errorDeRed);
    const error = await fallaDe(proveedor(f, { reintentos: 0 }).pronostico(PUNTO));
    expect(error.tipo).toBe('error_red');
    expect(error.message).toContain('ENOTFOUND');
  });

  it('HTTP 429: "limite_excedido" con el motivo de Open-Meteo y sin reintentar', async () => {
    const f = jest.fn(async () =>
      new Response(JSON.stringify({ error: true, reason: 'Daily API request limit exceeded. Please try again tomorrow.' }), { status: 429 }),
    );
    const error = await fallaDe(proveedor(f).pronostico(PUNTO));
    expect(error).toMatchObject({ tipo: 'limite_excedido', estadoHttp: 429 });
    expect(error.message).toBe('HTTP 429: Daily API request limit exceeded. Please try again tomorrow.');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('HTTP 5xx: "error_http", se reintenta', async () => {
    const f = jest.fn(async () => new Response('Bad Gateway', { status: 502 }));
    const error = await fallaDe(proveedor(f).pronostico(PUNTO));
    expect(error).toMatchObject({ tipo: 'error_http', estadoHttp: 502 });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['no es JSON', () => new Response('<html>', { status: 200 })],
    ['no trae datos por hora', () => new Response(JSON.stringify({ latitude: 12.6 }), { status: 200 })],
    ['trae otra cantidad de puntos', () => new Response(JSON.stringify([{ hourly }, { hourly }]), { status: 200 })],
  ])('respuesta que %s: "respuesta_invalida", sin reintentar', async (_caso, respuesta) => {
    const f = jest.fn(async () => respuesta());
    const error = await fallaDe(proveedor(f).pronostico(PUNTO));
    expect(error.tipo).toBe('respuesta_invalida');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('usa la URL y la clave configuradas', () => {
    const url = new OpenMeteoProvider({ url: 'https://customer-api.open-meteo.com/v1/forecast', apiKey: 'abc' }).construirUrl(PUNTO);
    expect(url.startsWith('https://customer-api.open-meteo.com/v1/forecast?')).toBe(true);
    expect(new URL(url).searchParams.get('apikey')).toBe('abc');
    expect(new URL(new OpenMeteoProvider().construirUrl(PUNTO)).searchParams.has('apikey')).toBe(false);
  });
});

const prediccion = () => request(app).get('/v1/ocupacion/1/prediccion?fecha=2026-09-30&hora=12:30');

describe('motivoSinClima en la API', () => {
  it('con clima responde motivoSinClima null', async () => {
    const res = await prediccion();
    expect(res.body).toMatchObject({ motivoSinClima: null, clima: { temperatura: 29 } });
  });

  it.each<FallaClima>(['timeout', 'error_red', 'limite_excedido', 'error_http', 'respuesta_invalida'])(
    'si el proveedor falla por %s, lo indica (y la predicción sigue)',
    async (tipo) => {
      proveedorFalso.fallar = true;
      proveedorFalso.tipoFalla = tipo;
      const res = await prediccion();
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ estado: 'Abierto', clima: null, motivoSinClima: tipo });

      // El pronóstico del destino y el de la isla dan el mismo motivo (sin volver a llamar).
      const clima = await request(app).get('/v1/clima?horas=2');
      expect(clima.body).toMatchObject({ disponible: false, motivoSinClima: tipo });
      expect(proveedorFalso.llamadas).toHaveLength(1);
    },
  );

  it('sin proveedor configurado responde "no_configurado"', async () => {
    usarProveedorClima(null);
    const res = await prediccion();
    expect(res.body).toMatchObject({ clima: null, motivoSinClima: 'no_configurado' });
    expect((await request(app).get('/v1/clima')).body).toMatchObject({ disponible: false, motivoSinClima: 'no_configurado' });
    expect((await request(app).get('/v1/health')).body.clima).toEqual({
      proveedor: null,
      estado: 'no_configurado',
      ultimaRespuestaOk: null,
      ultimaFalla: null,
    });
  });

  it('fuera del rango del pronóstico responde "fuera_de_rango" sin llamar al proveedor', async () => {
    const res = await request(app).get('/v1/ocupacion/1/prediccion?fecha=2026-12-30&hora=12:30');
    expect(res.body.motivoSinClima).toBe('fuera_de_rango');
    expect(proveedorFalso.llamadas).toHaveLength(0);
  });
});

describe('estado del clima en /v1/health', () => {
  it('muestra la última falla con su motivo y la recuperación', async () => {
    expect((await request(app).get('/v1/health')).body.clima).toMatchObject({ proveedor: 'Falso', estado: 'sin_consultar' });

    proveedorFalso.fallar = true;
    proveedorFalso.tipoFalla = 'limite_excedido';
    await prediccion();
    expect((await request(app).get('/v1/health')).body.clima).toMatchObject({
      estado: 'fallando',
      ultimaFalla: { motivo: 'limite_excedido', mensaje: 'falla simulada (limite_excedido)' },
    });

    // Tras el límite de peticiones espera 5 minutos (no 1) antes de reintentar.
    const ahora = Date.now();
    const reloj = jest.spyOn(Date, 'now').mockReturnValue(ahora + ESPERA_TRAS_FALLO_MS + 1);
    proveedorFalso.fallar = false;
    await prediccion();
    expect(proveedorFalso.llamadas).toHaveLength(1);

    reloj.mockReturnValue(ahora + ESPERA_TRAS_LIMITE_MS + 1);
    const res = await prediccion();
    expect(res.body.motivoSinClima).toBeNull();
    expect((await request(app).get('/v1/health')).body.clima).toMatchObject({ estado: 'ok', ultimaFalla: null });
    reloj.mockRestore();
  });
});
