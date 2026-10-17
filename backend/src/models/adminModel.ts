/**
 * Operaciones del administrador. Se ejecutan con el JWT del usuario: la base comprueba
 * el rol con es_administrador() (políticas y funciones security definer), así que un
 * usuario sin el rol recibe 42501 aunque llegue hasta aquí.
 */
import type { Db } from '../config/supabase';
import type { Database, DestinoRow, Json, RolUsuario, UsuarioRow } from './database.types';
import { verificar, verificarLista } from './verificar';

export type UsuarioAdmin = Database['public']['Functions']['listar_usuarios_admin']['Returns'][number];

export async function listarUsuarios(db: Db): Promise<UsuarioAdmin[]> {
  return verificarLista(await db.rpc('listar_usuarios_admin'), 'Listar usuarios');
}

/** Cambia el rol con las reglas de la base (no quitarse el propio rol, al menos un administrador). */
export async function cambiarRol(db: Db, idUsuario: string, rol: RolUsuario): Promise<UsuarioRow> {
  const resultado = await db.rpc('cambiar_rol_usuario', { p_id_usuario: idUsuario, p_rol: rol });
  return verificar(resultado, 'Cambiar rol') as UsuarioRow;
}

export async function metricas(db: Db): Promise<Json> {
  return verificar(await db.rpc('metricas_admin'), 'Métricas') ?? {};
}

/** Todos los destinos, también los ocultos (inactivos). */
export async function listarDestinos(db: Db): Promise<DestinoRow[]> {
  return verificarLista(await db.from('destino').select('*').order('nombre'), 'Listar destinos (admin)');
}

export type NuevoDestino = Database['public']['Tables']['destino']['Insert'];
export type CambiosDestino = Database['public']['Tables']['destino']['Update'];

export async function crearDestino(db: Db, destino: NuevoDestino): Promise<DestinoRow> {
  return verificar(await db.from('destino').insert(destino).select('*').single(), 'Crear destino') as DestinoRow;
}

/** Edita un destino; null si no existe. */
export async function editarDestino(db: Db, id: number, cambios: CambiosDestino): Promise<DestinoRow | null> {
  const resultado = await db.from('destino').update(cambios).eq('id_destino', id).select('*').maybeSingle();
  return verificar(resultado, 'Editar destino');
}

/** Un destino por id, aunque esté oculto. */
export async function obtenerDestino(db: Db, id: number): Promise<DestinoRow | null> {
  return verificar(await db.from('destino').select('*').eq('id_destino', id).maybeSingle(), 'Obtener destino (admin)');
}
