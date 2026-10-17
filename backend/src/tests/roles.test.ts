import request from 'supertest';
import { crearApp } from '../app';
import * as adminModel from '../models/adminModel';
import * as authModel from '../models/authModel';
import type { RolUsuario, UsuarioRow } from '../models/database.types';
import * as ticketModel from '../models/ticketModel';
import * as usuarioModel from '../models/usuarioModel';
import { ErrorBaseDatos } from '../utils/errores';
import { johnnyCay } from './fixtures';

jest.mock('../models/authModel');
jest.mock('../models/usuarioModel');
jest.mock('../models/ticketModel');
jest.mock('../models/adminModel');

const app = crearApp();
const authM = jest.mocked(authModel);
const usuarioM = jest.mocked(usuarioModel);
const ticketM = jest.mocked(ticketModel);
const adminM = jest.mocked(adminModel);

const IDS: Record<RolUsuario, string> = {
  turista: '6f1c2a3b-0000-4000-8000-000000000001',
  tecnico: '6f1c2a3b-0000-4000-8000-000000000002',
  administrador: '6f1c2a3b-0000-4000-8000-000000000003',
};
const OTRO_ADMIN = '6f1c2a3b-0000-4000-8000-000000000004';
const como = (rol: RolUsuario) => ({ Authorization: `Bearer token-${rol}` });

const fila = (rol: RolUsuario): UsuarioRow => ({
  id_usuario: IDS[rol],
  nombre: `Usuario ${rol}`,
  nivel_ocupacion_preferido: null,
  fecha_registro: '2026-10-01T15:00:00+00:00',
  rol,
});

const ticket = (extra: Partial<ticketModel.TicketConRelaciones> = {}): ticketModel.TicketConRelaciones => ({
  id_ticket: 7,
  id_usuario: IDS.turista,
  id_destino: 5,
  categoria: 'informacion_incorrecta',
  asunto: 'Horario equivocado',
  descripcion: 'El horario de Johnny Cay no coincide.',
  prioridad: 'media',
  estado: 'abierto',
  id_tecnico: null,
  fecha_creacion: '2026-10-16T14:00:00+00:00',
  fecha_actualizacion: '2026-10-16T14:00:00+00:00',
  fecha_cierre: null,
  destino: { id_destino: 5, nombre: 'Johnny Cay' },
  creador: { nombre: 'Usuario turista' },
  tecnico: null,
  ...extra,
});

beforeEach(() => {
  authM.obtenerUsuarioDelToken.mockImplementation(async (token) => {
    const rol = (Object.keys(IDS) as RolUsuario[]).find((r) => token === `token-${r}`);
    return rol ? { id: IDS[rol], correo: `${rol}@misanandres.test` } : null;
  });
  usuarioM.obtenerRol.mockImplementation(async (_db, id) => (Object.keys(IDS) as RolUsuario[]).find((r) => IDS[r] === id) ?? null);
  usuarioM.obtener.mockImplementation(async (_db, id) => {
    const rol = (Object.keys(IDS) as RolUsuario[]).find((r) => IDS[r] === id);
    return rol ? fila(rol) : null;
  });
  ticketM.crear.mockImplementation(async (_db, t) => ticket({ ...t, id_destino: t.id_destino ?? null }));
  ticketM.listar.mockResolvedValue([ticket()]);
  ticketM.obtener.mockImplementation(async (_db, id) => (id === 7 ? ticket() : null));
  ticketM.actualizar.mockImplementation(async (_db, _id, cambios) => ticket(cambios));
  ticketM.listarComentarios.mockResolvedValue([
    { id_comentario: 1, id_ticket: 7, id_usuario: IDS.tecnico, comentario: 'Lo revisamos.', fecha: '2026-10-16T15:00:00+00:00', autor: null },
  ]);
  ticketM.crearComentario.mockImplementation(async (_db, c) => ({ ...c, id_comentario: 2, fecha: '2026-10-16T16:00:00+00:00', autor: { nombre: 'Usuario turista', rol: 'turista' } }));
  adminM.listarUsuarios.mockResolvedValue([
    { id_usuario: IDS.turista, nombre: 'Usuario turista', correo: 'turista@misanandres.test', rol: 'turista', fecha_registro: '2026-10-01T15:00:00+00:00' },
    { id_usuario: IDS.administrador, nombre: 'Usuario administrador', correo: 'administrador@misanandres.test', rol: 'administrador', fecha_registro: '2026-10-01T15:00:00+00:00' },
  ]);
  adminM.cambiarRol.mockImplementation(async (_db, id, rol) => ({ ...fila('turista'), id_usuario: id, rol }));
  adminM.metricas.mockResolvedValue({ usuarios: { total: 2 } });
  adminM.crearDestino.mockImplementation(async (_db, d) => ({ ...johnnyCay, ...d, id_destino: 31 }) as typeof johnnyCay);
  adminM.editarDestino.mockImplementation(async (_db, id, cambios) => (id === 1 ? ({ ...johnnyCay, ...cambios } as typeof johnnyCay) : null));
  adminM.listarDestinos.mockResolvedValue([{ ...johnnyCay, estado: 'inactivo' }]);
});

describe('GET /v1/me', () => {
  it('devuelve el usuario con su rol leído de la base', async () => {
    const res = await request(app).get('/v1/me').set(como('tecnico'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: IDS.tecnico, correo: 'tecnico@misanandres.test', rol: 'tecnico' });
  });

  it('401 sin token', async () => {
    expect((await request(app).get('/v1/me')).status).toBe(401);
  });
});

describe('requiereRol', () => {
  it.each([
    ['patch', '/v1/tickets/7', { estado: 'resuelto' }],
    ['get', '/v1/admin/usuarios', undefined],
    ['get', '/v1/admin/metricas', undefined],
    ['post', '/v1/admin/destinos', {}],
    ['patch', `/v1/admin/usuarios/${IDS.turista}/rol`, { rol: 'administrador' }],
  ])('un turista recibe 403 en %s %s', async (metodo, ruta, cuerpo) => {
    const peticion = (request(app) as unknown as Record<string, (r: string) => request.Test>)[metodo]!(ruta).set(como('turista'));
    const res = await (cuerpo ? peticion.send(cuerpo) : peticion);
    expect(res.status).toBe(403);
    expect(res.body.error.codigo).toBe('PROHIBIDO');
  });

  it('el técnico no entra al panel del administrador', async () => {
    expect((await request(app).get('/v1/admin/usuarios').set(como('tecnico'))).status).toBe(403);
  });

  it('el rol sale de la base, no del cuerpo de la petición', async () => {
    const res = await request(app).patch('/v1/tickets/7').set(como('turista')).send({ estado: 'resuelto', rol: 'administrador' });
    expect(res.status).toBe(403);
    expect(ticketM.actualizar).not.toHaveBeenCalled();
  });

  it('un error de permisos de la base (RLS) se responde como 403', async () => {
    adminM.listarUsuarios.mockRejectedValue(new ErrorBaseDatos('Listar usuarios', { message: 'Solo un administrador…', code: '42501' }));
    const res = await request(app).get('/v1/admin/usuarios').set(como('administrador'));
    expect(res.status).toBe(403);
  });
});

describe('tickets', () => {
  it('cualquier usuario crea un ticket a su nombre', async () => {
    const res = await request(app)
      .post('/v1/tickets')
      .set(como('turista'))
      .send({ categoria: 'informacion_incorrecta', asunto: 'Horario equivocado', descripcion: 'El horario no coincide.', idDestino: 5 });
    expect(res.status).toBe(201);
    expect(ticketM.crear).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id_usuario: IDS.turista, id_destino: 5, prioridad: 'media' }));
    expect(res.body).toMatchObject({ id: 7, estado: 'abierto', destino: { id: 5, nombre: 'Johnny Cay' }, esPropio: true });
  });

  it('no acepta un usuario ni un estado enviados en el cuerpo', async () => {
    const res = await request(app)
      .post('/v1/tickets')
      .set(como('turista'))
      .send({ categoria: 'app', asunto: 'Hola', descripcion: 'Descripción', idUsuario: IDS.administrador, estado: 'cerrado' });
    expect(res.status).toBe(400);
  });

  it('valida los campos', async () => {
    const res = await request(app).post('/v1/tickets').set(como('turista')).send({ categoria: 'x', asunto: 'a', descripcion: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.detalles.map((d: { campo: string }) => d.campo)).toEqual(
      expect.arrayContaining(['body.categoria', 'body.asunto', 'body.descripcion']),
    );
  });

  it('el turista solo lista los suyos (filtro además de RLS)', async () => {
    await request(app).get('/v1/tickets?estado=abierto').set(como('turista'));
    expect(ticketM.listar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idUsuario: IDS.turista, estado: 'abierto' }));
  });

  it('el técnico lista todos y puede pedir solo los asignados a él', async () => {
    await request(app).get('/v1/tickets?prioridad=alta').set(como('tecnico'));
    expect(ticketM.listar).toHaveBeenLastCalledWith(expect.anything(), expect.not.objectContaining({ idUsuario: expect.anything() }));
    await request(app).get('/v1/tickets?asignadosAMi=true').set(como('tecnico'));
    expect(ticketM.listar).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ idTecnico: IDS.tecnico }));
  });

  it('detalle con comentarios; el autor no visible por RLS queda sin nombre', async () => {
    const res = await request(app).get('/v1/tickets/7').set(como('turista'));
    expect(res.status).toBe(200);
    expect(res.body.comentarios).toEqual([
      expect.objectContaining({ comentario: 'Lo revisamos.', autor: { id: IDS.tecnico, nombre: null, rol: null, esYo: false } }),
    ]);
  });

  it('404 si el ticket no existe o RLS no deja verlo', async () => {
    const res = await request(app).get('/v1/tickets/99').set(como('turista'));
    expect(res.status).toBe(404);
  });

  it('el técnico cambia estado, prioridad y asignación', async () => {
    const res = await request(app).patch('/v1/tickets/7').set(como('tecnico')).send({ estado: 'en_revision', idTecnico: IDS.tecnico });
    expect(res.status).toBe(200);
    expect(ticketM.actualizar).toHaveBeenCalledWith(expect.anything(), 7, { estado: 'en_revision', id_tecnico: IDS.tecnico });
    expect(res.body).toMatchObject({ estado: 'en_revision', tecnico: { id: IDS.tecnico } });
  });

  it('PATCH sin cambios responde 400', async () => {
    expect((await request(app).patch('/v1/tickets/7').set(como('tecnico')).send({})).status).toBe(400);
  });

  it('comentar un ticket visible', async () => {
    const res = await request(app).post('/v1/tickets/7/comentarios').set(como('turista')).send({ comentario: 'Gracias' });
    expect(res.status).toBe(201);
    expect(ticketM.crearComentario).toHaveBeenCalledWith(expect.anything(), { id_ticket: 7, id_usuario: IDS.turista, comentario: 'Gracias' });
  });
});

describe('administración', () => {
  it('lista usuarios con correo y rol', async () => {
    const res = await request(app).get('/v1/admin/usuarios').set(como('administrador'));
    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual({ id: IDS.turista, nombre: 'Usuario turista', correo: 'turista@misanandres.test', rol: 'turista', fechaRegistro: expect.any(String) });
  });

  it('cambia el rol de otro usuario', async () => {
    const res = await request(app).patch(`/v1/admin/usuarios/${IDS.turista}/rol`).set(como('administrador')).send({ rol: 'tecnico' });
    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('tecnico');
    expect(adminM.cambiarRol).toHaveBeenCalledWith(expect.anything(), IDS.turista, 'tecnico');
  });

  it('no puede quitarse su propio rol', async () => {
    const res = await request(app).patch(`/v1/admin/usuarios/${IDS.administrador}/rol`).set(como('administrador')).send({ rol: 'turista' });
    expect(res.status).toBe(400);
    expect(res.body.error.mensaje).toContain('propio rol');
    expect(adminM.cambiarRol).not.toHaveBeenCalled();
  });

  it('no deja el sistema sin administradores', async () => {
    adminM.listarUsuarios.mockResolvedValue([
      { id_usuario: OTRO_ADMIN, nombre: 'Otro', correo: null, rol: 'administrador', fecha_registro: '2026-10-01T15:00:00+00:00' },
    ]);
    // El que llama no figura como administrador (p. ej. lo degradaron en otra sesión); el último admin no se degrada.
    const res = await request(app).patch(`/v1/admin/usuarios/${OTRO_ADMIN}/rol`).set(como('administrador')).send({ rol: 'tecnico' });
    expect(res.status).toBe(400);
    expect(res.body.error.mensaje).toContain('al menos un administrador');
  });

  it('la regla de negocio de la base (P0001) llega como 400 con su mensaje', async () => {
    adminM.cambiarRol.mockRejectedValue(new ErrorBaseDatos('Cambiar rol', { message: 'El sistema debe tener al menos un administrador.', code: 'P0001' }));
    const res = await request(app).patch(`/v1/admin/usuarios/${IDS.turista}/rol`).set(como('administrador')).send({ rol: 'tecnico' });
    expect(res.status).toBe(400);
    expect(res.body.error.mensaje).toBe('El sistema debe tener al menos un administrador.');
  });

  it('rol inválido o id que no es UUID → 400', async () => {
    expect((await request(app).patch('/v1/admin/usuarios/abc/rol').set(como('administrador')).send({ rol: 'tecnico' })).status).toBe(400);
    expect((await request(app).patch(`/v1/admin/usuarios/${IDS.turista}/rol`).set(como('administrador')).send({ rol: 'jefe' })).status).toBe(400);
  });

  it('métricas', async () => {
    const res = await request(app).get('/v1/admin/metricas').set(como('administrador'));
    expect(res.body).toEqual({ usuarios: { total: 2 } });
  });

  it('crea, edita, oculta y lista destinos (incluidos los ocultos)', async () => {
    const nuevo = await request(app).post('/v1/admin/destinos').set(como('administrador')).send({
      nombre: 'Mirador nuevo', categoria: 'naturaleza', latitud: 12.55, longitud: -81.72, ubicacion: 'La Loma', capacidad: 50,
      horarioApertura: '08:00', horarioCierre: '17:00',
    });
    expect(nuevo.status).toBe(201);
    expect(adminM.crearDestino).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ubicacion_texto: 'La Loma', ubicacion_fuente: 'manual' }));

    const editado = await request(app).patch('/v1/admin/destinos/1').set(como('administrador')).send({ capacidad: 900 });
    expect(editado.body.capacidad).toBe(900);

    const oculto = await request(app).patch('/v1/admin/destinos/1/estado').set(como('administrador')).send({ estado: 'inactivo' });
    expect(oculto.body.estado).toBe('inactivo');

    expect((await request(app).get('/v1/admin/destinos').set(como('administrador'))).body[0].estado).toBe('inactivo');
  });

  it('valida el horario del destino y responde 404 si no existe', async () => {
    const horario = await request(app).patch('/v1/admin/destinos/1').set(como('administrador')).send({ horarioApertura: '18:00', horarioCierre: '08:00' });
    expect(horario.status).toBe(400);
    expect((await request(app).patch('/v1/admin/destinos/99').set(como('administrador')).send({ capacidad: 10 })).status).toBe(404);
  });
});
