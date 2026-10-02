import request from 'supertest';
import { crearApp } from '../app';
import * as destinoModel from '../models/destinoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import * as preferenciaModel from '../models/preferenciaModel';
import { catalogo, destinos, etiquetas, hoyoSoplador, johnnyCay, promediosHora } from './fixtures';

jest.mock('../models/destinoModel');
jest.mock('../models/ocupacionModel');
jest.mock('../models/preferenciaModel');

const app = crearApp();
const destinoM = jest.mocked(destinoModel);
const ocupacionM = jest.mocked(ocupacionModel);
const preferenciaM = jest.mocked(preferenciaModel);

beforeEach(() => {
  destinoM.listarVisibles.mockResolvedValue(destinos);
  destinoM.obtenerVisible.mockImplementation(async (_db, id) => destinos.find((d) => d.id_destino === id) ?? null);
  destinoM.listarEtiquetas.mockResolvedValue(etiquetas.filter((e) => e.id_destino === 1));
  ocupacionM.promedioPorHora.mockImplementation(async (_db, filtros) =>
    promediosHora.filter((p) => filtros.idDestino === undefined || p.id_destino === filtros.idDestino),
  );
  ocupacionM.listarRegistros.mockResolvedValue([]);
  preferenciaM.listarCatalogo.mockResolvedValue(catalogo);
});

const esperarError = (res: request.Response, status: number, codigo: string) => {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ error: expect.objectContaining({ codigo, mensaje: expect.any(String) }) });
};

describe('GET /v1/health', () => {
  it('responde ok', async () => {
    const res = await request(app).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ok');
  });

  it('permite CORS', async () => {
    const res = await request(app).get('/v1/health').set('Origin', 'http://192.168.1.10:8081');
    expect(res.headers['access-control-allow-origin']).toBe('http://192.168.1.10:8081');
  });
});

describe('rutas inexistentes', () => {
  it('404 con formato JSON', async () => {
    esperarError(await request(app).get('/v1/no-existe'), 404, 'NO_ENCONTRADO');
  });
});

describe('GET /v1/destinos', () => {
  it('lista destinos con su ocupación predicha para ahora', async () => {
    const res = await request(app).get('/v1/destinos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const johnny = res.body.find((d: { id: number }) => d.id === 1);
    expect(johnny).toMatchObject({
      nombre: 'Johnny Cay',
      categoria: 'cayo',
      ubicacion: johnnyCay.ubicacion_texto,
      ocupacionActual: { porcentaje: 82.4, nivel: 'Alto', personasEstimadas: 659 },
    });
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ finDeSemana: expect.any(Boolean), hora: expect.any(Number) }),
    );
  });

  it('pasa el filtro de categoría al modelo', async () => {
    destinoM.listarVisibles.mockResolvedValue([hoyoSoplador]);
    const res = await request(app).get('/v1/destinos?categoria=naturaleza');
    expect(res.status).toBe(200);
    expect(destinoM.listarVisibles).toHaveBeenCalledWith(expect.anything(), { categoria: 'naturaleza' });
  });

  it('filtra por nivel de ocupación', async () => {
    const res = await request(app).get('/v1/destinos?nivelOcupacion=Bajo');
    expect(res.status).toBe(200);
    expect(res.body.map((d: { nombre: string }) => d.nombre)).toEqual(['Hoyo Soplador']);
  });

  it('400 con categoría inválida', async () => {
    const res = await request(app).get('/v1/destinos?categoria=montaña');
    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.error.detalles[0].campo).toBe('query.categoria');
  });

  it('400 con nivel de ocupación inválido', async () => {
    esperarError(await request(app).get('/v1/destinos?nivelOcupacion=bajo'), 400, 'SOLICITUD_INVALIDA');
  });

  it('500 con formato JSON si falla la base de datos', async () => {
    destinoM.listarVisibles.mockRejectedValue(new Error('conexión rechazada'));
    esperarError(await request(app).get('/v1/destinos'), 500, 'ERROR_INTERNO');
  });
});

describe('GET /v1/destinos/:id', () => {
  it('devuelve el detalle con etiquetas y ocupación actual', async () => {
    const res = await request(app).get('/v1/destinos/1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      nombre: 'Johnny Cay',
      etiquetas: {
        experiencias: [
          { codigo: 'relax', nombre: 'Relax' },
          { codigo: 'fotografia', nombre: 'Fotografía' },
        ],
        grupos: [{ codigo: 'pareja', nombre: 'En pareja' }],
      },
      ocupacionActual: { nivel: 'Alto' },
    });
  });

  it('ocupacionActual es null si no hay historial', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([]);
    const res = await request(app).get('/v1/destinos/1');
    expect(res.status).toBe(200);
    expect(res.body.ocupacionActual).toBeNull();
  });

  it.each(['abc', '0', '-3', '1.5'])('400 con id inválido (%s)', async (id) => {
    esperarError(await request(app).get(`/v1/destinos/${id}`), 400, 'SOLICITUD_INVALIDA');
  });

  it('404 si no existe', async () => {
    esperarError(await request(app).get('/v1/destinos/999'), 404, 'NO_ENCONTRADO');
  });
});

describe('GET /v1/ocupacion/:destinoId', () => {
  it('devuelve los registros del día en hora de Colombia', async () => {
    ocupacionM.listarRegistros.mockResolvedValue([
      { id_ocupacion: 10, id_destino: 1, fecha_hora: '2026-09-28T17:00:00+00:00', cantidad_personas: 600, porcentaje_ocupacion: 75 },
    ]);
    const res = await request(app).get('/v1/ocupacion/1?fecha=2026-09-28');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      destinoId: 1,
      fecha: '2026-09-28',
      registros: [
        { hora: '12:00', fechaHora: '2026-09-28T17:00:00+00:00', cantidadPersonas: 600, porcentaje: 75, nivel: 'Alto' },
      ],
    });
    expect(ocupacionM.listarRegistros).toHaveBeenCalledWith(
      expect.anything(),
      1,
      '2026-09-28T05:00:00.000Z',
      '2026-09-29T05:00:00.000Z',
    );
  });

  it('lista vacía si no hay registros ese día', async () => {
    const res = await request(app).get('/v1/ocupacion/1?fecha=2026-01-01');
    expect(res.status).toBe(200);
    expect(res.body.registros).toEqual([]);
  });

  it.each(['', '?fecha=28-09-2026', '?fecha=2026-02-30'])('400 con fecha inválida (%s)', async (q) => {
    esperarError(await request(app).get(`/v1/ocupacion/1${q}`), 400, 'SOLICITUD_INVALIDA');
  });

  it('404 si el destino no existe', async () => {
    esperarError(await request(app).get('/v1/ocupacion/999?fecha=2026-09-28'), 404, 'NO_ENCONTRADO');
  });
});

describe('GET /v1/ocupacion/:destinoId/prediccion', () => {
  it('predice con el promedio de la hora y el tipo de día', async () => {
    const res = await request(app).get('/v1/ocupacion/3/prediccion?fecha=2026-10-03&hora=12:30');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      destinoId: 3,
      fecha: '2026-10-03',
      hora: '12:30',
      tipoDia: 'fin_de_semana',
      porcentaje: 25.1,
      nivel: 'Bajo',
      personasEstimadas: 75,
      muestras: 16,
      fuente: 'promedio_historico',
    });
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledWith(expect.anything(), {
      finDeSemana: true,
      hora: 12,
      idDestino: 3,
    });
  });

  it('usa el patrón entre semana en días hábiles', async () => {
    await request(app).get('/v1/ocupacion/3/prediccion?fecha=2026-09-30&hora=08:00');
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledWith(expect.anything(), {
      finDeSemana: false,
      hora: 8,
      idDestino: 3,
    });
  });

  it.each([
    '?fecha=2026-09-30',
    '?hora=10:00',
    '?fecha=2026-09-30&hora=24:00',
    '?fecha=2026-09-30&hora=9:00',
  ])('400 con parámetros inválidos (%s)', async (q) => {
    esperarError(await request(app).get(`/v1/ocupacion/3/prediccion${q}`), 400, 'SOLICITUD_INVALIDA');
  });

  it('404 si el destino no existe', async () => {
    esperarError(
      await request(app).get('/v1/ocupacion/999/prediccion?fecha=2026-09-30&hora=10:00'),
      404,
      'NO_ENCONTRADO',
    );
  });

  it('404 si no hay historial para predecir', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([]);
    esperarError(
      await request(app).get('/v1/ocupacion/3/prediccion?fecha=2026-09-30&hora=10:00'),
      404,
      'NO_ENCONTRADO',
    );
  });
});

describe('GET /v1/ocupacion/:destinoId/prediccion/dia', () => {
  it('devuelve la ocupación típica de ese día de la semana, ordenada por hora', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([
      { id_destino: 1, hora: 13, promedio: 81, muestras: 4 },
      { id_destino: 1, hora: 9, promedio: 30, muestras: 4 },
    ]);
    // 2026-09-29 es martes.
    const res = await request(app).get('/v1/ocupacion/1/prediccion/dia?fecha=2026-09-29');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      destinoId: 1,
      fecha: '2026-09-29',
      diaSemana: 2,
      nombreDia: 'martes',
      base: 'dia_semana',
      fuente: 'promedio_historico',
      horas: [
        { hora: '09:00', porcentaje: 30, nivel: 'Bajo', personasEstimadas: 240 },
        { hora: '13:00', porcentaje: 81, nivel: 'Alto', personasEstimadas: 648 },
      ],
    });
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledTimes(1);
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledWith(expect.anything(), { diaSemana: 2, idDestino: 1 });
  });

  it('usa el histórico del tipo de día si no hay datos de ese día de la semana', async () => {
    ocupacionM.promedioPorHora
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id_destino: 1, hora: 12, promedio: 90, muestras: 8 }]);
    // 2026-10-04 es domingo.
    const res = await request(app).get('/v1/ocupacion/1/prediccion/dia?fecha=2026-10-04');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ diaSemana: 7, nombreDia: 'domingo', base: 'fin_de_semana' });
    expect(res.body.horas).toHaveLength(1);
    expect(ocupacionM.promedioPorHora).toHaveBeenLastCalledWith(expect.anything(), {
      finDeSemana: true,
      idDestino: 1,
    });
  });

  it('400 sin fecha', async () => {
    esperarError(await request(app).get('/v1/ocupacion/1/prediccion/dia'), 400, 'SOLICITUD_INVALIDA');
  });

  it('404 si el destino no existe', async () => {
    esperarError(await request(app).get('/v1/ocupacion/999/prediccion/dia?fecha=2026-09-29'), 404, 'NO_ENCONTRADO');
  });

  it('404 si no hay historial', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([]);
    esperarError(await request(app).get('/v1/ocupacion/1/prediccion/dia?fecha=2026-09-29'), 404, 'NO_ENCONTRADO');
  });
});

describe('GET /v1/preferencias/catalogo', () => {
  it('agrupa el catálogo por tipo', async () => {
    const res = await request(app).get('/v1/preferencias/catalogo');
    expect(res.status).toBe(200);
    expect(res.body.categorias.map((c: { codigo: string }) => c.codigo)).toEqual(['playa', 'cayo', 'naturaleza']);
    expect(res.body.experiencias).toHaveLength(3);
    expect(res.body.grupos[0]).toEqual({ id: 14, codigo: 'pareja', nombre: 'En pareja', descripcion: null });
  });
});
