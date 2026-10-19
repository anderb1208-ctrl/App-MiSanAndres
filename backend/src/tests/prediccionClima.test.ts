import request from 'supertest';
import { crearApp } from '../app';
import type { DestinoRow } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as ocupacionModel from '../models/ocupacionModel';
import { ESPERA_TRAS_FALLO_MS, VIGENCIA_CACHE_MS } from '../services/clima/climaService';
import * as fecha from '../utils/fecha';
import { proveedorFalso } from './climaFalso';
import { destinos, johnnyCay, promediosHora, sprattBight } from './fixtures';

jest.mock('../models/destinoModel');
jest.mock('../models/ocupacionModel');

const app = crearApp();
const destinoM = jest.mocked(destinoModel);
const ocupacionM = jest.mocked(ocupacionModel);
const ahora = jest.spyOn(fecha, 'ahoraEnColombia');

/** Restaurante de prueba con la base de Spratt Bight (55 %). */
const restaurante: DestinoRow = { ...sprattBight, nombre: 'Restaurante de prueba', categoria: 'gastronomia' };
let catalogoDestinos: DestinoRow[] = destinos;

beforeEach(() => {
  // "Hoy" en las pruebas: miércoles 30 de septiembre de 2026, 12:30.
  ahora.mockReturnValue({ fecha: '2026-09-30', hora: '12:30' });
  catalogoDestinos = destinos;
  destinoM.listarVisibles.mockImplementation(async () => catalogoDestinos);
  destinoM.obtenerVisible.mockImplementation(
    async (_db, id) => catalogoDestinos.find((d) => d.id_destino === id) ?? null,
  );
  destinoM.listarEtiquetas.mockResolvedValue([]);
  ocupacionM.promedioPorHora.mockImplementation(async (_db, filtros) =>
    promediosHora.filter((p) => filtros.idDestino === undefined || p.id_destino === filtros.idDestino),
  );
});

const predecir = (id: number, f: string, h = '12:30') => request(app).get(`/v1/ocupacion/${id}/prediccion?fecha=${f}&hora=${h}`);

describe('predicción con clima', () => {
  it('con lluvia probable baja la ocupación de un cayo y lo explica', async () => {
    proveedorFalso.clima = { probLluvia: 80, precipitacion: 0.2, codigoClima: 61 };
    const res = await predecir(1, '2026-09-30');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: 'Abierto',
      base: { porcentaje: 82.4, origen: 'dia_semana' },
      porcentaje: 61.8,
      nivel: 'Medio',
      clima: { probLluvia: 80, codigoClima: 61 },
      motivoSinClima: null,
      factores: [
        {
          codigo: 'lluvia',
          multiplicador: 0.75,
          efecto: -25,
          texto: 'Lluvia probable: -25 %',
          detalle: '80 % de probabilidad, 0.2 mm',
        },
      ],
    });
    expect(res.body.features.clima).toEqual({
      temperatura: 29,
      probLluvia: 80,
      precipitacion: 0.2,
      codigoClima: 61,
      viento: 15,
    });
  });

  it('con lluvia probable sube un poco la ocupación de un restaurante', async () => {
    catalogoDestinos = [restaurante];
    proveedorFalso.clima = { probLluvia: 70 };
    const res = await predecir(6, '2026-09-30');
    expect(res.body).toMatchObject({ porcentaje: 60.5, factores: [{ codigo: 'lluvia', texto: 'Lluvia probable: +10 %' }] });
  });

  it('la precipitación prevista también cuenta como lluvia', async () => {
    proveedorFalso.clima = { probLluvia: 20, precipitacion: 1.5 };
    const res = await predecir(3, '2026-09-30');
    expect(res.body.factores.map((f: { codigo: string }) => f.codigo)).toEqual(['lluvia']);
    expect(res.body.porcentaje).toBe(22.6); // 25,1 × 0,9
  });

  it('sin lluvia no aplica factores de clima', async () => {
    const res = await predecir(1, '2026-09-30');
    expect(res.body).toMatchObject({ porcentaje: 82.4, nivel: 'Alto', factores: [], motivoSinClima: null });
    expect(res.body.clima).not.toBeNull();
  });

  it('con tormenta el factor de tormenta reemplaza al de lluvia', async () => {
    proveedorFalso.clima = { probLluvia: 90, precipitacion: 6, codigoClima: 95 };
    const res = await predecir(1, '2026-09-30');
    expect(res.body.factores).toEqual([
      expect.objectContaining({ codigo: 'tormenta', efecto: -50, texto: 'Tormenta: -50 %' }),
    ]);
    expect(res.body).toMatchObject({ porcentaje: 41.2, nivel: 'Medio' });
  });

  it('usa el clima de la hora consultada', async () => {
    proveedorFalso.enHora('2026-09-30T14:00', { probLluvia: 95 });
    const seca = await predecir(1, '2026-09-30', '12:00');
    const lluviosa = await predecir(1, '2026-09-30', '14:15');
    expect(seca.body.factores).toEqual([]);
    expect(lluviosa.body.factores[0].codigo).toBe('lluvia');
    expect(lluviosa.body.clima.fechaHora).toBe('2026-09-30T14:00');
  });
});

describe('predicción con calendario', () => {
  it('en un festivo sube la ocupación y nombra el festivo', async () => {
    // Lunes 12 de octubre de 2026: Día de la Raza (y puente), último día del receso escolar.
    const res = await predecir(3, '2026-10-12');
    expect(res.body.features).toMatchObject({ diaSemana: 1, esFestivo: true, esPuente: true, temporada: 'alta' });
    expect(res.body.factores[0]).toEqual({
      codigo: 'festivo', multiplicador: 1.25, efecto: 25, texto: 'Festivo: +25 %', detalle: 'Día de la Raza',
    });
    expect(res.body.factores.map((f: { codigo: string }) => f.codigo)).toEqual(['festivo', 'temporada_alta']);
    expect(res.body).toMatchObject({ porcentaje: 37.7, nivel: 'Bajo' }); // 25,1 × 1,25 × 1,2
  });

  it('el sábado de un puente lleva el factor de puente', async () => {
    const res = await predecir(3, '2026-10-10');
    expect(res.body.features).toMatchObject({ esFestivo: false, esPuente: true });
    expect(res.body.factores.map((f: { texto: string }) => f.texto)).toEqual(['Puente festivo: +10 %', 'Temporada alta: +20 %']);
    expect(res.body.porcentaje).toBe(33.1); // 25,1 × 1,1 × 1,2
  });

  it('nunca pasa de 100 %', async () => {
    const res = await predecir(1, '2026-10-12');
    expect(res.body).toMatchObject({ porcentaje: 100, nivel: 'Alto' });
  });

  it('festivo con lluvia combina los dos factores', async () => {
    proveedorFalso.clima = { probLluvia: 80 };
    const res = await predecir(3, '2026-10-12');
    expect(res.body.factores.map((f: { codigo: string }) => f.codigo)).toEqual(['lluvia', 'festivo', 'temporada_alta']);
    expect(res.body.porcentaje).toBe(33.9); // 25,1 × 0,9 × 1,25 × 1,2
  });
});

describe('predicción sin datos de clima', () => {
  it('fuera del rango del pronóstico sigue funcionando, sin consultar al proveedor', async () => {
    // 20 de diciembre: a más de 16 días de "hoy" y en temporada alta.
    const res = await predecir(3, '2026-12-20');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      clima: null,
      motivoSinClima: 'fuera_de_rango',
      features: { clima: null, temporada: 'alta' },
      factores: [
        {
          codigo: 'temporada_alta',
          efecto: 20,
          texto: 'Temporada alta: +20 %',
          detalle: 'Fin y comienzo de año',
        },
      ],
      porcentaje: 30.1,
    });
    expect(proveedorFalso.llamadas).toHaveLength(0);
  });

  it('si el proveedor falla predice sin clima y lo indica', async () => {
    proveedorFalso.fallar = true;
    const res = await predecir(1, '2026-09-30');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      porcentaje: 82.4,
      clima: null,
      motivoSinClima: 'error_red',
      factores: [],
    });
  });

  it('el listado de destinos también funciona sin clima', async () => {
    proveedorFalso.fallar = true;
    const res = await request(app).get('/v1/destinos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });
});

describe('predicción de un destino cerrado', () => {
  it('responde Cerrado sin factores ni clima, aunque llueva', async () => {
    proveedorFalso.clima = { probLluvia: 100, codigoClima: 95 };
    const res = await predecir(1, '2026-10-12', '18:00');
    expect(res.body).toMatchObject({
      estado: 'Cerrado',
      porcentaje: 0,
      nivel: null,
      clima: null,
      factores: [],
      features: { esFestivo: true },
    });
    expect(proveedorFalso.llamadas).toHaveLength(0);
  });
});

describe('caché del clima', () => {
  let reloj: jest.SpyInstance<number, []>;
  let t = Date.parse('2026-09-30T17:30:00Z');
  beforeEach(() => {
    t = Date.parse('2026-09-30T17:30:00Z');
    reloj = jest.spyOn(Date, 'now').mockImplementation(() => t);
  });
  afterEach(() => reloj.mockRestore());

  it('el listado pide el clima de todos los destinos en una sola llamada', async () => {
    await request(app).get('/v1/destinos');
    expect(proveedorFalso.llamadas).toHaveLength(1);
    expect(proveedorFalso.llamadas[0]).toHaveLength(3);
  });

  it('reutiliza el clima durante 30 minutos', async () => {
    await predecir(1, '2026-09-30');
    await predecir(1, '2026-09-30', '13:00');
    await request(app).get('/v1/destinos/1/clima');
    expect(proveedorFalso.llamadas).toHaveLength(1);

    t += VIGENCIA_CACHE_MS + 1;
    await predecir(1, '2026-09-30');
    expect(proveedorFalso.llamadas).toHaveLength(2);
  });

  it('tras un fallo espera un minuto antes de reintentar', async () => {
    proveedorFalso.fallar = true;
    await predecir(1, '2026-09-30');
    await predecir(1, '2026-09-30');
    expect(proveedorFalso.llamadas).toHaveLength(1);

    proveedorFalso.fallar = false;
    t += ESPERA_TRAS_FALLO_MS + 1;
    const res = await predecir(1, '2026-09-30');
    expect(proveedorFalso.llamadas).toHaveLength(2);
    expect(res.body.motivoSinClima).toBeNull();
  });
});

describe('GET /v1/destinos/:id/clima', () => {
  const esperarError = (res: request.Response, status: number, codigo: string) => {
    expect(res.status).toBe(status);
    expect(res.body.error).toMatchObject({ codigo });
  };

  it('devuelve el clima actual, las próximas 12 horas y la atribución', async () => {
    const res = await request(app).get('/v1/destinos/1/clima');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      destinoId: 1,
      nombre: 'Johnny Cay',
      disponible: true,
      motivoSinClima: null,
      actual: { fechaHora: '2026-09-30T12:00', temperatura: 29, probLluvia: 10 },
      atribucion: { texto: 'Weather data by Open-Meteo.com', url: 'https://open-meteo.com/', licencia: 'CC BY 4.0' },
    });
    expect(res.body.proximasHoras).toHaveLength(12);
    expect(res.body.proximasHoras[0].fechaHora).toBe('2026-09-30T13:00');
    expect(proveedorFalso.llamadas[0]).toMatchObject([{ latitud: johnnyCay.latitud, longitud: johnnyCay.longitud }]);
  });

  it('acepta la cantidad de horas', async () => {
    const res = await request(app).get('/v1/destinos/1/clima?horas=3');
    expect(res.body.proximasHoras.map((h: { fechaHora: string }) => h.fechaHora)).toEqual([
      '2026-09-30T13:00',
      '2026-09-30T14:00',
      '2026-09-30T15:00',
    ]);
  });

  it('sin proveedor responde 200 sin datos y con el motivo', async () => {
    proveedorFalso.fallar = true;
    const res = await request(app).get('/v1/destinos/1/clima');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      disponible: false,
      motivoSinClima: 'error_red',
      actual: null,
      proximasHoras: [],
    });
  });

  it.each(['0', '49', 'doce', '2.5'])('400 con horas inválidas (%s)', async (horas) => {
    esperarError(await request(app).get(`/v1/destinos/1/clima?horas=${horas}`), 400, 'SOLICITUD_INVALIDA');
  });

  it('404 si el destino no existe', async () => {
    esperarError(await request(app).get('/v1/destinos/999/clima'), 404, 'NO_ENCONTRADO');
  });

  it('400 con id inválido', async () => {
    esperarError(await request(app).get('/v1/destinos/abc/clima'), 400, 'SOLICITUD_INVALIDA');
  });
});

describe('GET /v1/clima', () => {
  it('devuelve el clima del centro de la isla', async () => {
    const res = await request(app).get('/v1/clima?horas=6');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ lugar: 'San Andrés', disponible: true, actual: { temperatura: 29 } });
    expect(res.body.proximasHoras).toHaveLength(6);
  });
});
