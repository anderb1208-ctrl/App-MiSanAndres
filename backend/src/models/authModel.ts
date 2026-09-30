import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { crearClienteSupabase, type Db } from '../config/supabase';

export interface UsuarioAuth {
  id: string;
  correo: string | null;
}

let cliente: Db | undefined;

/**
 * Valida el JWT con Supabase Auth y devuelve el usuario, o null si el token
 * no es válido o expiró. Los fallos de red se propagan como error 500.
 */
export async function obtenerUsuarioDelToken(token: string): Promise<UsuarioAuth | null> {
  cliente ??= crearClienteSupabase();
  const { data, error } = await cliente.auth.getUser(token);
  if (error) {
    if (isAuthRetryableFetchError(error)) throw error;
    return null;
  }
  return { id: data.user.id, correo: data.user.email ?? null };
}
