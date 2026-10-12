import type { Db } from '../config/supabase';
import type { CategoriaDestino, DestinoRow, TipoPreferencia } from './database.types';
import { verificar, verificarLista } from './verificar';

export interface EtiquetaDestino {
  id_destino: number;
  id_preferencia: number;
  tipo: TipoPreferencia;
  codigo: string;
  nombre: string;
}

/** Escapa los comodines de LIKE (% y _) para buscar el texto literal. */
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Destinos visibles para el turista (todos menos los inactivos), ordenados por nombre.
 * `nombre` filtra por coincidencia parcial sin distinguir mayúsculas.
 */
export async function listarVisibles(
  db: Db,
  filtros: { categoria?: CategoriaDestino; nombre?: string; soloAbiertos?: boolean } = {},
): Promise<DestinoRow[]> {
  let consulta = db.from('destino').select('*').neq('estado', 'inactivo');
  if (filtros.categoria) consulta = consulta.eq('categoria', filtros.categoria);
  if (filtros.nombre) consulta = consulta.ilike('nombre', `%${escaparLike(filtros.nombre)}%`);
  if (filtros.soloAbiertos) consulta = consulta.eq('estado', 'abierto');
  return verificarLista(await consulta.order('nombre'), 'Listar destinos');
}

/** Un destino visible por id, o null si no existe o está inactivo. */
export async function obtenerVisible(db: Db, id: number): Promise<DestinoRow | null> {
  const resultado = await db
    .from('destino')
    .select('*')
    .eq('id_destino', id)
    .neq('estado', 'inactivo')
    .maybeSingle();
  return verificar(resultado, 'Obtener destino');
}

/** Etiquetas (experiencia y grupo) de los destinos indicados, o de todos. */
export async function listarEtiquetas(db: Db, idsDestino?: number[]): Promise<EtiquetaDestino[]> {
  let consulta = db
    .from('destino_preferencia')
    .select('id_destino, id_preferencia, preferencia (tipo, codigo, nombre)');
  if (idsDestino) consulta = consulta.in('id_destino', idsDestino);

  const filas = verificarLista(await consulta, 'Listar etiquetas de destinos');
  return filas.flatMap((f) =>
    f.preferencia
      ? [
          {
            id_destino: f.id_destino,
            id_preferencia: f.id_preferencia,
            tipo: f.preferencia.tipo,
            codigo: f.preferencia.codigo,
            nombre: f.preferencia.nombre,
          },
        ]
      : [],
  );
}
