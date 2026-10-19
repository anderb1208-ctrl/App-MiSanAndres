/**
 * Proveedor heurístico (el cálculo del MVP):
 * 1. Base: promedio histórico del porcentaje a esa hora en ese mismo día de la semana (si
 *    tiene al menos MUESTRAS_MINIMAS_DIA_SEMANA registros); si no, el del tipo de día.
 * 2. Factores multiplicativos de clima y calendario (config/factoresPrediccion.ts),
 *    limitados a 0–100.
 */
import type { Db } from '../../config/supabase';
import { env } from '../../config/env';
import { MUESTRAS_MINIMAS_DIA_SEMANA } from '../../config/factoresPrediccion';
import * as ocupacionModel from '../../models/ocupacionModel';
import { diaSemanaIso, esFinDeSemana, horaEntera } from '../../utils/fecha';
import { aplicarFactores, calcularFactores } from '../factoresPrediccion';
import type { BasePrediccion, EntradaPrediccion, ProveedorPrediccion, ResultadoProveedor, TipoDia } from './tipos';

export const tipoDia = (fecha: string): TipoDia => (esFinDeSemana(fecha) ? 'fin_de_semana' : 'entre_semana');

export const redondear = (n: number) => Math.round(n * 10) / 10;

const aBase = (p: ocupacionModel.PromedioHora, origen: BasePrediccion['origen']): BasePrediccion => ({
  porcentaje: redondear(p.promedio),
  origen,
  muestras: p.muestras,
});

/**
 * Bases de varios destinos a una hora: histórico de ese día de la semana y, para los que
 * no tengan suficientes muestras, el del tipo de día (una consulta más, solo si hace falta).
 */
async function basesPorHora(db: Db, fecha: string, hora: string, ids: number[]): Promise<Map<number, BasePrediccion>> {
  // Con un solo destino se filtra en la base; con varios se traen todos de una vez.
  const filtro = { hora: horaEntera(hora), ...(ids.length === 1 && { idDestino: ids[0] }) };
  const bases = new Map<number, BasePrediccion>();

  const delDia = await ocupacionModel.promedioPorHora(db, { ...filtro, diaSemana: diaSemanaIso(fecha) });
  for (const p of delDia) {
    if (p.muestras >= MUESTRAS_MINIMAS_DIA_SEMANA) bases.set(p.id_destino, aBase(p, 'dia_semana'));
  }
  if (ids.some((id) => !bases.has(id))) {
    const delTipo = await ocupacionModel.promedioPorHora(db, { ...filtro, finDeSemana: esFinDeSemana(fecha) });
    for (const p of delTipo) if (!bases.has(p.id_destino)) bases.set(p.id_destino, aBase(p, tipoDia(fecha)));
  }
  return bases;
}

/** Nombre que muestra la app: "Estimado con promedio histórico". */
export const MODELO_HEURISTICO = 'promedio histórico';

export const proveedorHeuristico: ProveedorPrediccion = {
  nombre: 'heuristico',
  async predecirVarios(db: Db, entradas: EntradaPrediccion[], fecha: string, hora: string) {
    const resultado = new Map<number, ResultadoProveedor>();
    if (entradas.length === 0) return resultado;
    const bases = await basesPorHora(
      db,
      fecha,
      hora,
      entradas.map((e) => e.destino.id_destino),
    );
    for (const { destino, features, calendario } of entradas) {
      const base = bases.get(destino.id_destino);
      if (!base) continue;
      const factores = calcularFactores(destino.categoria, features, calendario);
      resultado.set(destino.id_destino, {
        porcentaje: redondear(aplicarFactores(base.porcentaje, factores)),
        base,
        muestras: base.muestras,
        factores,
        fuente: 'promedio_historico',
        proveedor: 'heuristico',
        modelo: MODELO_HEURISTICO,
        origenDatos: env.ORIGEN_DATOS_HISTORICOS,
        respaldo: false,
      });
    }
    return resultado;
  },
};
