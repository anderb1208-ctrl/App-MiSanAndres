import type { RequestHandler } from 'express';
import type { RolUsuario } from '../models/database.types';
import * as usuarioModel from '../models/usuarioModel';
import { noAutenticado, prohibido } from '../utils/errores';

export const TODOS_LOS_ROLES: readonly RolUsuario[] = ['turista', 'tecnico', 'administrador'];

/**
 * Exige que el usuario autenticado tenga uno de los roles indicados. Va después de
 * `requerirAuth`: el usuario sale del JWT y el rol se consulta en la base de datos,
 * nunca del cuerpo de la petición. Deja el rol en res.locals.rol.
 *
 * Es una barrera de comodidad y de mensajes claros: la seguridad de fondo la aplican
 * RLS y las funciones de la base, que vuelven a comprobar el rol.
 */
export function requiereRol(...roles: RolUsuario[]): RequestHandler {
  const permitidos = roles.length > 0 ? roles : TODOS_LOS_ROLES;
  return async (_req, res, next) => {
    if (!res.locals.usuario) throw noAutenticado();
    const rol = await usuarioModel.obtenerRol(res.locals.db, res.locals.usuario.id);
    if (!rol) throw prohibido('Tu cuenta no tiene un perfil asociado.');
    if (!permitidos.includes(rol)) throw prohibido();
    res.locals.rol = rol;
    next();
  };
}

/** Solo carga el rol (cualquier rol vale). */
export const cargarRol = requiereRol(...TODOS_LOS_ROLES);
