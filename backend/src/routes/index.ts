import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import * as climaController from '../controllers/climaController';
import * as destinoController from '../controllers/destinoController';
import * as favoritoController from '../controllers/favoritoController';
import * as interaccionController from '../controllers/interaccionController';
import * as ocupacionController from '../controllers/ocupacionController';
import * as perfilController from '../controllers/perfilController';
import * as preferenciaController from '../controllers/preferenciaController';
import * as recomendacionController from '../controllers/recomendacionController';
import * as ticketController from '../controllers/ticketController';
import { requerirAuth } from '../middleware/auth';
import * as e from '../middleware/esquemas';
import { cargarRol, requiereRol } from '../middleware/roles';
import { adjuntarClienteAnonimo } from '../middleware/supabase';
import { estadoClima } from '../services/clima/climaService';
import { validar } from '../middleware/validar';

/** Rutas públicas: consultan como anon (RLS de lectura pública). */
const publicas = Router();
publicas.use(adjuntarClienteAnonimo);

publicas.get('/health', (_req, res) => {
  // Incluye el estado del clima (sin URL ni claves) para diagnosticar el despliegue.
  res.json({ estado: 'ok', servicio: 'misanandres-api', fecha: new Date().toISOString(), clima: estadoClima() });
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

// Usuario del token con su rol (leído de la base).
privadas.get('/me', requerirAuth, perfilController.obtener);
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

// ---- Favoritos con avisos y dispositivos para push ----
privadas.get('/favoritos', requerirAuth, favoritoController.listar);
privadas.post('/favoritos', requerirAuth, validar({ body: e.cuerpoFavorito }), favoritoController.agregar);
privadas.patch(
  '/favoritos/:idDestino',
  requerirAuth,
  validar({ params: e.paramsIdDestino, body: e.cuerpoAvisosFavorito }),
  favoritoController.actualizarAvisos,
);
privadas.delete('/favoritos/:idDestino', requerirAuth, validar({ params: e.paramsIdDestino }), favoritoController.quitar);
privadas.post('/dispositivos', requerirAuth, validar({ body: e.cuerpoDispositivo }), favoritoController.registrarDispositivo);
privadas.delete('/dispositivos', requerirAuth, validar({ body: e.cuerpoQuitarDispositivo }), favoritoController.quitarDispositivo);

// ---- Tickets de soporte (turista: los suyos; técnico y administrador: todos) ----
const personal = requiereRol('tecnico', 'administrador');
privadas.post('/tickets', requerirAuth, validar({ body: e.cuerpoTicket }), ticketController.crear);
privadas.get('/tickets', requerirAuth, cargarRol, validar({ query: e.consultaTickets }), ticketController.listar);
privadas.get('/tickets/:id', requerirAuth, validar({ params: e.paramsId }), ticketController.obtener);
privadas.patch(
  '/tickets/:id',
  requerirAuth,
  personal,
  validar({ params: e.paramsId, body: e.cuerpoActualizarTicket }),
  ticketController.actualizar,
);
privadas.post(
  '/tickets/:id/comentarios',
  requerirAuth,
  validar({ params: e.paramsId, body: e.cuerpoComentario }),
  ticketController.comentar,
);

// ---- Administración (solo administrador; la base vuelve a comprobar el rol) ----
const admin = requiereRol('administrador');
privadas.get('/admin/usuarios', requerirAuth, admin, adminController.usuarios);
privadas.patch(
  '/admin/usuarios/:id/rol',
  requerirAuth,
  admin,
  validar({ params: e.paramsIdUsuario, body: e.cuerpoRol }),
  adminController.cambiarRol,
);
privadas.get('/admin/metricas', requerirAuth, admin, adminController.metricas);
privadas.get('/admin/destinos', requerirAuth, admin, adminController.destinos);
privadas.post('/admin/destinos', requerirAuth, admin, validar({ body: e.cuerpoNuevoDestino }), adminController.crearDestino);
privadas.patch(
  '/admin/destinos/:id',
  requerirAuth,
  admin,
  validar({ params: e.paramsId, body: e.cuerpoEditarDestino }),
  adminController.editarDestino,
);
privadas.patch(
  '/admin/destinos/:id/estado',
  requerirAuth,
  admin,
  validar({ params: e.paramsId, body: e.cuerpoEstadoDestino }),
  adminController.estadoDestino,
);

export const rutasV1 = Router();
rutasV1.use(publicas);
rutasV1.use(privadas);
