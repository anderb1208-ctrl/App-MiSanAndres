import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import type { Database } from '../models/database.types';

export type Db = SupabaseClient<Database>;

/**
 * Crea un cliente de Supabase con la publishable key.
 * Si recibe el JWT del usuario lo envía en Authorization, así las consultas
 * se ejecutan como ese usuario y se aplica RLS. Sin token, se ejecutan como anon.
 */
export function crearClienteSupabase(token?: string): Db {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}
