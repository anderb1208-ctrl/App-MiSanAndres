import type { Db } from '../config/supabase';
import type { UsuarioAuth } from '../models/authModel';

declare global {
  namespace Express {
    interface Locals {
      /** Cliente de Supabase de la petición (anon, o con el JWT del usuario). */
      db: Db;
      /** Usuario autenticado (solo en rutas protegidas). */
      usuario: UsuarioAuth;
      /** Entradas ya validadas por el middleware `validar`. */
      validado: { params: unknown; query: unknown; body: unknown };
    }
  }
}

export {};
