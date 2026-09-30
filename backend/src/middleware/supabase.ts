import type { RequestHandler } from 'express';
import { crearClienteSupabase, type Db } from '../config/supabase';

let clienteAnonimo: Db | undefined;

/** Deja en res.locals.db un cliente anónimo para los endpoints públicos. */
export const adjuntarClienteAnonimo: RequestHandler = (_req, res, next) => {
  clienteAnonimo ??= crearClienteSupabase();
  res.locals.db = clienteAnonimo;
  next();
};
