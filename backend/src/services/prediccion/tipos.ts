/**
 * Contrato de los proveedores de predicción de ocupación.
 *
 * prediccionService decide horario, clima y calendario, y le pide a un ProveedorPrediccion
 * el porcentaje de los destinos ABIERTOS. Hoy hay dos implementaciones:
 *   - heurístico: promedio histórico de la tabla ocupacion + factores de clima y calendario.
 *   - ml: servicio HTTP de ml/ (el ganador de la comparación de tres modelos, POST /predict/lote).
 * y un orquestador "auto" (ML con respaldo heurístico). Controllers, rutas y app no cambian.
 */
import type { Db } from '../../config/supabase';
import type { CategoriaDestino, EstadoDestino } from '../../models/database.types';
import type { ConHorario } from '../../utils/horario';
import type { InfoCalendario } from '../calendarioService';
import type { ClimaHora } from '../clima/tipos';
import type { Factor } from '../factoresPrediccion';
import type { FeaturesPrediccion } from '../featuresPrediccion';

/** Quién generó una predicción ("horario" = cerrado a esa hora, sin consultar a nadie). */
export type ProveedorUsado = 'heuristico' | 'ml';

/** Datos con los que se construyó la estimación. */
export type OrigenDatos = 'sintetico' | 'real';

export type TipoDia = 'entre_semana' | 'fin_de_semana';

export interface DestinoAPredecir extends ConHorario {
  id_destino: number;
  capacidad: number;
  categoria: CategoriaDestino;
  latitud: number;
  longitud: number;
  estado?: EstadoDestino;
  /** Fin del cierre temporal: si ya pasó, el destino atiende normalmente. */
  cierre_hasta?: string | null;
}

export interface BasePrediccion {
  /** Promedio histórico antes de los factores. */
  porcentaje: number;
  /** Histórico usado: el de ese día de la semana o, como respaldo, el del tipo de día. */
  origen: 'dia_semana' | TipoDia;
  muestras: number;
}

/** Lo que recibe un proveedor por cada destino abierto. */
export interface EntradaPrediccion {
  destino: DestinoAPredecir;
  features: FeaturesPrediccion;
  calendario: InfoCalendario;
  clima: ClimaHora | null;
}

export interface ResultadoProveedor {
  /** Porcentaje final, 0–100. */
  porcentaje: number;
  /** Promedio histórico usado (solo el heurístico). */
  base: BasePrediccion | null;
  muestras: number;
  /** Factores aplicados (solo el heurístico; el modelo de ML ya los incorpora). */
  factores: Factor[];
  fuente: 'promedio_historico' | 'modelo_ml';
  proveedor: ProveedorUsado;
  /** Nombre del modelo que calculó el porcentaje ("HistGradientBoosting", "Promedio histórico"). */
  modelo: string;
  origenDatos: OrigenDatos;
  /** true si se pidió ML (modo auto) y respondió el heurístico porque el servicio falló. */
  respaldo: boolean;
}

export interface ProveedorPrediccion {
  readonly nombre: 'heuristico' | 'ml' | 'auto';
  /**
   * Predicciones de los destinos indicados para la misma fecha (YYYY-MM-DD) y hora (HH:MM).
   * Los destinos que no se puedan predecir (sin historial) no aparecen en el resultado.
   */
  predecirVarios(db: Db, entradas: EntradaPrediccion[], fecha: string, hora: string): Promise<Map<number, ResultadoProveedor>>;
}
