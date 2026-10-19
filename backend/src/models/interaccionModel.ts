import type { Db } from '../config/supabase';
import type { CategoriaDestino, InteraccionRow, TipoInteraccion } from './database.types';
import { verificar, verificarLista, verificarOperacion } from './verificar';

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

/** Interacciones del usuario desde una fecha (o todas), de la más reciente a la más antigua, con su destino. */
export async function listarParaHistorial(
  db: Db,
  idUsuario: string,
  desde: string | null,
  limite: number,
): Promise<InteraccionConDestinoImagen[]> {
  let consulta = db
    .from('interaccion')
    .select('*, destino (id_destino, nombre, categoria, imagen_url)')
    .eq('id_usuario', idUsuario);
  if (desde) consulta = consulta.gte('fecha_hora', desde);
  const resultado = await consulta.order('fecha_hora', { ascending: false }).limit(limite);
  return verificarLista(resultado, 'Listar historial') as unknown as InteraccionConDestinoImagen[];
}

export interface InteraccionConDestinoImagen extends InteraccionRow {
  destino: { id_destino: number; nombre: string; categoria: CategoriaDestino; imagen_url: string | null } | null;
}

/** Destino y fecha de todas las interacciones del usuario (para el pasaporte). */
export async function destinosYFechasDelUsuario(
  db: Db,
  idUsuario: string,
  limite: number,
): Promise<Pick<InteraccionRow, 'id_destino' | 'fecha_hora'>[]> {
  const resultado = await db
    .from('interaccion')
    .select('id_destino, fecha_hora')
    .eq('id_usuario', idUsuario)
    .order('fecha_hora', { ascending: false })
    .limit(limite);
  return verificarLista(resultado, 'Listar destinos explorados');
}

/** Borra todas las interacciones del usuario (RLS: solo las propias). Devuelve cuántas borró. */
export async function borrarDelUsuario(db: Db, idUsuario: string): Promise<number> {
  const resultado = await db.from('interaccion').delete({ count: 'exact' }).eq('id_usuario', idUsuario);
  verificarOperacion(resultado.error, 'Borrar historial');
  return resultado.count ?? 0;
}

/** Totales de interacciones por destino de todos los usuarios desde `desde` (sin datos personales). */
export async function populares(
  db: Db,
  desde: string,
  limite: number,
): Promise<{ id_destino: number; vistas: number; usuarios: number }[]> {
  const resultado = await db.rpc('destinos_populares', { p_desde: desde, p_limite: limite });
  return verificarLista(resultado, 'Destinos populares');
}
