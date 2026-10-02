import type { Db } from '../config/supabase';
import type { OcupacionRow } from './database.types';
import { verificarLista } from './verificar';

export interface PromedioHora {
  id_destino: number;
  hora: number;
  promedio: number;
  muestras: number;
}

/** Registros de ocupación de un destino entre dos instantes (hasta exclusivo). */
export async function listarRegistros(
  db: Db,
  idDestino: number,
  desde: string,
  hasta: string,
): Promise<OcupacionRow[]> {
  const resultado = await db
    .from('ocupacion')
    .select('*')
    .eq('id_destino', idDestino)
    .gte('fecha_hora', desde)
    .lt('fecha_hora', hasta)
    .order('fecha_hora');
  return verificarLista(resultado, 'Listar registros de ocupación');
}

export interface FiltrosPromedio {
  /** Solo fines de semana (true) o solo entre semana (false). */
  finDeSemana?: boolean;
  /** Solo un día de la semana ISO: 1 = lunes … 7 = domingo. */
  diaSemana?: number;
  hora?: number;
  idDestino?: number;
}

/**
 * Promedio histórico de ocupación por destino y hora (hora de Colombia), filtrando
 * por tipo de día o por día de la semana. Sin `hora` devuelve las 24 horas; sin
 * `idDestino`, todos los destinos.
 */
export async function promedioPorHora(db: Db, filtros: FiltrosPromedio): Promise<PromedioHora[]> {
  const resultado = await db.rpc('ocupacion_promedio_hora', {
    ...(filtros.finDeSemana !== undefined && { p_fin_de_semana: filtros.finDeSemana }),
    ...(filtros.diaSemana !== undefined && { p_dia_semana: filtros.diaSemana }),
    ...(filtros.hora !== undefined && { p_hora: filtros.hora }),
    ...(filtros.idDestino !== undefined && { p_id_destino: filtros.idDestino }),
  });
  return verificarLista(resultado, 'Calcular promedio de ocupación').map((f) => ({
    ...f,
    promedio: Number(f.promedio),
  }));
}
