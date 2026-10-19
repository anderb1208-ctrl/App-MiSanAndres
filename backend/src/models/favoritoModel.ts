import type { Db } from '../config/supabase';
import type { DestinoRow, FavoritoRow } from './database.types';
import { verificar, verificarLista, verificarOperacion } from './verificar';

export interface FavoritoConDestino extends FavoritoRow {
  destino: DestinoRow | null;
}

/** Favoritos del usuario (RLS: solo los propios), con los datos del destino. */
export async function listar(db: Db, idUsuario: string): Promise<FavoritoConDestino[]> {
  const resultado = await db
    .from('favorito')
    .select('*, destino (*)')
    .eq('id_usuario', idUsuario)
    .order('fecha_creacion', { ascending: false });
  return verificarLista(resultado, 'Listar favoritos') as unknown as FavoritoConDestino[];
}

/** Agrega (o actualiza si ya existe) un favorito. */
export async function guardar(
  db: Db,
  favorito: Pick<FavoritoRow, 'id_usuario' | 'id_destino'> & Partial<Pick<FavoritoRow, 'avisar_apertura' | 'avisar_cierre'>>,
): Promise<FavoritoRow> {
  const resultado = await db.from('favorito').upsert(favorito, { onConflict: 'id_usuario,id_destino' }).select('*').single();
  return verificar(resultado, 'Guardar favorito') as FavoritoRow;
}

/** Cambia los avisos; null si no era favorito. */
export async function actualizar(
  db: Db,
  idUsuario: string,
  idDestino: number,
  cambios: Partial<Pick<FavoritoRow, 'avisar_apertura' | 'avisar_cierre'>>,
): Promise<FavoritoRow | null> {
  const resultado = await db
    .from('favorito')
    .update(cambios)
    .eq('id_usuario', idUsuario)
    .eq('id_destino', idDestino)
    .select('*')
    .maybeSingle();
  return verificar(resultado, 'Actualizar favorito');
}

export async function quitar(db: Db, idUsuario: string, idDestino: number): Promise<void> {
  const { error } = await db.from('favorito').delete().eq('id_usuario', idUsuario).eq('id_destino', idDestino);
  verificarOperacion(error, 'Quitar favorito');
}

/** Cuántos favoritos tiene el usuario. */
export async function contar(db: Db, idUsuario: string): Promise<number> {
  const resultado = await db.from('favorito').select('id_destino', { count: 'exact', head: true }).eq('id_usuario', idUsuario);
  verificarOperacion(resultado.error, 'Contar favoritos');
  return resultado.count ?? 0;
}
