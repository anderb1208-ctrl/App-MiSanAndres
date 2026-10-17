import type { Db } from '../config/supabase';
import type { UsuarioAuth } from '../models/authModel';
import type { RolUsuario } from '../models/database.types';

declare global {
  namespace Express {
    interface Locals {
      /** Cliente de Supabase de la petición (anon, o con el JWT del usuario). */
      db: Db;
      /** Usuario autenticado (solo en rutas protegidas). */
      usuario: UsuarioAuth;
      /** Rol leído de la base por `requiereRol` (solo en rutas que lo usan). */
      rol?: RolUsuario;
      /** Entradas ya validadas por el middleware `validar`. */
      validado: { params: unknown; query: unknown; body: unknown };
    }
  }
}

export {};
