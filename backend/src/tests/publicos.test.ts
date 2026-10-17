import request from 'supertest';
import { crearApp } from '../app';
import * as destinoModel from '../models/destinoModel';
import * as resenaModel from '../models/resenaModel';
import * as ocupacionModel from '../models/ocupacionModel';
import * as preferenciaModel from '../models/preferenciaModel';
import * as fecha from '../utils/fecha';
import { proveedorFalso } from './climaFalso';
import { catalogo, destinos, etiquetas, hoyoSoplador, johnnyCay, promediosHora } from './fixtures';

jest.mock('../models/destinoModel');
jest.mock('../models/resenaModel');
jest.mock('../models/ocupacionModel');
jest.mock('../models/preferenciaModel');

const app = crearApp();
const destinoM = jest.mocked(destinoModel);
const ocupacionM = jest.mocked(ocupacionModel);
const preferenciaM = jest.mocked(preferenciaModel);
const ahora = jest.spyOn(fecha, 'ahoraEnColombia');

beforeEach(() => {
  jest.mocked(resenaModel.resumen).mockResolvedValue(new Map());
  jest.mocked(resenaModel.listarPorDestino).mockResolvedValue([]);
  // Miércoles al mediodía: Johnny Cay (09:00–16:00) está abierto.
  ahora.mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });
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
      ocupacionActual: { estado: 'Abierto', porcentaje: 82.4, nivel: 'Alto', personasEstimadas: 659 },
    });
    // Base: histórico de los miércoles a esa hora (una sola consulta para todos).
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledTimes(1);
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledWith(expect.anything(), { diaSemana: 3, hora: 12 });
  });

  it('incluye horario, precio, cómo llegar e imagen con crédito', async () => {
    const res = await request(app).get('/v1/destinos');
    const johnny = res.body.find((d: { id: number }) => d.id === 1);
    expect(johnny).toMatchObject({
      horario: { apertura: '09:00', cierre: '16:00' },
      rangoPrecio: '$',
      comoLlegar: johnnyCay.como_llegar,
      imagenUrl: johnnyCay.imagen_url,
      imagen: {
        url: johnnyCay.imagen_url,
        autor: 'EASLYHAKS',
        licencia: 'CC BY-SA 4.0',
        fuente: johnnyCay.imagen_fuente,
      },
    });
    const hoyo = res.body.find((d: { id: number }) => d.id === 3);
    expect(hoyo).toMatchObject({ horario: null, rangoPrecio: 'Gratis', comoLlegar: null, imagenUrl: null, imagen: null });
  });

  it('marca como cerrados los destinos fuera de su horario', async () => {
    ahora.mockReturnValue({ fecha: '2026-09-30', hora: '18:00' });
    const res = await request(app).get('/v1/destinos');
    const johnny = res.body.find((d: { id: number }) => d.id === 1);
    expect(johnny.ocupacionActual).toEqual({
      fecha: '2026-09-30',
      hora: '18:00',
      estado: 'Cerrado',
      porcentaje: 0,
      nivel: null,
      personasEstimadas: 0,
    });
    // El histórico se consulta una sola vez, para los abiertos.
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledTimes(1);
  });

  it('busca por nombre con q', async () => {
    destinoM.listarVisibles.mockResolvedValue([johnnyCay]);
    const res = await request(app).get('/v1/destinos?q=%20johnny%20&categoria=cayo');
    expect(res.status).toBe(200);
    expect(res.body.map((d: { nombre: string }) => d.nombre)).toEqual(['Johnny Cay']);
    expect(destinoM.listarVisibles).toHaveBeenCalledWith(expect.anything(), { categoria: 'cayo', nombre: 'johnny' });
  });

  it.each(['', '%20%20', 'a'.repeat(101)])('400 con búsqueda inválida (q=%s)', async (q) => {
    const res = await request(app).get(`/v1/destinos?q=${q}`);
    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.error.detalles[0].campo).toBe('query.q');
  });

  it('acepta la categoría actividad', async () => {
    destinoM.listarVisibles.mockResolvedValue([]);
    const res = await request(app).get('/v1/destinos?categoria=actividad');
    expect(res.status).toBe(200);
    expect(destinoM.listarVisibles).toHaveBeenCalledWith(expect.anything(), { categoria: 'actividad' });
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
      { id_ocupacion: 10, id_destino: 1, fecha_hora: '2026-09-28T17:00:00+00:00', cantidad_personas: 600, porcentaje_ocupacion: 75, origen: 'sintetico' },
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
  it('predice con el promedio de esa hora en ese día de la semana, sin factores con buen clima', async () => {
    const res = await request(app).get('/v1/ocupacion/3/prediccion?fecha=2026-10-03&hora=12:30');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      destinoId: 3,
      fecha: '2026-10-03',
      hora: '12:30',
      tipoDia: 'fin_de_semana',
      estado: 'Abierto',
      porcentaje: 25.1,
      nivel: 'Bajo',
      personasEstimadas: 75,
      muestras: 16,
      fuente: 'promedio_historico',
      proveedor: 'heuristico',
      proveedorRespaldo: false,
      origenDatos: 'sintetico',
      datosSimulados: true,
      mensajeOrigen: 'Estimación basada en datos simulados',
      base: { porcentaje: 25.1, origen: 'dia_semana', muestras: 16 },
      features: {
        hora: 12,
        diaSemana: 6,
        esFinDeSemana: true,
        esFestivo: false,
        esPuente: false,
        temporada: 'normal',
        clima: { temperatura: 29, probLluvia: 10, precipitacion: 0, codigoClima: 1, viento: 15 },
      },
      clima: {
        fechaHora: '2026-10-03T12:00',
        temperatura: 29,
        probLluvia: 10,
        precipitacion: 0,
        codigoClima: 1,
        viento: 15,
      },
      motivoSinClima: null,
      factores: [],
    });
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledWith(expect.anything(), {
      diaSemana: 6,
      hora: 12,
      idDestino: 3,
    });
  });

  it('usa el histórico del tipo de día si el del día de la semana tiene pocas muestras', async () => {
    ocupacionM.promedioPorHora
      .mockResolvedValueOnce([{ id_destino: 3, hora: 8, promedio: 50, muestras: 2 }])
      .mockResolvedValueOnce([{ id_destino: 3, hora: 8, promedio: 20, muestras: 40 }]);
    const res = await request(app).get('/v1/ocupacion/3/prediccion?fecha=2026-09-30&hora=08:00');
    expect(res.body.base).toEqual({ porcentaje: 20, origen: 'entre_semana', muestras: 40 });
    expect(ocupacionM.promedioPorHora).toHaveBeenLastCalledWith(expect.anything(), {
      finDeSemana: false,
      hora: 8,
      idDestino: 3,
    });
  });

  it('responde Cerrado fuera del horario sin consultar el histórico', async () => {
    const res = await request(app).get('/v1/ocupacion/1/prediccion?fecha=2026-09-30&hora=08:59');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      destinoId: 1,
      fecha: '2026-09-30',
      hora: '08:59',
      tipoDia: 'entre_semana',
      estado: 'Cerrado',
      porcentaje: 0,
      nivel: null,
      personasEstimadas: 0,
      muestras: 0,
      fuente: 'horario',
      proveedor: 'horario',
      proveedorRespaldo: false,
      origenDatos: null,
      datosSimulados: false,
      mensajeOrigen: null,
      base: null,
      features: expect.objectContaining({ hora: 8, diaSemana: 3, clima: null }),
      clima: null,
      motivoSinClima: null,
      factores: [],
    });
    expect(ocupacionM.promedioPorHora).not.toHaveBeenCalled();
    expect(proveedorFalso.llamadas).toHaveLength(0);
  });

  it.each([
    ['09:00', 'Abierto'],
    ['15:59', 'Abierto'],
    ['16:00', 'Cerrado'],
    ['23:30', 'Cerrado'],
  ])('a las %s Johnny Cay (09:00–16:00) está %s', async (hora, estado) => {
    ocupacionM.promedioPorHora.mockResolvedValue([{ id_destino: 1, hora: 9, promedio: 40, muestras: 4 }]);
    const res = await request(app).get(`/v1/ocupacion/1/prediccion?fecha=2026-09-30&hora=${hora}`);
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe(estado);
  });

  it('responde Cerrado si el destino está cerrado temporalmente', async () => {
    destinoM.obtenerVisible.mockResolvedValue({ ...hoyoSoplador, estado: 'cerrado_temporal' });
    const res = await request(app).get('/v1/ocupacion/3/prediccion?fecha=2026-09-30&hora=12:00');
    expect(res.body).toMatchObject({ estado: 'Cerrado', porcentaje: 0, nivel: null });
  });

  it('un destino sin horario siempre está abierto', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([{ id_destino: 3, hora: 3, promedio: 2, muestras: 4 }]);
    const res = await request(app).get('/v1/ocupacion/3/prediccion?fecha=2026-09-30&hora=03:00');
    expect(res.body).toMatchObject({ estado: 'Abierto', porcentaje: 2, nivel: 'Bajo' });
  });

  it('fuera del horario responde Cerrado aunque no haya historial', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([]);
    const res = await request(app).get('/v1/ocupacion/1/prediccion?fecha=2026-09-30&hora=20:00');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('Cerrado');
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
        { hora: '09:00', abierto: true, porcentaje: 30, nivel: 'Bajo', personasEstimadas: 240 },
        { hora: '13:00', abierto: true, porcentaje: 81, nivel: 'Alto', personasEstimadas: 648 },
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

  it('las horas fuera del horario van cerradas y en 0', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([
      { id_destino: 1, hora: 8, promedio: 12, muestras: 4 },
      { id_destino: 1, hora: 15, promedio: 50, muestras: 4 },
      { id_destino: 1, hora: 16, promedio: 20, muestras: 4 },
    ]);
    const res = await request(app).get('/v1/ocupacion/1/prediccion/dia?fecha=2026-09-29');
    expect(res.body.horas).toEqual([
      { hora: '08:00', abierto: false, porcentaje: 0, nivel: 'Bajo', personasEstimadas: 0 },
      { hora: '15:00', abierto: true, porcentaje: 50, nivel: 'Medio', personasEstimadas: 400 },
      { hora: '16:00', abierto: false, porcentaje: 0, nivel: 'Bajo', personasEstimadas: 0 },
    ]);
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
