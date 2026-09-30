import { Router } from 'express';
import * as destinoController from '../controllers/destinoController';
import * as ocupacionController from '../controllers/ocupacionController';
import * as preferenciaController from '../controllers/preferenciaController';
import * as e from '../middleware/esquemas';
import { adjuntarClienteAnonimo } from '../middleware/supabase';
import { validar } from '../middleware/validar';

/** Rutas públicas: consultan como anon (RLS de lectura pública). */
const publicas = Router();
publicas.use(adjuntarClienteAnonimo);

publicas.get('/health', (_req, res) => {
  res.json({ estado: 'ok', servicio: 'misanandres-api', fecha: new Date().toISOString() });
});

publicas.get('/destinos', validar({ query: e.consultaDestinos }), destinoController.listar);
publicas.get('/destinos/:id', validar({ params: e.paramsId }), destinoController.obtener);

publicas.get(
  '/ocupacion/:destinoId',
  validar({ params: e.paramsDestinoId, query: e.consultaFecha }),
  ocupacionController.registrosDelDia,
);
publicas.get(
  '/ocupacion/:destinoId/prediccion',
  validar({ params: e.paramsDestinoId, query: e.consultaPrediccion }),
  ocupacionController.prediccion,
);
publicas.get(
  '/ocupacion/:destinoId/prediccion/dia',
  validar({ params: e.paramsDestinoId, query: e.consultaFecha }),
  ocupacionController.prediccionDelDia,
);

publicas.get('/preferencias/catalogo', preferenciaController.catalogo);

export const rutasV1 = Router();
rutasV1.use(publicas);
