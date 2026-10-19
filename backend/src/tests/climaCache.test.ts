/**
 * Caché del clima de la isla: una sola consulta compartida, vigencia de 60 minutos, último
 * pronóstico bueno si el proveedor falla (hasta 24 h), espera creciente con Retry-After y
 * consultas simultáneas fusionadas.
 */
import request from 'supertest';
import { crearApp } from '../app';
import * as destinoModel from '../models/destinoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import {
  ESPERA_MAXIMA_MS,
  ESPERA_TRAS_FALLO_MS,
  ESPERA_TRAS_LIMITE_MS,
  MAXIMO_DESACTUALIZADO_MS,
  VIGENCIA_CACHE_MS,
  esperaTrasFallo,
} from '../services/clima/climaService';
import { leerRetryAfter, OpenMeteoProvider } from '../services/clima/openMeteoProvider';
import { ErrorProveedorClima } from '../services/clima/tipos';
import * as fecha from '../utils/fecha';
import { proveedorFalso } from './climaFalso';
import { destinos, promediosHora } from './fixtures';

jest.mock('../models/destinoModel');
jest.mock('../models/ocupacionModel');

const app = crearApp();
jest.spyOn(fecha, 'ahoraEnColombia').mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });

let t = Date.parse('2026-09-30T17:30:00Z');
let reloj: jest.SpyInstance<number, []>;
beforeEach(() => {
  t = Date.parse('2026-09-30T17:30:00Z');
  reloj = jest.spyOn(Date, 'now').mockImplementation(() => t);
  jest.mocked(destinoModel.obtenerVisible).mockImplementation(async (_db, id) => destinos.find((d) => d.id_destino === id) ?? null);
  jest.mocked(destinoModel.listarVisibles).mockResolvedValue(destinos);
  jest.mocked(ocupacionModel.promedioPorHora).mockImplementation(async (_db, filtros) =>
    promediosHora.filter((p) => filtros.idDestino === undefined || p.id_destino === filtros.idDestino),
  );
});
afterEach(() => reloj.mockRestore());

const prediccion = (id = 1) => request(app).get(`/v1/ocupacion/${id}/prediccion?fecha=2026-09-30&hora=12:30`);
const salud = async () => (await request(app).get('/v1/health')).body.clima;

describe('caché del clima de la isla', () => {
  it('con la caché vigente, todas las rutas y destinos comparten UNA consulta', async () => {
    await prediccion(1);
    await prediccion(3);
    await request(app).get('/v1/destinos');
    await request(app).get('/v1/mapa');
    await request(app).get('/v1/clima');
    t += VIGENCIA_CACHE_MS - 1000;
    const res = await prediccion(6);
    expect(res.body).toMatchObject({ clima: { temperatura: 29 }, climaDesactualizado: false, motivoSinClima: null });
    expect(proveedorFalso.llamadas).toHaveLength(1);
    expect(await salud()).toMatchObject({ estado: 'ok', consultasUltimaHora: 1 });
  });

  it('caché vencida y proveedor caído: sirve el último pronóstico bueno marcado como desactualizado', async () => {
    const primera = await prediccion();
    t += VIGENCIA_CACHE_MS + 1;
    proveedorFalso.fallar = true;
    proveedorFalso.tipoFalla = 'timeout';

    const res = await prediccion();
    expect(res.body).toMatchObject({
      clima: { temperatura: 29 },
      motivoSinClima: null,
      climaDesactualizado: true,
      climaActualizadoEn: primera.body.climaActualizadoEn,
    });
    const isla = await request(app).get('/v1/clima');
    expect(isla.body).toMatchObject({ disponible: true, desactualizado: true });
    expect(await salud()).toMatchObject({ estado: 'desactualizado', ultimaFalla: { motivo: 'timeout' } });
    expect(proveedorFalso.llamadas).toHaveLength(2); // la segunda petición no vuelve a intentar enseguida
  });

  it('el pronóstico guardado se usa como máximo 24 horas', async () => {
    await prediccion();
    proveedorFalso.fallar = true;
    proveedorFalso.tipoFalla = 'error_red';
    t += MAXIMO_DESACTUALIZADO_MS + 1;
    const res = await prediccion();
    expect(res.body).toMatchObject({ clima: null, motivoSinClima: 'error_red', climaDesactualizado: false });
  });

  it('429: espera creciente antes de reintentar y respeta Retry-After', async () => {
    proveedorFalso.fallar = true;
    proveedorFalso.tipoFalla = 'limite_excedido';
    let res = await prediccion();
    expect(res.body).toMatchObject({ clima: null, motivoSinClima: 'limite_excedido' });

    // Antes de 5 minutos no vuelve a consultar.
    t += ESPERA_TRAS_LIMITE_MS - 1000;
    await prediccion();
    expect(proveedorFalso.llamadas).toHaveLength(1);

    // A los 5 minutos reintenta; falla otra vez y la espera se duplica (10 minutos).
    t += 2000;
    await prediccion();
    expect(proveedorFalso.llamadas).toHaveLength(2);
    t += 2 * ESPERA_TRAS_LIMITE_MS - 1000;
    await prediccion();
    expect(proveedorFalso.llamadas).toHaveLength(2);

    // Retry-After de 20 minutos: se espera eso aunque la espera creciente sea menor.
    t += 2000;
    proveedorFalso.reintentarEnMs = 20 * 60 * 1000;
    await prediccion();
    expect(proveedorFalso.llamadas).toHaveLength(3);
    t += 19 * 60 * 1000;
    await prediccion();
    expect(proveedorFalso.llamadas).toHaveLength(3);

    // Pasado el Retry-After, responde y el clima vuelve.
    t += 2 * 60 * 1000;
    proveedorFalso.fallar = false;
    res = await prediccion();
    expect(proveedorFalso.llamadas).toHaveLength(4);
    expect(res.body).toMatchObject({ clima: { temperatura: 29 }, climaDesactualizado: false });
    expect(await salud()).toMatchObject({ estado: 'ok', ultimaFalla: null, proximoIntento: null });
  });

  it('consultas simultáneas con la caché vencida se fusionan en una sola', async () => {
    proveedorFalso.retrasoMs = 30;
    const respuestas = await Promise.all([prediccion(1), prediccion(3), prediccion(6), request(app).get('/v1/clima'), request(app).get('/v1/mapa')]);
    expect(proveedorFalso.llamadas).toHaveLength(1);
    expect(respuestas.slice(0, 3).every((r) => r.body.clima?.temperatura === 29)).toBe(true);

    t += VIGENCIA_CACHE_MS + 1;
    await Promise.all([prediccion(1), prediccion(3), request(app).get('/v1/destinos')]);
    expect(proveedorFalso.llamadas).toHaveLength(2);
  });

  it('sin datos guardados y con el proveedor caído, clima null con el motivo concreto', async () => {
    proveedorFalso.fallar = true;
    proveedorFalso.tipoFalla = 'respuesta_invalida';
    const res = await prediccion();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'Abierto', clima: null, motivoSinClima: 'respuesta_invalida', climaDesactualizado: false, climaActualizadoEn: null });
    expect((await request(app).get('/v1/clima')).body).toMatchObject({ disponible: false, motivoSinClima: 'respuesta_invalida' });
    expect(await salud()).toMatchObject({ estado: 'fallando' });
  });
});

describe('espera tras un fallo', () => {
  it('crece al doble con cada fallo seguido, con tope, y Retry-After manda si es mayor', () => {
    const red = new ErrorProveedorClima('error_red', 'x');
    expect([1, 2, 3].map((n) => esperaTrasFallo(red, n))).toEqual([ESPERA_TRAS_FALLO_MS, 2 * ESPERA_TRAS_FALLO_MS, 4 * ESPERA_TRAS_FALLO_MS]);
    expect(esperaTrasFallo(red, 20)).toBe(ESPERA_MAXIMA_MS);
    const limite = new ErrorProveedorClima('limite_excedido', 'x', 429, 60 * 60 * 1000);
    expect(esperaTrasFallo(limite, 1)).toBe(60 * 60 * 1000);
  });
});

describe('OpenMeteoProvider con 429', () => {
  const hourly = { time: ['2026-09-30T12:00'], temperature_2m: [29], precipitation_probability: [10], precipitation: [0], weather_code: [1], wind_speed_10m: [15] };
  const limite = (retryAfter?: string) =>
    new Response(JSON.stringify({ error: true, reason: 'Minutely API request limit exceeded' }), {
      status: 429,
      headers: retryAfter ? { 'Retry-After': retryAfter } : {},
    });
  const proveedor = (f: jest.Mock) =>
    new OpenMeteoProvider({ fetch: f as unknown as typeof fetch, timeoutMs: 50, esperaReintentoMs: 1, reintentos: 1 });

  it('con Retry-After corto espera lo pedido y reintenta', async () => {
    const f = jest.fn().mockResolvedValueOnce(limite('0')).mockResolvedValueOnce(new Response(JSON.stringify({ hourly }), { status: 200 }));
    const [serie] = await proveedor(f).pronostico([{ latitud: 12.5, longitud: -81.7 }]);
    expect(serie?.[0]?.temperatura).toBe(29);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('con Retry-After largo no espera dentro de la petición: devuelve cuánto esperar', async () => {
    const f = jest.fn().mockResolvedValue(limite('120'));
    const error = await proveedor(f).pronostico([{ latitud: 12.5, longitud: -81.7 }]).catch((e: unknown) => e);
    expect(error).toMatchObject({ tipo: 'limite_excedido', estadoHttp: 429, reintentarEnMs: 120_000 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('lee Retry-After en segundos o como fecha HTTP', () => {
    const ahora = Date.parse('2026-09-30T17:30:00Z');
    expect(leerRetryAfter('30', ahora)).toBe(30_000);
    expect(leerRetryAfter('Wed, 30 Sep 2026 17:31:00 GMT', ahora)).toBe(60_000);
    expect(leerRetryAfter('mañana', ahora)).toBeUndefined();
    expect(leerRetryAfter(null, ahora)).toBeUndefined();
  });

  it('se identifica con un User-Agent con el nombre de la app y su repositorio', async () => {
    const f = jest.fn().mockResolvedValue(new Response(JSON.stringify({ hourly }), { status: 200 }));
    await proveedor(f).pronostico([{ latitud: 12.5, longitud: -81.7 }]);
    const [, init] = f.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^MiSanAndres\/.+github\.com/);
  });
});
