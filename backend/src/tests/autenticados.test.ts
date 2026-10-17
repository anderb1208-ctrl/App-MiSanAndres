import request from 'supertest';
import { crearApp } from '../app';
import type { UsuarioRow } from '../models/database.types';
import * as authModel from '../models/authModel';
import * as destinoModel from '../models/destinoModel';
import * as resenaModel from '../models/resenaModel';
import * as interaccionModel from '../models/interaccionModel';
import * as ocupacionModel from '../models/ocupacionModel';
import * as preferenciaModel from '../models/preferenciaModel';
import * as usuarioModel from '../models/usuarioModel';
import * as fecha from '../utils/fecha';
import { catalogo, destinos, etiquetas, johnnyCay, promediosHora } from './fixtures';

jest.mock('../models/authModel');
jest.mock('../models/destinoModel');
jest.mock('../models/resenaModel');
jest.mock('../models/interaccionModel');
jest.mock('../models/ocupacionModel');
jest.mock('../models/preferenciaModel');
jest.mock('../models/usuarioModel');

const app = crearApp();
const authM = jest.mocked(authModel);
const destinoM = jest.mocked(destinoModel);
const interaccionM = jest.mocked(interaccionModel);
const ocupacionM = jest.mocked(ocupacionModel);
const preferenciaM = jest.mocked(preferenciaModel);
const usuarioM = jest.mocked(usuarioModel);
const ahora = jest.spyOn(fecha, 'ahoraEnColombia');

const ID_USUARIO = '6f1c2a3b-0000-4000-8000-000000000001';
const TOKEN = 'token-valido';
const auth = { Authorization: `Bearer ${TOKEN}` };

const perfil: UsuarioRow = {
  id_usuario: ID_USUARIO,
  nombre: 'Ana Martínez',
  nivel_ocupacion_preferido: 'Bajo',
  fecha_registro: '2026-09-29T15:00:00+00:00',
  rol: 'turista',
  presupuesto_min_cop: null,
  presupuesto_max_cop: null,
};

beforeEach(() => {
  jest.mocked(resenaModel.resumen).mockResolvedValue(new Map());
  jest.mocked(resenaModel.listarPorDestino).mockResolvedValue([]);
  // Miércoles al mediodía: todos los destinos de prueba están abiertos.
  ahora.mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });
  authM.obtenerUsuarioDelToken.mockImplementation(async (token) =>
    token === TOKEN ? { id: ID_USUARIO, correo: 'ana@correo.com' } : null,
  );
  usuarioM.obtener.mockResolvedValue(perfil);
  usuarioM.actualizar.mockImplementation(async (_db, _id, cambios) => ({ ...perfil, ...cambios }));
  preferenciaM.listarCatalogo.mockResolvedValue(catalogo);
  // Cayos, Naturaleza, Relax, Fotografía, En pareja
  preferenciaM.listarIdsDelUsuario.mockResolvedValue([2, 3, 7, 12, 14]);
  destinoM.listarVisibles.mockResolvedValue(destinos);
  destinoM.obtenerVisible.mockImplementation(async (_db, id) => destinos.find((d) => d.id_destino === id) ?? null);
  destinoM.listarEtiquetas.mockResolvedValue(etiquetas);
  ocupacionM.promedioPorHora.mockResolvedValue(promediosHora);
});

const esperarError = (res: request.Response, status: number, codigo: string) => {
  expect(res.status).toBe(status);
  expect(res.body).toEqual({ error: expect.objectContaining({ codigo, mensaje: expect.any(String) }) });
};

describe('autenticación', () => {
  const rutas: [string, string][] = [
    ['get', '/v1/perfil'],
    ['put', '/v1/perfil'],
    ['get', '/v1/preferencias'],
    ['put', '/v1/preferencias'],
    ['delete', '/v1/preferencias'],
    ['get', '/v1/interacciones'],
    ['post', '/v1/interacciones'],
    ['get', '/v1/recomendaciones'],
  ];

  it.each(rutas)('%s %s → 401 sin token', async (metodo, ruta) => {
    const res = await (request(app) as unknown as Record<string, (r: string) => request.Test>)[metodo]!(ruta);
    esperarError(res, 401, 'NO_AUTENTICADO');
  });

  it.each(rutas)('%s %s → 401 con token inválido', async (metodo, ruta) => {
    const res = await (request(app) as unknown as Record<string, (r: string) => request.Test>)
      [metodo]!(ruta)
      .set('Authorization', 'Bearer token-vencido');
    esperarError(res, 401, 'NO_AUTENTICADO');
  });

  it.each(['token-valido', 'Basic abc', 'Bearer', 'Bearer a b'])('401 con cabecera mal formada (%s)', async (cabecera) => {
    esperarError(await request(app).get('/v1/perfil').set('Authorization', cabecera), 401, 'NO_AUTENTICADO');
  });

  it('la autenticación va antes de validar el cuerpo', async () => {
    esperarError(await request(app).put('/v1/perfil').send({ nombre: '' }), 401, 'NO_AUTENTICADO');
  });

  it('500 si Supabase Auth no responde', async () => {
    authM.obtenerUsuarioDelToken.mockRejectedValue(new Error('fetch failed'));
    esperarError(await request(app).get('/v1/perfil').set(auth), 500, 'ERROR_INTERNO');
  });
});

describe('/v1/perfil', () => {
  it('GET devuelve el perfil con el correo del token', async () => {
    const res = await request(app).get('/v1/perfil').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: ID_USUARIO,
      nombre: 'Ana Martínez',
      correo: 'ana@correo.com',
      nivelOcupacionPreferido: 'Bajo',
      fechaRegistro: '2026-09-29T15:00:00+00:00',
      rol: 'turista',
    });
    expect(usuarioM.obtener).toHaveBeenCalledWith(expect.anything(), ID_USUARIO);
  });

  it('GET 404 si el perfil no existe', async () => {
    usuarioM.obtener.mockResolvedValue(null);
    esperarError(await request(app).get('/v1/perfil').set(auth), 404, 'NO_ENCONTRADO');
  });

  it('PUT actualiza el nombre (recortando espacios)', async () => {
    const res = await request(app).put('/v1/perfil').set(auth).send({ nombre: '  Ana María ' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Ana María');
    expect(usuarioM.actualizar).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, { nombre: 'Ana María' });
  });

  it.each([{}, { nombre: '   ' }, { nombre: 42 }, { nombre: 'Ana', id_usuario: 'otro' }])(
    'PUT 400 con cuerpo inválido (%p)',
    async (cuerpo) => {
      esperarError(await request(app).put('/v1/perfil').set(auth).send(cuerpo), 400, 'SOLICITUD_INVALIDA');
      expect(usuarioM.actualizar).not.toHaveBeenCalled();
    },
  );

  it('PUT 400 con JSON mal formado', async () => {
    const res = await request(app)
      .put('/v1/perfil')
      .set(auth)
      .set('Content-Type', 'application/json')
      .send('{"nombre": ');
    esperarError(res, 400, 'SOLICITUD_INVALIDA');
  });

  it('PUT 404 si el perfil no existe', async () => {
    usuarioM.actualizar.mockResolvedValue(null);
    esperarError(await request(app).put('/v1/perfil').set(auth).send({ nombre: 'Ana' }), 404, 'NO_ENCONTRADO');
  });
});

describe('/v1/preferencias', () => {
  it('GET devuelve los códigos agrupados y el nivel preferido', async () => {
    const res = await request(app).get('/v1/preferencias').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      categorias: ['cayo', 'naturaleza'],
      tiposExperiencia: ['relax', 'fotografia'],
      tiposGrupo: ['pareja'],
      nivelOcupacion: 'Bajo',
      presupuestoMin: null,
      presupuestoMax: null,
    });
  });

  it('GET 404 si el perfil no existe', async () => {
    usuarioM.obtener.mockResolvedValue(null);
    esperarError(await request(app).get('/v1/preferencias').set(auth), 404, 'NO_ENCONTRADO');
  });

  it('PUT aplica solo la diferencia y guarda el nivel', async () => {
    const res = await request(app)
      .put('/v1/preferencias')
      .set(auth)
      .send({ categorias: ['playa', 'cayo', 'playa'], tiposExperiencia: ['aventura'], nivelOcupacion: 'Medio' });
    expect(res.status).toBe(200);
    expect(usuarioM.actualizar).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, {
      nivel_ocupacion_preferido: 'Medio',
      presupuesto_min_cop: null,
      presupuesto_max_cop: null,
    });
    expect(preferenciaM.agregar).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, [1, 8]);
    expect(preferenciaM.quitar).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, [3, 7, 12, 14]);
  });

  it('PUT sin nivelOcupacion lo deja en null', async () => {
    await request(app).put('/v1/preferencias').set(auth).send({ categorias: ['cayo'] });
    expect(usuarioM.actualizar).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, {
      nivel_ocupacion_preferido: null,
      presupuesto_min_cop: null,
      presupuesto_max_cop: null,
    });
  });

  it.each([
    [{}, 'body.categorias'],
    [{ categorias: [] }, 'body.categorias'],
    [{ categorias: 'playa' }, 'body.categorias'],
    [{ categorias: ['playa'], nivelOcupacion: 'Muy alto' }, 'body.nivelOcupacion'],
    [{ categorias: ['playa'], usuarioId: 5 }, 'body'],
  ])('PUT 400 con cuerpo inválido (%p)', async (cuerpo, campo) => {
    const res = await request(app).put('/v1/preferencias').set(auth).send(cuerpo);
    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.error.detalles[0].campo).toBe(campo);
  });

  it('PUT 400 si un código no existe en el catálogo o es de otro tipo', async () => {
    const res = await request(app)
      .put('/v1/preferencias')
      .set(auth)
      .send({ categorias: ['playa', 'relax'], tiposGrupo: ['mascotas'] });
    esperarError(res, 400, 'SOLICITUD_INVALIDA');
    expect(res.body.error.detalles.map((d: { campo: string }) => d.campo)).toEqual([
      'body.categorias.1',
      'body.tiposGrupo.0',
    ]);
    expect(preferenciaM.agregar).not.toHaveBeenCalled();
  });

  it('DELETE borra todo y responde 204', async () => {
    const res = await request(app).delete('/v1/preferencias').set(auth);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(preferenciaM.quitarTodas).toHaveBeenCalledWith(expect.anything(), ID_USUARIO);
    expect(usuarioM.actualizar).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, {
      nivel_ocupacion_preferido: null,
      presupuesto_min_cop: null,
      presupuesto_max_cop: null,
    });
  });

  it('DELETE 404 si el perfil no existe', async () => {
    usuarioM.actualizar.mockResolvedValue(null);
    esperarError(await request(app).delete('/v1/preferencias').set(auth), 404, 'NO_ENCONTRADO');
  });
});

describe('/v1/interacciones', () => {
  it('POST registra la interacción del usuario del token', async () => {
    interaccionM.crear.mockResolvedValue({
      id_interaccion: 50,
      id_usuario: ID_USUARIO,
      id_destino: 1,
      tipo_interaccion: 'vista',
      fecha_hora: '2026-09-29T20:00:00+00:00',
    });
    const res = await request(app).post('/v1/interacciones').set(auth).send({ idDestino: 1, tipo: 'vista' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 50, idDestino: 1, tipo: 'vista', fechaHora: '2026-09-29T20:00:00+00:00' });
    expect(interaccionM.crear).toHaveBeenCalledWith(expect.anything(), {
      idUsuario: ID_USUARIO,
      idDestino: 1,
      tipo: 'vista',
    });
  });

  it.each([
    {},
    { idDestino: '1', tipo: 'vista' },
    { idDestino: 0, tipo: 'vista' },
    { idDestino: 1, tipo: 'me_gusta' },
    { idDestino: 1, tipo: 'vista', idUsuario: 'otro' },
  ])('POST 400 con cuerpo inválido (%p)', async (cuerpo) => {
    esperarError(await request(app).post('/v1/interacciones').set(auth).send(cuerpo), 400, 'SOLICITUD_INVALIDA');
    expect(interaccionM.crear).not.toHaveBeenCalled();
  });

  it('POST 404 si el destino no existe', async () => {
    const res = await request(app).post('/v1/interacciones').set(auth).send({ idDestino: 999, tipo: 'vista' });
    esperarError(res, 404, 'NO_ENCONTRADO');
    expect(interaccionM.crear).not.toHaveBeenCalled();
  });

  it('GET devuelve el historial propio con el destino', async () => {
    interaccionM.listarDelUsuario.mockResolvedValue([
      {
        id_interaccion: 50,
        id_usuario: ID_USUARIO,
        id_destino: 1,
        tipo_interaccion: 'vista',
        fecha_hora: '2026-09-29T20:00:00+00:00',
        destino: { id_destino: 1, nombre: 'Johnny Cay', categoria: 'cayo' },
      },
    ]);
    const res = await request(app).get('/v1/interacciones').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 50,
        idDestino: 1,
        tipo: 'vista',
        fechaHora: '2026-09-29T20:00:00+00:00',
        destino: { id: 1, nombre: 'Johnny Cay', categoria: 'cayo' },
      },
    ]);
    expect(interaccionM.listarDelUsuario).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, 50);
  });

  it('GET acepta un límite', async () => {
    interaccionM.listarDelUsuario.mockResolvedValue([]);
    await request(app).get('/v1/interacciones?limite=10').set(auth);
    expect(interaccionM.listarDelUsuario).toHaveBeenCalledWith(expect.anything(), ID_USUARIO, 10);
  });

  it.each(['0', '101', 'diez'])('GET 400 con límite inválido (%s)', async (limite) => {
    esperarError(await request(app).get(`/v1/interacciones?limite=${limite}`).set(auth), 400, 'SOLICITUD_INVALIDA');
  });
});

describe('GET /v1/recomendaciones', () => {
  it('puntúa por coincidencias y ajusta por ocupación frente al nivel preferido', async () => {
    const res = await request(app).get('/v1/recomendaciones').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tienePreferencias: true, nivelOcupacionPreferido: 'Bajo' });

    const resumen = res.body.recomendaciones.map((r: { nombre: string; puntaje: number; razon: string }) => [
      r.nombre,
      r.puntaje,
      r.razon,
    ]);
    // Hoyo Soplador y Johnny Cay empatan en 70: gana el de menor ocupación.
    expect(resumen).toEqual([
      ['Hoyo Soplador', 70, 'Coincide con Naturaleza y Fotografía · ocupación baja ahora, como prefieres'],
      ['Johnny Cay', 70, 'Coincide con Cayos y Relax (+2) · ocupación alta ahora'],
      ['Playa de Spratt Bight', 13, 'Coincide con Relax · ocupación media ahora'],
    ]);
    expect(res.body.recomendaciones[1]).toMatchObject({
      id: 1,
      coincidencias: ['Cayos', 'Relax', 'Fotografía', 'En pareja'],
      ocupacionActual: { porcentaje: 82.4, nivel: 'Alto' },
    });
    expect(destinoM.listarVisibles).toHaveBeenCalledWith(expect.anything(), { soloAbiertos: true });
  });

  it('sin nivel preferido no ajusta el puntaje', async () => {
    usuarioM.obtener.mockResolvedValue({ ...perfil, nivel_ocupacion_preferido: null });
    const res = await request(app).get('/v1/recomendaciones').set(auth);
    const johnny = res.body.recomendaciones.find((r: { id: number }) => r.id === johnnyCay.id_destino);
    expect(johnny.puntaje).toBe(85);
    expect(johnny.razon).toBe('Coincide con Cayos y Relax (+2) · ocupación alta ahora');
  });

  it('penaliza y avisa cuando el destino está cerrado a esta hora', async () => {
    ahora.mockReturnValue({ fecha: '2026-09-30', hora: '17:00' });
    const res = await request(app).get('/v1/recomendaciones').set(auth);
    const resumen = res.body.recomendaciones.map((r: { nombre: string; puntaje: number; razon: string }) => [
      r.nombre,
      r.puntaje,
      r.razon,
    ]);
    // Johnny Cay (09:00–16:00) está cerrado: 85 − 15; empata con Hoyo Soplador y queda después por estar cerrado.
    expect(resumen[0][0]).toBe('Hoyo Soplador');
    expect(resumen).toContainEqual(['Johnny Cay', 70, 'Coincide con Cayos y Relax (+2) · cerrado ahora']);
    const johnny = res.body.recomendaciones.find((r: { id: number }) => r.id === 1);
    expect(johnny.ocupacionActual).toMatchObject({ estado: 'Cerrado', nivel: null });
  });

  it('omite destinos sin coincidencias', async () => {
    preferenciaM.listarIdsDelUsuario.mockResolvedValue([2]); // solo Cayos
    const res = await request(app).get('/v1/recomendaciones').set(auth);
    expect(res.body.recomendaciones.map((r: { nombre: string }) => r.nombre)).toEqual(['Johnny Cay']);
  });

  it('sin predicción no menciona la ocupación', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([]);
    const res = await request(app).get('/v1/recomendaciones').set(auth);
    const johnny = res.body.recomendaciones.find((r: { id: number }) => r.id === 1);
    expect(johnny).toMatchObject({ puntaje: 85, ocupacionActual: null, razon: 'Coincide con Cayos y Relax (+2)' });
  });

  it('lista vacía si el usuario no tiene preferencias', async () => {
    preferenciaM.listarIdsDelUsuario.mockResolvedValue([]);
    const res = await request(app).get('/v1/recomendaciones').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tienePreferencias: false, recomendaciones: [] });
    expect(destinoM.listarVisibles).not.toHaveBeenCalled();
  });

  it('404 si el perfil no existe', async () => {
    usuarioM.obtener.mockResolvedValue(null);
    esperarError(await request(app).get('/v1/recomendaciones').set(auth), 404, 'NO_ENCONTRADO');
  });
});
