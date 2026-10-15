import request from 'supertest';
import { crearApp } from '../app';
import { env } from '../config/env';
import * as destinoModel from '../models/destinoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import { reiniciarProveedores } from '../services/prediccion/proveedores';
import * as fecha from '../utils/fecha';
import { proveedorFalso } from './climaFalso';
import { destinos, promediosHora } from './fixtures';

jest.mock('../models/destinoModel');
jest.mock('../models/ocupacionModel');

const app = crearApp();
const destinoM = jest.mocked(destinoModel);
const ocupacionM = jest.mocked(ocupacionModel);
jest.spyOn(fecha, 'ahoraEnColombia').mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });

const URL_ML = 'https://ml.prueba.misanandres';
const original = { ...env };
const fetchOriginal = global.fetch;
let fetchFalso: jest.Mock;

/** Respuesta del servicio de ML para los destinos pedidos (porcentaje fijo por destino). */
function respuestaMl(porcentajes: Record<number, number>, sintetico = true) {
  return async (_url: string, init: RequestInit) => {
    const { consultas } = JSON.parse(String(init.body)) as { consultas: { id_destino: number }[] };
    return new Response(
      JSON.stringify({
        origen_modelo: sintetico ? 'mock' : 'real',
        datos_sinteticos: sintetico,
        mensaje_origen: sintetico ? 'Estimación basada en datos simulados' : null,
        version_modelo: '2026-10-15T19:36:15+00:00',
        listo_para_produccion: !sintetico,
        resultados: consultas.map((c) => ({
          id_destino: c.id_destino,
          fecha: '2026-09-30',
          hora: '12:30',
          estado: 'Abierto',
          porcentaje: porcentajes[c.id_destino] ?? 50,
          nivel: 'Medio',
          personas_estimadas: 0,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };
}

function usarProveedor(proveedor: typeof env.PREDICCION_PROVEEDOR) {
  Object.assign(env, { PREDICCION_PROVEEDOR: proveedor, ML_SERVICE_URL: URL_ML, ML_API_KEY: 'clave-ml', ML_TIMEOUT_MS: 300 });
}

beforeEach(() => {
  reiniciarProveedores();
  fetchFalso = jest.fn();
  global.fetch = fetchFalso as unknown as typeof fetch;
  destinoM.obtenerVisible.mockImplementation(async (_db, id) => destinos.find((d) => d.id_destino === id) ?? null);
  destinoM.listarVisibles.mockResolvedValue(destinos);
  destinoM.listarEtiquetas.mockResolvedValue([]);
  ocupacionM.promedioPorHora.mockImplementation(async (_db, filtros) =>
    promediosHora.filter((p) => filtros.idDestino === undefined || p.id_destino === filtros.idDestino),
  );
  proveedorFalso.clima = { temperatura: 29, precipitacion: 0, viento: 15 };
});

afterEach(() => {
  Object.assign(env, original);
  global.fetch = fetchOriginal;
});

const predecir = (id = 1) => request(app).get(`/v1/ocupacion/${id}/prediccion?fecha=2026-09-30&hora=12:30`);

describe('proveedor de ML', () => {
  it('usa el porcentaje del servicio de ML y lo indica en la respuesta', async () => {
    usarProveedor('ml');
    fetchFalso.mockImplementation(respuestaMl({ 1: 64.27 }));

    const res = await predecir(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: 'Abierto',
      porcentaje: 64.3,
      nivel: 'Medio',
      fuente: 'modelo_ml',
      proveedor: 'ml',
      proveedorRespaldo: false,
      origenDatos: 'sintetico',
      datosSimulados: true,
      mensajeOrigen: 'Estimación basada en datos simulados',
      base: null,
      factores: [],
    });

    // Una sola llamada a /predict/lote, con la API key y el clima de la hora.
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${URL_ML}/predict/lote`);
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('clave-ml');
    expect(JSON.parse(String(init.body))).toEqual({
      consultas: [
        { id_destino: 1, fecha: '2026-09-30', hora: '12:30', clima: { temperatura: 29, precipitacion: 0, viento: 15 } },
      ],
    });
  });

  it('con un modelo entrenado con datos reales no muestra el aviso de datos simulados', async () => {
    usarProveedor('ml');
    fetchFalso.mockImplementation(respuestaMl({ 1: 30 }, false));
    const res = await predecir(1);
    expect(res.body).toMatchObject({ proveedor: 'ml', origenDatos: 'real', datosSimulados: false, mensajeOrigen: null });
  });

  it('fuera del horario responde Cerrado sin llamar al servicio', async () => {
    usarProveedor('ml');
    const res = await request(app).get('/v1/ocupacion/1/prediccion?fecha=2026-09-30&hora=07:00');
    expect(res.body).toMatchObject({ estado: 'Cerrado', proveedor: 'horario' });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('en modo ml, si el servicio está caído responde 503 con el formato de error de la API', async () => {
    usarProveedor('ml');
    fetchFalso.mockRejectedValue(new TypeError('fetch failed'));
    const res = await predecir(1);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatchObject({ codigo: 'SERVICIO_NO_DISPONIBLE' });
    expect(res.body.error.mensaje).toContain('Sin conexión con el servicio de ML');
  });
});

describe('modo auto (ML con respaldo heurístico)', () => {
  it('si el servicio está caído, responde con el heurístico y lo marca como respaldo', async () => {
    usarProveedor('auto');
    fetchFalso.mockRejectedValue(new TypeError('fetch failed'));

    const res = await predecir(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      proveedor: 'heuristico',
      proveedorRespaldo: true,
      fuente: 'promedio_historico',
      base: { porcentaje: 82.4, origen: 'dia_semana' },
      datosSimulados: true,
    });

    // Tras el fallo no vuelve a esperar al servicio en cada consulta.
    await predecir(1);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['responde 500', async () => new Response('error', { status: 500 })],
    ['devuelve un formato inesperado', async () => new Response(JSON.stringify({ hola: 1 }), { status: 200 })],
    [
      'no responde a tiempo',
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolver, rechazar) => init.signal?.addEventListener('abort', () => rechazar(init.signal?.reason))),
    ],
  ])('si el servicio %s, usa el heurístico', async (_caso, implementacion) => {
    usarProveedor('auto');
    fetchFalso.mockImplementation(implementacion);
    const res = await predecir(1);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ proveedor: 'heuristico', proveedorRespaldo: true });
  });

  it('cuando el servicio responde, usa ML para toda la lista de destinos en una sola llamada', async () => {
    usarProveedor('auto');
    fetchFalso.mockImplementation(respuestaMl({ 1: 90, 3: 10, 6: 45 }));
    const res = await request(app).get('/v1/destinos');
    expect(res.status).toBe(200);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const porId = new Map((res.body as { id: number; ocupacionActual: { porcentaje: number } }[]).map((d) => [d.id, d]));
    expect(porId.get(1)?.ocupacionActual.porcentaje).toBe(90);
    expect(porId.get(6)?.ocupacionActual.porcentaje).toBe(45);
  });
});

describe('modo heurístico (por defecto)', () => {
  it('no llama al servicio de ML', async () => {
    Object.assign(env, { PREDICCION_PROVEEDOR: 'heuristico' });
    const res = await predecir(1);
    expect(res.body).toMatchObject({ proveedor: 'heuristico', proveedorRespaldo: false });
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});

describe('variables de entorno de la predicción', () => {
  const cargarEnv = (extra: Record<string, string | undefined>) => {
    const antes = { ...process.env };
    Object.assign(process.env, extra);
    try {
      let modulo: typeof import('../config/env') | undefined;
      jest.isolateModules(() => {
        modulo = require('../config/env');
      });
      return modulo!.env;
    } finally {
      process.env = antes;
    }
  };

  it('ML_SERVICE_URL y ML_API_KEY son opcionales con el heurístico', () => {
    expect(cargarEnv({ PREDICCION_PROVEEDOR: 'heuristico', ML_SERVICE_URL: '', ML_API_KEY: '' })).toMatchObject({
      PREDICCION_PROVEEDOR: 'heuristico',
      ML_SERVICE_URL: undefined,
    });
  });

  it.each(['ml', 'auto'])('con PREDICCION_PROVEEDOR=%s son obligatorias', (proveedor) => {
    expect(() => cargarEnv({ PREDICCION_PROVEEDOR: proveedor, ML_SERVICE_URL: '', ML_API_KEY: '' })).toThrow(
      /ML_SERVICE_URL es obligatoria.*ML_API_KEY es obligatoria/,
    );
  });

  it('rechaza un proveedor desconocido', () => {
    expect(() => cargarEnv({ PREDICCION_PROVEEDOR: 'otro' })).toThrow(/PREDICCION_PROVEEDOR/);
  });
});
