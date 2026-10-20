/**
 * GET /v1/admin/modelos y POST /v1/admin/modelos/comparar con el servicio de ML simulado
 * (fetch falso): solo administrador, mensajes claros si el ML no responde.
 */
import request from 'supertest';
import { crearApp } from '../app';
import { env } from '../config/env';
import * as authModel from '../models/authModel';
import type { RolUsuario } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as usuarioModel from '../models/usuarioModel';
import * as climaService from '../services/clima/climaService';
import { destinos } from './fixtures';

jest.mock('../models/authModel');
jest.mock('../models/usuarioModel');
jest.mock('../models/destinoModel');

const app = crearApp();
const authM = jest.mocked(authModel);
const usuarioM = jest.mocked(usuarioModel);
const destinoM = jest.mocked(destinoModel);

const IDS: Record<RolUsuario, string> = {
  turista: '6f1c2a3b-0000-4000-8000-000000000001',
  tecnico: '6f1c2a3b-0000-4000-8000-000000000002',
  administrador: '6f1c2a3b-0000-4000-8000-000000000003',
};
const como = (rol: RolUsuario) => ({ Authorization: `Bearer token-${rol}` });

const URL_ML = 'https://ml.prueba.misanandres';
const original = { ...env };
const fetchOriginal = global.fetch;
let fetchFalso: jest.Mock;

const respuesta = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const MODELO_ML = {
  ganador: 'gradient_boosting',
  activo: 'gradient_boosting',
  respaldo: false,
  modelos: [
    { clave: 'ridge', nombre: 'Ridge (regresión lineal regularizada)', mae: 6.39, rmse: 8.94, r2: 0.81, tamano_mb: 0.01, ganador: false, activo: false, disponible: true },
    { clave: 'random_forest', nombre: 'Random Forest', mae: 4.6, rmse: 6.65, r2: 0.89, tamano_mb: 12.3, ganador: false, activo: false, disponible: true },
    { clave: 'gradient_boosting', nombre: 'HistGradientBoosting', mae: 4.49, rmse: 6.48, r2: 0.9, tamano_mb: 0.64, ganador: true, activo: true, disponible: true },
  ],
  baseline: { clave: 'baseline', nombre: 'Baseline (promedio por destino y hora)', mae: 5.97, rmse: 9.5, r2: 0.78 },
  seleccion: { ganador: 'gradient_boosting', nombre: 'HistGradientBoosting', motivo: 'Menor RMSE.', criterio: 'Menor RMSE en la prueba.' },
  datos_sinteticos: true,
  mensaje_origen: 'Estimación basada en datos simulados',
  fecha_comparacion: '2026-10-20T00:00:00+00:00',
};

const fila = (clave: string, nombre: string, porcentaje: number, ganador = false) => ({
  clave, nombre, ganador, activo: ganador, disponible: true, porcentaje, nivel: porcentaje < 40 ? 'Bajo' : 'Medio', personas_estimadas: 10, error: null,
});
const COMPARAR_ML = {
  id_destino: 5,
  fecha: '2026-10-20',
  hora: '12:00',
  estado: 'Abierto',
  ganador: 'gradient_boosting',
  origen_modelo: 'simulado',
  datos_sinteticos: true,
  mensaje_origen: 'Estimación basada en datos simulados',
  resultados: [
    fila('ridge', 'Ridge (regresión lineal regularizada)', 52),
    fila('random_forest', 'Random Forest', 47),
    fila('gradient_boosting', 'HistGradientBoosting', 45, true),
    fila('baseline', 'Baseline (promedio por destino y hora)', 39),
  ],
};

beforeEach(() => {
  Object.assign(env, { ML_SERVICE_URL: URL_ML, ML_API_KEY: 'clave-ml' });
  fetchFalso = jest.fn();
  global.fetch = fetchFalso as unknown as typeof fetch;
  authM.obtenerUsuarioDelToken.mockImplementation(async (token) => {
    const rol = (Object.keys(IDS) as RolUsuario[]).find((r) => token === `token-${r}`);
    return rol ? { id: IDS[rol], correo: `${rol}@misanandres.test` } : null;
  });
  usuarioM.obtenerRol.mockImplementation(async (_db, id) => (Object.keys(IDS) as RolUsuario[]).find((r) => IDS[r] === id) ?? null);
  destinoM.obtenerVisible.mockImplementation(async (_db, id) => destinos.find((d) => d.id_destino === id) ?? null);
  jest.spyOn(climaService, 'climaEnHora').mockImplementation(async (puntos) => {
    const clima = { fechaHora: '2026-10-20T12:00', temperatura: 29, probLluvia: 10, precipitacion: 0.2, codigoClima: 1, viento: 18 };
    return new Map(puntos.map((p) => [p.clave, { clima, motivo: null, desactualizado: false, actualizadoEn: '2026-10-20T11:00:00Z' }]));
  });
});

afterEach(() => {
  Object.assign(env, original);
  global.fetch = fetchOriginal;
  jest.restoreAllMocks();
});

describe('GET /v1/admin/modelos', () => {
  it('devuelve la comparativa de los tres modelos y el baseline, con la API key del ML', async () => {
    fetchFalso.mockResolvedValue(respuesta(MODELO_ML));
    const res = await request(app).get('/v1/admin/modelos').set(como('administrador'));
    expect(res.status).toBe(200);
    expect(res.body.ganador).toBe('gradient_boosting');
    expect(res.body.modelos.map((m: { clave: string }) => m.clave)).toEqual(['ridge', 'random_forest', 'gradient_boosting']);
    expect(res.body.modelos[2]).toMatchObject({ ganador: true, activo: true, tamanoMb: 0.64 });
    expect(res.body.baseline.rmse).toBe(9.5);
    expect(res.body.datosSimulados).toBe(true);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${URL_ML}/modelo`);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('clave-ml');
  });

  it.each(['turista', 'tecnico'] as const)('un %s recibe 403', async (rol) => {
    const res = await request(app).get('/v1/admin/modelos').set(como(rol));
    expect(res.status).toBe(403);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('sin token responde 401', async () => {
    expect((await request(app).get('/v1/admin/modelos')).status).toBe(401);
  });

  it('si el ML no responde, 503 con un mensaje claro', async () => {
    fetchFalso.mockRejectedValue(new TypeError('fetch failed'));
    const res = await request(app).get('/v1/admin/modelos').set(como('administrador'));
    expect(res.status).toBe(503);
    expect(res.body.error.codigo).toBe('SERVICIO_NO_DISPONIBLE');
    expect(res.body.error.mensaje).toMatch(/no respondió/);
  });

  it('si el ML responde con error, 503 con su mensaje', async () => {
    fetchFalso.mockResolvedValue(respuesta({ detail: { codigo: 'MODELO_NO_ENTRENADO', mensaje: 'No hay un modelo entrenado.' } }, 503));
    const res = await request(app).get('/v1/admin/modelos').set(como('administrador'));
    expect(res.status).toBe(503);
    expect(res.body.error.mensaje).toContain('No hay un modelo entrenado');
  });

  it('un formato inesperado cuenta como fallo', async () => {
    fetchFalso.mockResolvedValue(respuesta({ hola: 'mundo' }));
    const res = await request(app).get('/v1/admin/modelos').set(como('administrador'));
    expect(res.status).toBe(503);
  });

  it('sin ML configurado, 503', async () => {
    Object.assign(env, { ML_SERVICE_URL: undefined, ML_API_KEY: undefined });
    const res = await request(app).get('/v1/admin/modelos').set(como('administrador'));
    expect(res.status).toBe(503);
    expect(res.body.error.mensaje).toMatch(/no está configurado/);
  });
});

describe('POST /v1/admin/modelos/comparar', () => {
  it('envía las features con el clima de la caché y devuelve los cuatro resultados', async () => {
    fetchFalso.mockResolvedValue(respuesta(COMPARAR_ML));
    const res = await request(app)
      .post('/v1/admin/modelos/comparar')
      .set(como('administrador'))
      .send({ idDestino: 1, fecha: '2026-10-20', hora: '12:00' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ destinoId: 1, nombre: 'Johnny Cay', estado: 'Abierto', ganador: 'gradient_boosting', conClima: true });
    expect(res.body.resultados.map((r: { clave: string }) => r.clave)).toEqual(['ridge', 'random_forest', 'gradient_boosting', 'baseline']);
    expect(res.body.resultados[2]).toMatchObject({ ganador: true, porcentaje: 45, personasEstimadas: 10 });
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${URL_ML}/comparar`);
    expect(JSON.parse(String(init.body))).toEqual({
      id_destino: 1, fecha: '2026-10-20', hora: '12:00', clima: { temperatura: 29, precipitacion: 0.2, viento: 18 },
    });
  });

  it('valida la entrada', async () => {
    for (const cuerpo of [{ idDestino: 0, fecha: '2026-10-20', hora: '12:00' }, { idDestino: 5, fecha: '20/10/2026', hora: '12:00' },
      { idDestino: 5, fecha: '2026-10-20', hora: '25:00' }]) {
      const res = await request(app).post('/v1/admin/modelos/comparar').set(como('administrador')).send(cuerpo);
      expect(res.status).toBe(400);
    }
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('destino inexistente: 404 sin llamar al ML', async () => {
    const res = await request(app).post('/v1/admin/modelos/comparar').set(como('administrador')).send({ idDestino: 999, fecha: '2026-10-20', hora: '12:00' });
    expect(res.status).toBe(404);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('solo administrador', async () => {
    const res = await request(app).post('/v1/admin/modelos/comparar').set(como('turista')).send({ idDestino: 1, fecha: '2026-10-20', hora: '12:00' });
    expect(res.status).toBe(403);
  });

  it('si el ML no responde, 503', async () => {
    fetchFalso.mockRejectedValue(Object.assign(new Error('tiempo'), { name: 'TimeoutError' }));
    const res = await request(app).post('/v1/admin/modelos/comparar').set(como('administrador')).send({ idDestino: 1, fecha: '2026-10-20', hora: '12:00' });
    expect(res.status).toBe(503);
  });
});
