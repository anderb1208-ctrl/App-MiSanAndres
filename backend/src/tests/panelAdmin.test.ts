/** Datos nuevos para el panel del administrador: desde cuándo está cerrado un destino y el proveedor en /v1/health. */
import request from 'supertest';
import { crearApp } from '../app';
import { env } from '../config/env';
import { aDestino } from '../services/destinoService';
import { johnnyCay } from './fixtures';

const app = crearApp();

describe('cierre temporal con fecha de inicio', () => {
  it('incluye desde, motivo y hasta mientras está cerrado', () => {
    const d = aDestino({
      ...johnnyCay,
      estado: 'cerrado_temporal',
      motivo_cierre: 'mantenimiento del muelle',
      cierre_desde: '2026-10-18T08:00:00-05:00',
      cierre_hasta: '2099-01-01T08:00:00-05:00',
    });
    expect(d.cierre).toEqual({ motivo: 'mantenimiento del muelle', hasta: '2099-01-01T08:00:00-05:00', desde: '2026-10-18T08:00:00-05:00' });
  });

  it('sin la columna (base sin la migración) o cerrado antes de registrarla, desde es null', () => {
    const { cierre_desde: _omitida, ...sinColumna } = { ...johnnyCay, estado: 'cerrado_temporal' as const, motivo_cierre: 'obras' };
    expect(aDestino(sinColumna as typeof johnnyCay).cierre).toEqual({ motivo: 'obras', hasta: null, desde: null });
  });

  it('abierto: sin cierre', () => {
    expect(aDestino(johnnyCay).cierre).toBeNull();
  });
});

describe('/v1/health', () => {
  it('informa el proveedor de predicción configurado (sin URL ni claves)', async () => {
    const res = await request(app).get('/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.prediccion).toEqual({ proveedor: env.PREDICCION_PROVEEDOR });
    expect(JSON.stringify(res.body)).not.toMatch(/ML_API_KEY|clave/i);
  });
});
