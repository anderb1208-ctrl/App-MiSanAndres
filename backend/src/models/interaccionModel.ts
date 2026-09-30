import type { Db } from '../config/supabase';
import type { CategoriaDestino, InteraccionRow, TipoInteraccion } from './database.types';
import { verificar, verificarLista } from './verificar';

export interface InteraccionConDestino extends InteraccionRow {
  destino: { id_destino: number; nombre: string; categoria: CategoriaDestino } | null;
}

export async function crear(
  db: Db,
  datos: { idUsuario: string; idDestino: number; tipo: TipoInteraccion },
): Promise<InteraccionRow> {
  const resultado = await db
    .from('interaccion')
    .insert({ id_usuario: datos.idUsuario, id_destino: datos.idDestino, tipo_interaccion: datos.tipo })
    .select('*')
    .single();
  // single() con insert siempre devuelve la fila o un error.
  return verificar(resultado, 'Registrar interacción') as InteraccionRow;
}

/** Historial del usuario, de la más reciente a la más antigua. */
export async function listarDelUsuario(
  db: Db,
  idUsuario: string,
  limite: number,
): Promise<InteraccionConDestino[]> {
  const resultado = await db
    .from('interaccion')
    .select('*, destino (id_destino, nombre, categoria)')
    .eq('id_usuario', idUsuario)
    .order('fecha_hora', { ascending: false })
    .limit(limite);
  return verificarLista(resultado, 'Listar interacciones');
}
