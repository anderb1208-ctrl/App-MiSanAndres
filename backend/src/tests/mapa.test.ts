import request from 'supertest';
import { crearApp } from '../app';
import * as destinoModel from '../models/destinoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import * as fecha from '../utils/fecha';
import { proveedorFalso } from './climaFalso';
import { destinos, hoyoSoplador, johnnyCay, promediosHora } from './fixtures';

jest.mock('../models/destinoModel');
jest.mock('../models/ocupacionModel');

const app = crearApp();
const destinoM = jest.mocked(destinoModel);
const ocupacionM = jest.mocked(ocupacionModel);
const ahora = jest.spyOn(fecha, 'ahoraEnColombia');

beforeEach(() => {
  // Miércoles 30 de septiembre de 2026, 12:30: Johnny Cay (09:00–16:00) abierto.
  ahora.mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });
  destinoM.listarVisibles.mockResolvedValue(destinos);
  ocupacionM.promedioPorHora.mockResolvedValue(promediosHora);
});

const porId = (body: { destinos: { id: number; ocupacion: unknown }[] }, id: number) =>
  body.destinos.find((d) => d.id === id);

describe('GET /v1/mapa', () => {
  it('devuelve todos los destinos con coordenadas y la ocupación de ahora en una sola respuesta', async () => {
    const res = await request(app).get('/v1/mapa');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fecha: '2026-09-30', hora: '12:30', motivoSinClima: null });
    expect(res.body.destinos).toHaveLength(3);
    expect(porId(res.body, 1)).toEqual({
      id: 1,
      nombre: 'Johnny Cay',
      categoria: 'cayo',
      latitud: johnnyCay.latitud,
      longitud: johnnyCay.longitud,
      imagenUrl: johnnyCay.imagen_url,
      ocupacion: { estado: 'Abierto', porcentaje: 82.4, nivel: 'Alto' },
    });
    expect(porId(res.body, 3)).toMatchObject({ imagenUrl: null, ocupacion: { estado: 'Abierto', nivel: 'Bajo' } });
  });

  it('hace una consulta al histórico y una sola llamada de clima para todos', async () => {
    await request(app).get('/v1/mapa');
    expect(destinoM.listarVisibles).toHaveBeenCalledTimes(1);
    expect(ocupacionM.promedioPorHora).toHaveBeenCalledTimes(1);
    expect(proveedorFalso.llamadas).toHaveLength(1);
    expect(proveedorFalso.llamadas[0]).toHaveLength(1);
  });

  it('aplica los mismos factores que la predicción (lluvia)', async () => {
    proveedorFalso.clima = { probLluvia: 80 };
    const res = await request(app).get('/v1/mapa');
    expect(porId(res.body, 1)?.ocupacion).toEqual({ estado: 'Abierto', porcentaje: 61.8, nivel: 'Medio' });
  });

  it('marca como cerrado un destino fuera de su horario', async () => {
    ahora.mockReturnValue({ fecha: '2026-09-30', hora: '18:00' });
    const res = await request(app).get('/v1/mapa');
    expect(porId(res.body, 1)?.ocupacion).toEqual({ estado: 'Cerrado', porcentaje: 0, nivel: null });
    expect(proveedorFalso.llamadas).toHaveLength(1);
  });

  it('marca como cerrado un destino cerrado temporalmente', async () => {
    destinoM.listarVisibles.mockResolvedValue([{ ...hoyoSoplador, estado: 'cerrado_temporal' }]);
    const res = await request(app).get('/v1/mapa');
    expect(res.body.destinos[0].ocupacion).toEqual({ estado: 'Cerrado', porcentaje: 0, nivel: null });
    expect(proveedorFalso.llamadas).toHaveLength(0);
  });

  it('sin clima sigue respondiendo e indica el motivo', async () => {
    proveedorFalso.fallar = true;
    const res = await request(app).get('/v1/mapa');
    expect(res.status).toBe(200);
    expect(res.body.motivoSinClima).toBe('error_red');
    expect(porId(res.body, 1)?.ocupacion).toEqual({ estado: 'Abierto', porcentaje: 82.4, nivel: 'Alto' });
  });

  it('ocupacion es null si no hay historial para predecir', async () => {
    ocupacionM.promedioPorHora.mockResolvedValue([]);
    const res = await request(app).get('/v1/mapa');
    expect(res.status).toBe(200);
    expect(porId(res.body, 1)?.ocupacion).toBeNull();
  });

  it('lista vacía si no hay destinos', async () => {
    destinoM.listarVisibles.mockResolvedValue([]);
    const res = await request(app).get('/v1/mapa');
    expect(res.body).toMatchObject({ destinos: [], motivoSinClima: null });
    expect(proveedorFalso.llamadas).toHaveLength(0);
  });

  it('500 con formato JSON si falla la base de datos', async () => {
    destinoM.listarVisibles.mockRejectedValue(new Error('conexión rechazada'));
    const res = await request(app).get('/v1/mapa');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({ codigo: 'ERROR_INTERNO' });
  });
});
