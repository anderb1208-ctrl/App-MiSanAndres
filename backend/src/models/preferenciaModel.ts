import type { Db } from '../config/supabase';
import type { PreferenciaRow } from './database.types';
import { verificarLista, verificarOperacion } from './verificar';

/** Catálogo completo de preferencias (categorías, experiencias y grupos). */
export async function listarCatalogo(db: Db): Promise<PreferenciaRow[]> {
  const resultado = await db.from('preferencia').select('*').order('id_preferencia');
  return verificarLista(resultado, 'Listar catálogo de preferencias');
}

/** IDs de las preferencias del usuario. */
export async function listarIdsDelUsuario(db: Db, idUsuario: string): Promise<number[]> {
  const resultado = await db
    .from('usuario_preferencia')
    .select('id_preferencia')
    .eq('id_usuario', idUsuario);
  return verificarLista(resultado, 'Listar preferencias del usuario').map((f) => f.id_preferencia);
}

export async function agregar(db: Db, idUsuario: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const resultado = await db
    .from('usuario_preferencia')
    .upsert(
      ids.map((id_preferencia) => ({ id_usuario: idUsuario, id_preferencia })),
      { onConflict: 'id_usuario,id_preferencia', ignoreDuplicates: true },
    );
  verificarOperacion(resultado.error, 'Agregar preferencias');
}

export async function quitar(db: Db, idUsuario: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const resultado = await db
    .from('usuario_preferencia')
    .delete()
    .eq('id_usuario', idUsuario)
    .in('id_preferencia', ids);
  verificarOperacion(resultado.error, 'Quitar preferencias');
}

export async function quitarTodas(db: Db, idUsuario: string): Promise<void> {
  const resultado = await db.from('usuario_preferencia').delete().eq('id_usuario', idUsuario);
  verificarOperacion(resultado.error, 'Quitar todas las preferencias');
}
