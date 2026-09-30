import type { Db } from '../config/supabase';
import type { Database, UsuarioRow } from './database.types';
import { verificar } from './verificar';

type CambiosUsuario = Pick<
  Database['public']['Tables']['usuario']['Update'],
  'nombre' | 'nivel_ocupacion_preferido'
>;

/** Perfil del usuario, o null si no existe (RLS solo deja ver el propio). */
export async function obtener(db: Db, idUsuario: string): Promise<UsuarioRow | null> {
  const resultado = await db.from('usuario').select('*').eq('id_usuario', idUsuario).maybeSingle();
  return verificar(resultado, 'Obtener perfil');
}

/** Actualiza el perfil y lo devuelve, o null si no existe. */
export async function actualizar(
  db: Db,
  idUsuario: string,
  cambios: CambiosUsuario,
): Promise<UsuarioRow | null> {
  const resultado = await db
    .from('usuario')
    .update(cambios)
    .eq('id_usuario', idUsuario)
    .select('*')
    .maybeSingle();
  return verificar(resultado, 'Actualizar perfil');
}
