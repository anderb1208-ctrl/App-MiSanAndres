import request from 'supertest';
import { crearApp } from '../app';
import type { DestinoRow, ResenaRow, UsuarioRow } from '../models/database.types';
import * as authModel from '../models/authModel';
import * as destinoModel from '../models/destinoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import * as preferenciaModel from '../models/preferenciaModel';
import * as resenaModel from '../models/resenaModel';
import * as usuarioModel from '../models/usuarioModel';
import { explicar, type DatosRazones } from '../services/razonesRecomendacion';
import * as fecha from '../utils/fecha';
import { catalogo, etiquetas, hoyoSoplador, johnnyCay, promediosHora, sprattBight } from './fixtures';

jest.mock('../models/authModel');
jest.mock('../models/destinoModel');
jest.mock('../models/ocupacionModel');
jest.mock('../models/preferenciaModel');
jest.mock('../models/resenaModel');
jest.mock('../models/usuarioModel');

const app = crearApp();
const ahora = jest.spyOn(fecha, 'ahoraEnColombia');
const resenaM = jest.mocked(resenaModel);
const usuarioM = jest.mocked(usuarioModel);

const TURISTA = '6f1c2a3b-0000-4000-8000-000000000001';
const ADMIN = '6f1c2a3b-0000-4000-8000-0000000000aa';
const auth = { Authorization: 'Bearer token-turista' };
const authAdmin = { Authorization: 'Bearer token-admin' };

const perfil: UsuarioRow = {
  id_usuario: TURISTA,
  nombre: 'Ana Martínez',
  nivel_ocupacion_preferido: 'Bajo',
  fecha_registro: '2026-09-29T15:00:00+00:00',
  rol: 'turista',
  presupuesto_min_cop: 0,
  presupuesto_max_cop: 100000,
};

const conPrecio = (d: DestinoRow, min: number, max: number): DestinoRow => ({
  ...d,
  precio_min_cop: min,
  precio_max_cop: max,
  precio_es_estimado: true,
});
const johnny = conPrecio(johnnyCay, 85000, 125000);
const hoyo = conPrecio(hoyoSoplador, 0, 5000);
// Spratt Bight queda sin precio: la razón de presupuesto se omite.
const destinos = [hoyo, johnny, sprattBight];

const resena = (cambios: Partial<ResenaRow> = {}): ResenaRow => ({
  id_resena: 5,
  id_usuario: TURISTA,
  id_destino: 1,
  estrellas: 4,
  comentario: 'Muy bonito',
  oculta: false,
  fecha_creacion: '2026-10-01T15:00:00+00:00',
  fecha_actualizacion: '2026-10-01T15:00:00+00:00',
  ...cambios,
});

beforeEach(() => {
  ahora.mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });
  jest.mocked(authModel.obtenerUsuarioDelToken).mockImplementation(async (t) =>
    t === 'token-turista' ? { id: TURISTA, correo: 'ana@correo.com' } : t === 'token-admin' ? { id: ADMIN, correo: 'admin@correo.com' } : null,
  );
  usuarioM.obtener.mockResolvedValue(perfil);
  usuarioM.obtenerRol.mockImplementation(async (_db, id) => (id === ADMIN ? 'administrador' : 'turista'));
  usuarioM.actualizar.mockImplementation(async (_db, _id, cambios) => ({ ...perfil, ...cambios }));
  jest.mocked(preferenciaModel.listarCatalogo).mockResolvedValue(catalogo);
  // Cayos, Naturaleza, Relax, Fotografía, En pareja
  jest.mocked(preferenciaModel.listarIdsDelUsuario).mockResolvedValue([2, 3, 7, 12, 14]);
  jest.mocked(destinoModel.listarVisibles).mockResolvedValue(destinos);
  jest.mocked(destinoModel.obtenerVisible).mockImplementation(async (_db, id) => destinos.find((d) => d.id_destino === id) ?? null);
  jest.mocked(destinoModel.listarEtiquetas).mockResolvedValue(etiquetas);
  jest.mocked(ocupacionModel.promedioPorHora).mockResolvedValue(promediosHora);
  resenaM.resumen.mockResolvedValue(new Map());
  resenaM.listarPorDestino.mockResolvedValue([]);
  resenaM.obtenerPropia.mockResolvedValue(null);
  resenaM.crear.mockImplementation(async (_db, r) => resena({ ...r }));
  resenaM.actualizar.mockImplementation(async (_db, id, c) => resena({ id_resena: id, ...c }));
  resenaM.ocultar.mockImplementation(async (_db, id, oculta) => resena({ id_resena: id, oculta }));
});

type RecomendacionApi = {
  id: number;
  nombre: string;
  puntaje: number;
  porQue: string;
  razones: { codigo: string; texto: string; tipo: string }[];
  precio: unknown;
};
const recomendaciones = async (consulta = '') => {
  const res = await request(app).get(`/v1/recomendaciones${consulta}`).set(auth);
  expect(res.status).toBe(200);
  return res.body.recomendaciones as RecomendacionApi[];
};

describe('razones de las recomendaciones', () => {
  it('explica con valores reales: presupuesto, grupo, horario y una advertencia de ocupación', async () => {
    const r = (await recomendaciones()).find((x) => x.id === 1)!;
    expect(r.razones).toEqual([
      { codigo: 'preferencias', tipo: 'positiva', texto: 'Coincide con tus gustos: Cayos, Relax y Fotografía' },
      { codigo: 'presupuesto', tipo: 'positiva', texto: 'Parte del rango está en tu presupuesto: $85.000 – $125.000 por persona (estimado)' },
      { codigo: 'grupo', tipo: 'positiva', texto: 'Apto para ir en pareja' },
      { codigo: 'horario', tipo: 'positiva', texto: 'Abierto a las 12:30 (hasta las 16:00)' },
      // Clima del proveedor de prueba.
      { codigo: 'clima', tipo: 'positiva', texto: 'Buen clima a las 12:30: 29 °C y 10 % de probabilidad de lluvia' },
      { codigo: 'ocupacion', tipo: 'advertencia', texto: 'Ocupación alta a las 12:30 (82 %)' },
    ]);
    expect(r.porQue).toBe(
      'Coincide con Cayos, Relax y Fotografía y parte de su precio está en tu presupuesto, aunque habrá mucha gente a las 12:30.',
    );
    expect(r.precio).toEqual({ minCop: 85000, maxCop: 125000, estimado: true });
  });

  it('el presupuesto ajusta el puntaje con las mismas reglas que las razones', async () => {
    const lista = await recomendaciones();
    // Antes 70 y 70: Hoyo Soplador dentro del presupuesto (+5), Johnny Cay parcialmente (+2).
    expect(lista.map((r) => [r.nombre, r.puntaje])).toEqual([
      ['Hoyo Soplador', 75],
      ['Johnny Cay', 72],
      ['Playa de Spratt Bight', 13],
    ]);
    const hoyoR = lista[0]!;
    expect(hoyoR.razones).toContainEqual({ codigo: 'presupuesto', tipo: 'positiva', texto: 'Dentro de tu presupuesto: $0 – $5.000 por persona (estimado)' });
    expect(hoyoR.razones).toContainEqual({ codigo: 'ocupacion', tipo: 'positiva', texto: 'Ocupación baja a las 12:30 (25 %)' });
    // Sin horario no se afirma que esté abierto.
    expect(hoyoR.razones.map((x) => x.codigo)).not.toContain('horario');
    // Spratt Bight no tiene precio: se omite la razón.
    expect(lista[2]!.razones.map((x) => x.codigo)).not.toContain('presupuesto');
  });

  it('sin presupuesto guardado no hay razón ni ajuste de presupuesto', async () => {
    usuarioM.obtener.mockResolvedValue({ ...perfil, presupuesto_min_cop: null, presupuesto_max_cop: null });
    const lista = await recomendaciones();
    expect(lista.find((r) => r.id === 1)!.puntaje).toBe(70);
    expect(lista.flatMap((r) => r.razones).map((x) => x.codigo)).not.toContain('presupuesto');
  });

  it('el filtro rápido deja fuera lo que se sale del máximo y se usa para las razones', async () => {
    const res = await request(app).get('/v1/recomendaciones?presupuestoMin=0&presupuestoMax=50000').set(auth);
    expect(res.body.presupuesto).toEqual({ minCop: 0, maxCop: 50000 });
    expect(res.body.recomendaciones.map((r: RecomendacionApi) => r.nombre)).toEqual(['Hoyo Soplador', 'Playa de Spratt Bight']);
  });

  it('advierte cuando el destino está por encima del presupuesto', async () => {
    usuarioM.obtener.mockResolvedValue({ ...perfil, presupuesto_min_cop: 0, presupuesto_max_cop: 50000 });
    const r = (await recomendaciones()).find((x) => x.id === 1)!;
    expect(r.razones).toContainEqual({
      codigo: 'presupuesto',
      tipo: 'advertencia',
      texto: 'Por encima de tu presupuesto: desde $85.000 por persona (estimado)',
    });
    expect(r.puntaje).toBe(60); // 70 − 10
  });

  it('a la hora planeada: cerrado según el horario', async () => {
    const res = await request(app).get('/v1/recomendaciones?fecha=2026-09-30&hora=17:00').set(auth);
    expect(res.body).toMatchObject({ fecha: '2026-09-30', hora: '17:00' });
    const r = res.body.recomendaciones.find((x: RecomendacionApi) => x.id === 1) as RecomendacionApi;
    expect(r.razones).toContainEqual({ codigo: 'horario', tipo: 'advertencia', texto: 'Cerrado a las 17:00 (horario: 09:00 – 16:00)' });
    expect(r.razones.map((x) => x.codigo)).not.toContain('ocupacion');
  });

  it('la calificación solo cuenta con al menos 3 reseñas reales', async () => {
    resenaM.resumen.mockResolvedValue(new Map([[1, { promedio: 4.7, cantidad: 2 }]]));
    let r = (await recomendaciones()).find((x) => x.id === 1)!;
    expect(r.razones.map((x) => x.codigo)).not.toContain('calificacion');
    expect(r.puntaje).toBe(72);

    resenaM.resumen.mockResolvedValue(new Map([[1, { promedio: 4.3, cantidad: 3 }]]));
    r = (await recomendaciones()).find((x) => x.id === 1)!;
    expect(r.razones).toContainEqual({ codigo: 'calificacion', tipo: 'positiva', texto: 'Buena calificación: 4,3 ★ (3 reseñas)' });
    expect(r.puntaje).toBe(75);
  });

  it.each([
    ['?presupuestoMin=0', 'query.presupuestoMax'],
    ['?presupuestoMin=90000&presupuestoMax=10000', 'query.presupuestoMax'],
    ['?presupuestoMin=-5&presupuestoMax=10', 'query.presupuestoMin'],
    ['?hora=25:00', 'query.hora'],
  ])('400 con filtro inválido (%s)', async (consulta, campo) => {
    const res = await request(app).get(`/v1/recomendaciones${consulta}`).set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.detalles[0].campo).toBe(campo);
  });
});

describe('explicar (funciones puras)', () => {
  const base: DatosRazones = {
    categoria: 'playa',
    horario: null,
    hora: '10:00',
    gustos: [],
    grupos: [],
    precio: null,
    presupuesto: null,
    prediccion: undefined,
    motivoCierre: null,
    calificacion: null,
    nivelPreferido: null,
  };

  it('sin datos no inventa razones', () => {
    expect(explicar(base)).toEqual({ razones: [], porQue: '' });
  });

  it('cierre temporal con su motivo', () => {
    const prediccion = { estado: 'Cerrado', nivel: null, porcentaje: 0, clima: null } as unknown as DatosRazones['prediccion'];
    const { razones, porQue } = explicar({ ...base, prediccion, motivoCierre: 'Mantenimiento del muelle' });
    expect(razones).toEqual([{ codigo: 'horario', tipo: 'advertencia', texto: 'Cerrado temporalmente: Mantenimiento del muelle' }]);
    expect(porQue).toBe('Está cerrado temporalmente.');
  });

  it('lluvia probable al aire libre', () => {
    const prediccion = {
      estado: 'Abierto',
      nivel: 'Medio',
      porcentaje: 50,
      clima: { codigoClima: 61, probLluvia: 80, precipitacion: 1.2, temperatura: 27 },
    } as unknown as DatosRazones['prediccion'];
    const { razones } = explicar({ ...base, prediccion });
    expect(razones).toContainEqual({ codigo: 'clima', tipo: 'advertencia', texto: 'Lluvia probable a las 10:00 (80 % de probabilidad)' });
  });
});

describe('presupuesto en /v1/preferencias', () => {
  it('GET devuelve el presupuesto guardado', async () => {
    const res = await request(app).get('/v1/preferencias').set(auth);
    expect(res.body).toMatchObject({ presupuestoMin: 0, presupuestoMax: 100000 });
  });

  it('PUT guarda el presupuesto', async () => {
    const res = await request(app)
      .put('/v1/preferencias')
      .set(auth)
      .send({ categorias: ['cayo'], presupuestoMin: 20000, presupuestoMax: 80000 });
    expect(res.status).toBe(200);
    expect(usuarioM.actualizar).toHaveBeenCalledWith(expect.anything(), TURISTA, {
      nivel_ocupacion_preferido: null,
      presupuesto_min_cop: 20000,
      presupuesto_max_cop: 80000,
    });
  });

  it.each([
    [{ categorias: ['cayo'], presupuestoMin: 20000 }],
    [{ categorias: ['cayo'], presupuestoMin: 80000, presupuestoMax: 20000 }],
    [{ categorias: ['cayo'], presupuestoMin: 1.5, presupuestoMax: 20000 }],
  ])('PUT 400 con presupuesto inválido (%p)', async (cuerpo) => {
    const res = await request(app).put('/v1/preferencias').set(auth).send(cuerpo);
    expect(res.status).toBe(400);
  });
});

describe('reseñas', () => {
  it('GET público devuelve el promedio y las reseñas visibles', async () => {
    resenaM.resumen.mockResolvedValue(new Map([[1, { promedio: 4, cantidad: 1 }]]));
    resenaM.listarPorDestino.mockResolvedValue([{ ...resena(), autor: { nombre: 'Ana' } }]);
    const res = await request(app).get('/v1/destinos/1/resenas');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      calificacion: { promedio: 4, cantidad: 1 },
      resenas: [
        { id: 5, idDestino: 1, estrellas: 4, comentario: 'Muy bonito', fecha: '2026-10-01T15:00:00+00:00', autor: 'Ana', esMia: false, oculta: false },
      ],
    });
    expect(resenaM.listarPorDestino).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('el detalle del destino incluye la calificación', async () => {
    resenaM.resumen.mockResolvedValue(new Map([[1, { promedio: 3.7, cantidad: 3 }]]));
    const res = await request(app).get('/v1/destinos/1');
    expect(res.body).toMatchObject({ calificacion: { promedio: 3.7, cantidad: 3 }, precio: { minCop: 85000, maxCop: 125000, estimado: true } });
  });

  it('404 con destino inexistente', async () => {
    expect((await request(app).get('/v1/destinos/99/resenas')).status).toBe(404);
    expect((await request(app).put('/v1/destinos/99/resena').set(auth).send({ estrellas: 4 })).status).toBe(404);
  });

  it('PUT crea la reseña propia con el usuario del token', async () => {
    const res = await request(app).put('/v1/destinos/1/resena').set(auth).send({ estrellas: 5, comentario: '  ' });
    expect(res.status).toBe(200);
    expect(resenaM.crear).toHaveBeenCalledWith(expect.anything(), { id_usuario: TURISTA, id_destino: 1, estrellas: 5, comentario: null });
    expect(res.body).toMatchObject({ estrellas: 5, esMia: true });
  });

  it('PUT reemplaza la reseña si ya existía (una por destino)', async () => {
    resenaM.obtenerPropia.mockResolvedValue(resena());
    await request(app).put('/v1/destinos/1/resena').set(auth).send({ estrellas: 2, comentario: 'Mucha gente' });
    expect(resenaM.crear).not.toHaveBeenCalled();
    expect(resenaM.actualizar).toHaveBeenCalledWith(expect.anything(), 5, { estrellas: 2, comentario: 'Mucha gente' });
  });

  it.each([[{ estrellas: 0 }], [{ estrellas: 6 }], [{ estrellas: 3.5 }], [{}], [{ estrellas: 4, oculta: false }]])(
    'PUT 400 con cuerpo inválido (%p)',
    async (cuerpo) => {
      expect((await request(app).put('/v1/destinos/1/resena').set(auth).send(cuerpo)).status).toBe(400);
    },
  );

  it('GET y DELETE de la reseña propia', async () => {
    resenaM.obtenerPropia.mockResolvedValue(resena());
    const res = await request(app).get('/v1/destinos/1/resena').set(auth);
    expect(res.body.resena).toMatchObject({ id: 5, esMia: true });
    expect((await request(app).delete('/v1/destinos/1/resena').set(auth)).status).toBe(204);
    expect(resenaM.borrarPropia).toHaveBeenCalledWith(expect.anything(), TURISTA, 1);
  });

  it('401 sin token al escribir', async () => {
    expect((await request(app).put('/v1/destinos/1/resena').send({ estrellas: 4 })).status).toBe(401);
  });

  it('el administrador oculta una reseña y ve también las ocultas', async () => {
    const res = await request(app).patch('/v1/admin/resenas/5').set(authAdmin).send({ oculta: true });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 5, oculta: true });
    expect(resenaM.ocultar).toHaveBeenCalledWith(expect.anything(), 5, true);

    await request(app).get('/v1/admin/destinos/1/resenas').set(authAdmin);
    expect(resenaM.listarPorDestino).toHaveBeenCalledWith(expect.anything(), 1, true);
  });

  it('un turista no puede ocultar reseñas (403)', async () => {
    const res = await request(app).patch('/v1/admin/resenas/5').set(auth).send({ oculta: true });
    expect(res.status).toBe(403);
    expect(resenaM.ocultar).not.toHaveBeenCalled();
  });
});
