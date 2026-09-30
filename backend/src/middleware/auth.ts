import type { RequestHandler } from 'express';
import { crearClienteSupabase } from '../config/supabase';
import * as authModel from '../models/authModel';
import { noAutenticado } from '../utils/errores';

/**
 * Exige un JWT de Supabase Auth en `Authorization: Bearer <token>`.
 * El usuario sale del token (nunca de un ID enviado por el cliente) y las
 * consultas siguientes usan un cliente con ese token para que aplique RLS.
 */
export const requerirAuth: RequestHandler = async (req, res, next) => {
  const [esquema, token, ...resto] = (req.get('authorization') ?? '').trim().split(/\s+/);
  if (esquema?.toLowerCase() !== 'bearer' || !token || resto.length > 0) {
    throw noAutenticado();
  }

  const usuario = await authModel.obtenerUsuarioDelToken(token);
  if (!usuario) {
    throw noAutenticado('El token no es válido o ya expiró.');
  }

  res.locals.usuario = usuario;
  res.locals.db = crearClienteSupabase(token);
  next();
};
