import { Router } from 'express';
import * as climaController from '../controllers/climaController';
import * as destinoController from '../controllers/destinoController';
import * as interaccionController from '../controllers/interaccionController';
import * as ocupacionController from '../controllers/ocupacionController';
import * as perfilController from '../controllers/perfilController';
import * as preferenciaController from '../controllers/preferenciaController';
import * as recomendacionController from '../controllers/recomendacionController';
import { requerirAuth } from '../middleware/auth';
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
  '/destinos/:id/clima',
  validar({ params: e.paramsId, query: e.consultaClima }),
  climaController.delDestino,
);

publicas.get('/clima', validar({ query: e.consultaClima }), climaController.deLaIsla);

// Todos los destinos con coordenadas y ocupación de ahora, en una sola llamada (pestaña Mapa).
publicas.get('/mapa', destinoController.mapa);

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

/**
 * Rutas autenticadas: `requerirAuth` va en cada ruta (no con router.use) para
 * que una ruta inexistente responda 404 y no 401. El usuario sale del JWT.
 */
const privadas = Router();

privadas.get('/perfil', requerirAuth, perfilController.obtener);
privadas.put('/perfil', requerirAuth, validar({ body: e.cuerpoPerfil }), perfilController.actualizar);

privadas.get('/preferencias', requerirAuth, preferenciaController.obtener);
privadas.put(
  '/preferencias',
  requerirAuth,
  validar({ body: e.cuerpoPreferencias }),
  preferenciaController.reemplazar,
);
privadas.delete('/preferencias', requerirAuth, preferenciaController.restablecer);

privadas.post(
  '/interacciones',
  requerirAuth,
  validar({ body: e.cuerpoInteraccion }),
  interaccionController.registrar,
);
privadas.get(
  '/interacciones',
  requerirAuth,
  validar({ query: e.consultaInteracciones }),
  interaccionController.historial,
);

privadas.get('/recomendaciones', requerirAuth, recomendacionController.listar);

export const rutasV1 = Router();
rutasV1.use(publicas);
rutasV1.use(privadas);
