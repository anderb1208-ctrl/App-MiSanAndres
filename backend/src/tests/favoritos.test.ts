import request from 'supertest';
import { crearApp } from '../app';
import * as adminModel from '../models/adminModel';
import * as authModel from '../models/authModel';
import type { DestinoRow } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as resenaModel from '../models/resenaModel';
import * as dispositivoModel from '../models/dispositivoModel';
import * as favoritoModel from '../models/favoritoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import * as usuarioModel from '../models/usuarioModel';
import { ExpoPushProvider } from '../services/notificaciones/expoPushProvider';
import {
  type MensajePush,
  type ProveedorPush,
  type TicketPush,
  textoAviso,
  usarProveedorPush,
} from '../services/notificaciones/notificacionesService';
import * as fecha from '../utils/fecha';
import { johnnyCay, promediosHora } from './fixtures';

jest.mock('../models/authModel');
jest.mock('../models/usuarioModel');
jest.mock('../models/destinoModel');
jest.mock('../models/resenaModel');
jest.mock('../models/favoritoModel');
jest.mock('../models/dispositivoModel');
jest.mock('../models/adminModel');
jest.mock('../models/ocupacionModel');

const app = crearApp();
const ID = '6f1c2a3b-0000-4000-8000-000000000001';
const ADMIN = '6f1c2a3b-0000-4000-8000-000000000003';
const turista = { Authorization: 'Bearer token-turista' };
const admin = { Authorization: 'Bearer token-admin' };
const TOKEN = 'ExponentPushToken[abc123]';

class PushFalso implements ProveedorPush {
  readonly nombre = 'Falso';
  lotes: MensajePush[][] = [];
  invalidos = new Set<string>();
  fallar = false;
  async enviarLote(mensajes: MensajePush[]): Promise<TicketPush[]> {
    if (this.fallar) throw new Error('Expo Push respondió 503');
    this.lotes.push(mensajes);
    return mensajes.map((m) =>
      this.invalidos.has(m.to)
        ? { status: 'error', message: 'no registrado', details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: 'x' },
    );
  }
}
let push: PushFalso;

let destinoActual: DestinoRow;
beforeEach(() => {
  jest.mocked(resenaModel.resumen).mockResolvedValue(new Map());
  jest.mocked(resenaModel.listarPorDestino).mockResolvedValue([]);
  push = new PushFalso();
  usarProveedorPush(push);
  destinoActual = { ...johnnyCay };
  jest.spyOn(fecha, 'ahoraEnColombia').mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });
  jest.mocked(authModel.obtenerUsuarioDelToken).mockImplementation(async (t) =>
    t === 'token-turista' ? { id: ID, correo: 't@x.test' } : t === 'token-admin' ? { id: ADMIN, correo: 'a@x.test' } : null,
  );
  jest.mocked(usuarioModel.obtenerRol).mockImplementation(async (_db, id) => (id === ADMIN ? 'administrador' : 'turista'));
  jest.mocked(destinoModel.obtenerVisible).mockImplementation(async (_db, id) => (id === 1 ? destinoActual : null));
  jest.mocked(destinoModel.listarEtiquetas).mockResolvedValue([]);
  jest.mocked(ocupacionModel.promedioPorHora).mockResolvedValue(promediosHora);
  jest.mocked(favoritoModel.listar).mockResolvedValue([
    { id_usuario: ID, id_destino: 1, avisar_apertura: true, avisar_cierre: false, fecha_creacion: '2026-10-16T10:00:00Z', destino: johnnyCay },
  ]);
  jest.mocked(favoritoModel.guardar).mockImplementation(async (_db, f) => ({
    avisar_apertura: true,
    avisar_cierre: true,
    fecha_creacion: '2026-10-16T10:00:00Z',
    ...f,
  }));
  jest.mocked(favoritoModel.actualizar).mockImplementation(async (_db, idU, idD, c) =>
    idD === 1 ? { id_usuario: idU, id_destino: idD, avisar_apertura: true, avisar_cierre: true, fecha_creacion: 'x', ...c } : null,
  );
  jest.mocked(adminModel.obtenerDestino).mockImplementation(async () => destinoActual);
  jest.mocked(adminModel.editarDestino).mockImplementation(async (_db, _id, cambios) => ({ ...destinoActual, ...cambios }) as DestinoRow);
  jest.mocked(dispositivoModel.tokensParaAviso).mockResolvedValue([TOKEN]);
  jest.mocked(dispositivoModel.desactivar).mockImplementation(async (_db, tokens) => tokens.length);
});

describe('favoritos', () => {
  it('lista los favoritos con sus avisos y el destino', async () => {
    const res = await request(app).get('/v1/favoritos').set(turista);
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ idDestino: 1, avisarApertura: true, avisarCierre: false, destino: { id: 1, nombre: 'Johnny Cay' } });
  });

  it('cada favorito trae la ocupación de ahora (antes llegaba siempre null: "Sin datos de ocupación")', async () => {
    const res = await request(app).get('/v1/favoritos').set(turista);
    expect(res.status).toBe(200);
    expect(res.body[0].destino.ocupacionActual).toEqual({
      fecha: '2026-09-30',
      hora: '12:30',
      estado: 'Abierto',
      porcentaje: expect.any(Number),
      nivel: expect.stringMatching(/^(Bajo|Medio|Alto)$/),
      personasEstimadas: expect.any(Number),
    });
    // Igual que en Inicio: mismo servicio, misma hora de Colombia.
    const destinos = await request(app).get('/v1/destinos/1');
    expect(destinos.body.ocupacionActual?.porcentaje ?? res.body[0].destino.ocupacionActual.porcentaje).toBe(
      res.body[0].destino.ocupacionActual.porcentaje,
    );
  });

  it('calcula la ocupación de todos los favoritos en lote (una consulta de histórico)', async () => {
    jest.mocked(favoritoModel.listar).mockResolvedValue([
      { id_usuario: ID, id_destino: 1, avisar_apertura: true, avisar_cierre: false, fecha_creacion: 'x', destino: johnnyCay },
      { id_usuario: ID, id_destino: 6, avisar_apertura: true, avisar_cierre: false, fecha_creacion: 'x', destino: { ...johnnyCay, id_destino: 6, nombre: 'Otro cayo' } },
      { id_usuario: ID, id_destino: 3, avisar_apertura: true, avisar_cierre: false, fecha_creacion: 'x', destino: { ...johnnyCay, id_destino: 3, estado: 'inactivo' } },
    ]);
    jest.mocked(ocupacionModel.promedioPorHora).mockClear();
    const res = await request(app).get('/v1/favoritos').set(turista);
    expect(res.body.map((f: { destino: { ocupacionActual: unknown } | null }) => f.destino && Boolean(f.destino.ocupacionActual))).toEqual([true, true, null]);
    expect(ocupacionModel.promedioPorHora).toHaveBeenCalledTimes(1);
  });

  it('fuera del horario el favorito llega como Cerrado, no sin datos', async () => {
    jest.spyOn(fecha, 'ahoraEnColombia').mockReturnValue({ fecha: '2026-09-30', hora: '20:00' });
    const res = await request(app).get('/v1/favoritos').set(turista);
    expect(res.body[0].destino.ocupacionActual).toMatchObject({ estado: 'Cerrado', nivel: null, porcentaje: 0 });
  });

  it('agrega un favorito con los dos avisos activos por defecto', async () => {
    const res = await request(app).post('/v1/favoritos').set(turista).send({ idDestino: 1 });
    expect(res.status).toBe(201);
    expect(favoritoModel.guardar).toHaveBeenCalledWith(expect.anything(), { id_usuario: ID, id_destino: 1, avisar_apertura: true, avisar_cierre: true });
  });

  it('404 si el destino no existe; 400 con datos inválidos', async () => {
    expect((await request(app).post('/v1/favoritos').set(turista).send({ idDestino: 99 })).status).toBe(404);
    expect((await request(app).post('/v1/favoritos').set(turista).send({ idDestino: 'uno' })).status).toBe(400);
  });

  it('cambia un aviso y responde 404 si no era favorito', async () => {
    const res = await request(app).patch('/v1/favoritos/1').set(turista).send({ avisarCierre: false });
    expect(res.body).toEqual({ idDestino: 1, avisarApertura: true, avisarCierre: false });
    expect((await request(app).patch('/v1/favoritos/2').set(turista).send({ avisarCierre: false })).status).toBe(404);
    expect((await request(app).patch('/v1/favoritos/1').set(turista).send({})).status).toBe(400);
  });

  it('quita un favorito', async () => {
    const res = await request(app).delete('/v1/favoritos/1').set(turista);
    expect(res.status).toBe(204);
    expect(favoritoModel.quitar).toHaveBeenCalledWith(expect.anything(), ID, 1);
  });

  it('401 sin sesión', async () => {
    expect((await request(app).get('/v1/favoritos')).status).toBe(401);
  });
});

describe('dispositivos', () => {
  it('registra y quita el token de Expo', async () => {
    expect((await request(app).post('/v1/dispositivos').set(turista).send({ token: TOKEN, plataforma: 'ios' })).status).toBe(204);
    expect(dispositivoModel.registrar).toHaveBeenCalledWith(expect.anything(), TOKEN, 'ios');
    expect((await request(app).delete('/v1/dispositivos').set(turista).send({ token: TOKEN })).status).toBe(204);
    expect(dispositivoModel.quitar).toHaveBeenCalledWith(expect.anything(), TOKEN);
  });

  it('rechaza tokens que no son de Expo', async () => {
    const res = await request(app).post('/v1/dispositivos').set(turista).send({ token: 'abc', plataforma: 'ios' });
    expect(res.status).toBe(400);
  });
});

describe('cierre temporal y reapertura con aviso push', () => {
  it('al cerrar temporalmente avisa a los favoritos con "avisar cierre", con el motivo', async () => {
    const res = await request(app)
      .patch('/v1/admin/destinos/1/estado')
      .set(admin)
      .send({ estado: 'cerrado_temporal', motivo: 'mar de leva', hasta: '2099-01-01T08:00:00-05:00' });
    expect(res.status).toBe(200);
    expect(dispositivoModel.tokensParaAviso).toHaveBeenCalledWith(expect.anything(), 1, 'cierre');
    expect(adminModel.editarDestino).toHaveBeenCalledWith(expect.anything(), 1, {
      estado: 'cerrado_temporal',
      motivo_cierre: 'mar de leva',
      cierre_hasta: '2099-01-01T08:00:00-05:00',
    });
    expect(push.lotes[0]?.[0]).toMatchObject({
      to: TOKEN,
      title: 'Johnny Cay cerró temporalmente',
      body: expect.stringContaining('Motivo: mar de leva'),
      data: { tipo: 'destino', idDestino: 1, aviso: 'cierre' },
      channelId: 'avisos-destinos',
    });
    expect(res.body.aviso).toEqual({ tipo: 'cierre', destinatarios: 1, enviados: 1, fallidos: 0, tokensDesactivados: 0, error: null });
    expect(res.body.destino).toMatchObject({ estado: 'cerrado_temporal', cierre: { motivo: 'mar de leva' } });
  });

  it('al reabrir avisa a los que tienen "avisar apertura" y borra el motivo', async () => {
    destinoActual = { ...johnnyCay, estado: 'cerrado_temporal', motivo_cierre: 'mar de leva' };
    const res = await request(app).patch('/v1/admin/destinos/1/estado').set(admin).send({ estado: 'abierto' });
    expect(dispositivoModel.tokensParaAviso).toHaveBeenCalledWith(expect.anything(), 1, 'apertura');
    expect(adminModel.editarDestino).toHaveBeenCalledWith(expect.anything(), 1, { estado: 'abierto', motivo_cierre: null, cierre_hasta: null });
    expect(push.lotes[0]?.[0]?.title).toBe('Johnny Cay reabrió');
    expect(res.body.aviso.tipo).toBe('apertura');
  });

  it('envía en lotes de 100 y desactiva los tokens DeviceNotRegistered', async () => {
    const tokens = Array.from({ length: 150 }, (_, i) => `ExponentPushToken[t${i}]`);
    jest.mocked(dispositivoModel.tokensParaAviso).mockResolvedValue(tokens);
    push.invalidos.add('ExponentPushToken[t120]');
    const res = await request(app).patch('/v1/admin/destinos/1/estado').set(admin).send({ estado: 'cerrado_temporal' });
    expect(push.lotes.map((l) => l.length)).toEqual([100, 50]);
    expect(dispositivoModel.desactivar).toHaveBeenCalledWith(expect.anything(), ['ExponentPushToken[t120]']);
    expect(res.body.aviso).toMatchObject({ destinatarios: 150, enviados: 149, fallidos: 1, tokensDesactivados: 1 });
  });

  it('si Expo falla, el cambio de estado se mantiene y se informa el error', async () => {
    push.fallar = true;
    const res = await request(app).patch('/v1/admin/destinos/1/estado').set(admin).send({ estado: 'cerrado_temporal' });
    expect(res.status).toBe(200);
    expect(res.body.destino.estado).toBe('cerrado_temporal');
    expect(res.body.aviso.error).toContain('503');
  });

  it('ocultar no avisa; motivo fuera del cierre o fecha pasada → 400', async () => {
    const oculto = await request(app).patch('/v1/admin/destinos/1/estado').set(admin).send({ estado: 'inactivo' });
    expect(oculto.body.aviso).toBeNull();
    expect(push.lotes).toHaveLength(0);
    expect((await request(app).patch('/v1/admin/destinos/1/estado').set(admin).send({ estado: 'abierto', motivo: 'x y z' })).status).toBe(400);
    expect((await request(app).patch('/v1/admin/destinos/1/estado').set(admin).send({ estado: 'cerrado_temporal', hasta: '2020-01-01T00:00:00Z' })).status).toBe(400);
  });

  it('un turista no puede cerrar destinos', async () => {
    expect((await request(app).patch('/v1/admin/destinos/1/estado').set(turista).send({ estado: 'cerrado_temporal' })).status).toBe(403);
  });
});

describe('estado efectivo del cierre temporal', () => {
  it('con cierre vigente: el detalle muestra el motivo y la predicción dice Cerrado', async () => {
    destinoActual = { ...johnnyCay, estado: 'cerrado_temporal', motivo_cierre: 'mantenimiento', cierre_hasta: '2099-01-01T00:00:00Z' };
    const detalle = await request(app).get('/v1/destinos/1');
    expect(detalle.body).toMatchObject({ estado: 'cerrado_temporal', cierre: { motivo: 'mantenimiento', hasta: '2099-01-01T00:00:00Z' } });
    const p = await request(app).get('/v1/ocupacion/1/prediccion?fecha=2026-09-30&hora=12:30');
    expect(p.body.estado).toBe('Cerrado');
  });

  it('con cierre_hasta vencido el destino se considera abierto, sin tareas programadas', async () => {
    destinoActual = { ...johnnyCay, estado: 'cerrado_temporal', motivo_cierre: 'mantenimiento', cierre_hasta: '2020-01-01T00:00:00Z' };
    const detalle = await request(app).get('/v1/destinos/1');
    expect(detalle.body).toMatchObject({ estado: 'abierto', cierre: null });
    const p = await request(app).get('/v1/ocupacion/1/prediccion?fecha=2026-09-30&hora=12:30');
    expect(p.body.estado).toBe('Abierto');
  });
});

describe('ExpoPushProvider y textos', () => {
  it('envía el lote a la Expo Push API, con token de acceso si se configuró', async () => {
    const f = jest.fn(async () => new Response(JSON.stringify({ data: [{ status: 'ok', id: '1' }] }), { status: 200 }));
    const proveedor = new ExpoPushProvider({ accessToken: 'secreto', fetch: f as unknown as typeof fetch });
    const tickets = await proveedor.enviarLote([{ to: TOKEN, title: 't', body: 'b', data: {}, sound: 'default', channelId: 'c' }]);
    expect(tickets).toEqual([{ status: 'ok', id: '1' }]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secreto');
  });

  it('lanza error si Expo responde mal', async () => {
    const f = jest.fn(async () => new Response(JSON.stringify({ errors: [{ message: 'Too many' }] }), { status: 429 }));
    await expect(new ExpoPushProvider({ fetch: f as unknown as typeof fetch }).enviarLote([])).rejects.toThrow('429: Too many');
  });

  it('textos del aviso', () => {
    expect(textoAviso('Johnny Cay', 'cierre', null, null)).toEqual({
      title: 'Johnny Cay cerró temporalmente',
      body: 'Cerrado. Te avisaremos cuando reabra.',
    });
    expect(textoAviso('Johnny Cay', 'cierre', 'mar de leva', '2026-10-20T13:00:00Z').body).toMatch(/^Motivo: mar de leva\. Cerrado hasta el 20 de octubre/);
  });
});
