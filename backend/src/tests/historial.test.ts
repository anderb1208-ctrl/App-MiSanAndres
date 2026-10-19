import request from 'supertest';
import { crearApp } from '../app';
import * as authModel from '../models/authModel';
import type { TipoInteraccion } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as favoritoModel from '../models/favoritoModel';
import * as interaccionModel from '../models/interaccionModel';
import type { InteraccionConDestinoImagen } from '../models/interaccionModel';
import * as usuarioModel from '../models/usuarioModel';
import { calcular } from '../services/pasaporteService';
import { ErrorBaseDatos } from '../utils/errores';
import { destinos, johnnyCay, sprattBight } from './fixtures';

jest.mock('../models/authModel');
jest.mock('../models/destinoModel');
jest.mock('../models/favoritoModel');
jest.mock('../models/interaccionModel');
jest.mock('../models/usuarioModel');

const app = crearApp();
const interaccionM = jest.mocked(interaccionModel);
const ID = '6f1c2a3b-0000-4000-8000-000000000001';
const auth = { Authorization: 'Bearer token-valido' };

let siguienteId = 1;
function fila(idDestino: number, fechaHora: string, tipo: TipoInteraccion = 'vista'): InteraccionConDestinoImagen {
  const d = destinos.find((x) => x.id_destino === idDestino)!;
  return {
    id_interaccion: siguienteId++,
    id_usuario: ID,
    id_destino: idDestino,
    tipo_interaccion: tipo,
    fecha_hora: fechaHora,
    destino: { id_destino: d.id_destino, nombre: d.nombre, categoria: d.categoria, imagen_url: d.imagen_url },
  };
}

// De la más reciente a la más antigua, como las devuelve el modelo.
const historial = [
  fila(1, '2026-10-19T20:00:00Z'),
  fila(1, '2026-10-19T18:00:00Z'),
  fila(1, '2026-10-19T15:00:00Z', 'favorito'),
  fila(3, '2026-10-19T14:00:00Z'),
  // 03:00 UTC del 19 = 22:00 del 18 en Colombia: va en el día anterior.
  fila(1, '2026-10-19T03:00:00Z'),
  fila(6, '2026-10-10T12:00:00Z'),
];

beforeEach(() => {
  siguienteId = 100;
  jest.mocked(authModel.obtenerUsuarioDelToken).mockImplementation(async (t) => (t === 'token-valido' ? { id: ID, correo: 'a@x.test' } : null));
  jest.mocked(usuarioModel.obtenerRol).mockResolvedValue('turista');
  jest.mocked(destinoModel.listarVisibles).mockResolvedValue(destinos);
  interaccionM.listarParaHistorial.mockResolvedValue(historial);
  interaccionM.borrarDelUsuario.mockResolvedValue(6);
  interaccionM.populares.mockResolvedValue([
    { id_destino: 6, vistas: 42, usuarios: 17 },
    { id_destino: 1, vistas: 30, usuarios: 12 },
  ]);
  interaccionM.destinosYFechasDelUsuario.mockResolvedValue(historial.map(({ id_destino, fecha_hora }) => ({ id_destino, fecha_hora })));
  jest.mocked(favoritoModel.contar).mockResolvedValue(2);
});

describe('GET /v1/historial', () => {
  it('pide autenticación', async () => {
    expect((await request(app).get('/v1/historial')).status).toBe(401);
  });

  it('recientes: junta las visitas repetidas del mismo día y agrupa por día de Colombia', async () => {
    const res = await request(app).get('/v1/historial').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ filtro: 'recientes', pagina: 1, tamano: 20, total: 4, hayMas: false });
    expect(res.body.items.map((i: { dia: string; idDestino: number; veces: number }) => [i.dia, i.idDestino, i.veces])).toEqual([
      ['2026-10-19', 1, 3],
      ['2026-10-19', 3, 1],
      ['2026-10-18', 1, 1],
      ['2026-10-10', 6, 1],
    ]);
    expect(res.body.items[0]).toMatchObject({
      tipos: ['vista', 'favorito'],
      ultimaVez: '2026-10-19T20:00:00Z',
      destino: { id: 1, nombre: 'Johnny Cay', categoria: 'cayo', imagenUrl: johnnyCay.imagen_url },
    });
    expect(interaccionM.listarParaHistorial).toHaveBeenCalledWith(expect.anything(), ID, null, 1000);
  });

  it('última semana y último mes filtran desde la fecha correspondiente', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-20T00:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
    try {
      await request(app).get('/v1/historial?filtro=semana').set(auth);
      expect(interaccionM.listarParaHistorial).toHaveBeenLastCalledWith(expect.anything(), ID, '2026-10-13T00:00:00.000Z', 1000);
      await request(app).get('/v1/historial?filtro=mes').set(auth);
      expect(interaccionM.listarParaHistorial).toHaveBeenLastCalledWith(expect.anything(), ID, '2026-09-20T00:00:00.000Z', 1000);
    } finally {
      jest.useRealTimers();
    }
  });

  it('más vistos: los destinos del usuario ordenados por cantidad, sin día', async () => {
    const res = await request(app).get('/v1/historial?filtro=mas_vistos').set(auth);
    expect(res.body.items.map((i: { idDestino: number; veces: number; dia: null }) => [i.idDestino, i.veces, i.dia])).toEqual([
      [1, 4, null],
      [3, 1, null],
      [6, 1, null],
    ]);
  });

  it('populares: totales agregados de todos los usuarios, sin datos personales', async () => {
    const res = await request(app).get('/v1/historial?filtro=populares').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([
      { idDestino: 6, destino: { id: 6, nombre: sprattBight.nombre, categoria: 'playa', imagenUrl: null }, veces: 42, tipos: [], ultimaVez: null, dia: null, personas: 17 },
      expect.objectContaining({ idDestino: 1, veces: 30, personas: 12 }),
    ]);
    expect(JSON.stringify(res.body)).not.toContain(ID);
    expect(interaccionM.listarParaHistorial).not.toHaveBeenCalled();
  });

  it('populares sin la migración aplicada responde 503 con un mensaje claro', async () => {
    interaccionM.populares.mockRejectedValue(new ErrorBaseDatos('Destinos populares', { message: 'Could not find the function', code: 'PGRST202' }));
    const res = await request(app).get('/v1/historial?filtro=populares').set(auth);
    expect(res.status).toBe(503);
    expect(res.body.error.codigo).toBe('SERVICIO_NO_DISPONIBLE');
  });

  it('pagina los resultados', async () => {
    const res = await request(app).get('/v1/historial?pagina=2&tamano=3').set(auth);
    expect(res.body).toMatchObject({ pagina: 2, tamano: 3, total: 4, hayMas: false });
    expect(res.body.items).toHaveLength(1);
    const primera = await request(app).get('/v1/historial?pagina=1&tamano=3').set(auth);
    expect(primera.body.hayMas).toBe(true);
  });

  it.each(['filtro=todo', 'pagina=0', 'tamano=51', 'tamano=dos'])('400 con %s', async (q) => {
    const res = await request(app).get(`/v1/historial?${q}`).set(auth);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /v1/historial', () => {
  it('borra el historial del usuario del token', async () => {
    const res = await request(app).delete('/v1/historial').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ borradas: 6 });
    expect(interaccionM.borrarDelUsuario).toHaveBeenCalledWith(expect.anything(), ID);
    expect((await request(app).delete('/v1/historial')).status).toBe(401);
  });
});

describe('GET /v1/me/pasaporte', () => {
  it('cuenta explorados, favoritos y días activos, y calcula las insignias', async () => {
    const res = await request(app).get('/v1/me/pasaporte').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ explorados: 3, total: 3, porcentaje: 100, favoritos: 2, diasActivos: 3 });
    const codigos = res.body.insignias.map((i: { codigo: string }) => i.codigo);
    expect(codigos).toEqual(['primeros_pasos', 'cayos', 'playas', 'naturaleza', 'medio_camino', 'isleno']);
    expect(res.body.insignias.every((i: { desbloqueada: boolean }) => i.desbloqueada)).toBe(true);
  });

  it('pide autenticación', async () => {
    expect((await request(app).get('/v1/me/pasaporte')).status).toBe(401);
  });
});

describe('cálculo del pasaporte', () => {
  const catalogo = [
    { id_destino: 1, categoria: 'cayo' as const },
    { id_destino: 2, categoria: 'cayo' as const },
    { id_destino: 3, categoria: 'cayo' as const },
    { id_destino: 4, categoria: 'cayo' as const },
    { id_destino: 5, categoria: 'playa' as const },
    { id_destino: 6, categoria: 'cultura' as const },
  ];

  it('sin interacciones: todo bloqueado, con los destinos que faltan', () => {
    const p = calcular(catalogo, [], 0);
    expect(p).toMatchObject({ explorados: 0, total: 6, porcentaje: 0, diasActivos: 0 });
    const cayos = p.insignias.find((i) => i.codigo === 'cayos')!;
    expect(cayos).toMatchObject({ categoria: 'cayo', meta: 3, progreso: 0, desbloqueada: false, pendientes: [1, 2, 3, 4] });
    // La meta se ajusta a los destinos que hay: una sola playa.
    expect(p.insignias.find((i) => i.codigo === 'playas')).toMatchObject({ meta: 1, descripcion: 'Explora 1 playas' });
  });

  it('desbloquea por categoría y por avance, e ignora destinos ocultos', () => {
    const interacciones = [1, 2, 3, 99].map((id) => ({ id_destino: id, fecha_hora: '2026-10-19T15:00:00Z' }));
    const p = calcular(catalogo, interacciones, 1);
    expect(p.explorados).toBe(3); // el 99 ya no es visible
    expect(p.insignias.find((i) => i.codigo === 'cayos')).toMatchObject({ progreso: 3, desbloqueada: true, pendientes: [] });
    expect(p.insignias.find((i) => i.codigo === 'medio_camino')).toMatchObject({ meta: 3, desbloqueada: true });
    expect(p.insignias.find((i) => i.codigo === 'isleno')).toMatchObject({ progreso: 3, meta: 6, desbloqueada: false, pendientes: [4, 5, 6] });
    expect(p.porCategoria).toContainEqual({ categoria: 'cayo', explorados: 3, total: 4 });
    expect(p.diasActivos).toBe(1);
  });
});
