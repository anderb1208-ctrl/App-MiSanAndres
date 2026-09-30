/**
 * Recomendaciones calculadas al momento (no se guardan).
 *
 * 1. Afinidad (0–1) por dimensión en la que el usuario tiene preferencias:
 *    - categoría   (peso 0,5): 1 si la categoría del destino es una de las suyas.
 *    - experiencia (peso 0,3): coincidencias / min(preferencias del usuario, 2).
 *    - grupo       (peso 0,2): igual que experiencia.
 *    La afinidad es el promedio ponderado de las dimensiones activas.
 * 2. Ajuste por ocupación predicha para la hora actual frente al nivel preferido:
 *    +15 si coincide, 0 si es adyacente, −15 si es opuesto (0 sin preferencia o sin predicción).
 * 3. Puntaje = 85 × afinidad + ajuste, acotado a 0–100.
 *
 * Solo entran destinos abiertos con al menos una coincidencia.
 */
import type { Db } from '../config/supabase';
import type { NivelOcupacion, TipoPreferencia } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import { ahoraEnColombia } from '../utils/fecha';
import { ADJETIVO_OCUPACION, distanciaNiveles } from '../utils/nivelOcupacion';
import { aDestino, type Destino } from './destinoService';
import * as prediccionService from './prediccionService';
import * as preferenciaService from './preferenciaService';

export interface Recomendacion extends Destino {
  /** Compatibilidad con el usuario, 0–100. */
  puntaje: number;
  /** Nombres de las preferencias del usuario que cumple el destino. */
  coincidencias: string[];
  /** Explicación corta para mostrar en la app. */
  razon: string;
}

export interface ResultadoRecomendaciones {
  fecha: string;
  hora: string;
  nivelOcupacionPreferido: NivelOcupacion | null;
  /** false si el usuario aún no configuró preferencias (lista vacía). */
  tienePreferencias: boolean;
  recomendaciones: Recomendacion[];
}

const PESOS: Record<TipoPreferencia, number> = { categoria: 0.5, experiencia: 0.3, grupo: 0.2 };
const TOPE_COINCIDENCIAS: Record<TipoPreferencia, number> = { categoria: 1, experiencia: 2, grupo: 2 };
const PUNTOS_AFINIDAD = 85;
const AJUSTE_OCUPACION = [15, 0, -15] as const; // por distancia entre niveles

export function ajustePorOcupacion(
  predicho: NivelOcupacion | undefined,
  preferido: NivelOcupacion | null,
): number {
  if (!predicho || !preferido) return 0;
  return AJUSTE_OCUPACION[distanciaNiveles(predicho, preferido)] ?? 0;
}

export function construirRazon(
  coincidencias: string[],
  predicho: NivelOcupacion | undefined,
  preferido: NivelOcupacion | null,
): string {
  const [a, b, ...resto] = coincidencias;
  let razon = `Coincide con ${b ? `${a} y ${b}` : a}`;
  if (resto.length > 0) razon += ` (+${resto.length})`;
  if (predicho) {
    razon += ` · ocupación ${ADJETIVO_OCUPACION[predicho]} ahora`;
    if (predicho === preferido) razon += ', como prefieres';
  }
  return razon;
}

export async function recomendar(db: Db, idUsuario: string): Promise<ResultadoRecomendaciones> {
  const { fecha, hora } = ahoraEnColombia();
  const { preferencias, nivelOcupacion } = await preferenciaService.obtenerDetalladas(db, idUsuario);
  const base = { fecha, hora, nivelOcupacionPreferido: nivelOcupacion };

  if (preferencias.length === 0) {
    return { ...base, tienePreferencias: false, recomendaciones: [] };
  }

  const destinos = await destinoModel.listarVisibles(db, { soloAbiertos: true });
  const [etiquetas, predicciones] = await Promise.all([
    destinoModel.listarEtiquetas(db, destinos.map((d) => d.id_destino)),
    prediccionService.predecirVarios(db, destinos, fecha, hora),
  ]);

  const delUsuario = (tipo: TipoPreferencia) => preferencias.filter((p) => p.tipo === tipo);
  const dimensiones = (['categoria', 'experiencia', 'grupo'] as const).filter(
    (tipo) => delUsuario(tipo).length > 0,
  );
  const pesoTotal = dimensiones.reduce((s, t) => s + PESOS[t], 0);

  const recomendaciones: Recomendacion[] = [];
  for (const destino of destinos) {
    const idsEtiquetas = new Set(
      etiquetas.filter((e) => e.id_destino === destino.id_destino).map((e) => e.id_preferencia),
    );
    const cumple = (p: preferenciaService.PreferenciaDetallada) =>
      p.tipo === 'categoria' ? p.codigo === destino.categoria : idsEtiquetas.has(p.id);

    const coincidencias: string[] = [];
    let afinidad = 0;
    for (const tipo of dimensiones) {
      const propias = delUsuario(tipo);
      const cumplidas = propias.filter(cumple);
      coincidencias.push(...cumplidas.map((p) => p.nombre));
      const tope = Math.min(propias.length, TOPE_COINCIDENCIAS[tipo]);
      afinidad += PESOS[tipo] * (Math.min(cumplidas.length, tope) / tope);
    }
    if (coincidencias.length === 0) continue;
    afinidad /= pesoTotal;

    const prediccion = predicciones.get(destino.id_destino);
    const puntaje = Math.round(
      Math.min(100, Math.max(0, PUNTOS_AFINIDAD * afinidad + ajustePorOcupacion(prediccion?.nivel, nivelOcupacion))),
    );

    recomendaciones.push({
      ...aDestino(destino, prediccion),
      puntaje,
      coincidencias,
      razon: construirRazon(coincidencias, prediccion?.nivel, nivelOcupacion),
    });
  }

  recomendaciones.sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      (a.ocupacionActual?.porcentaje ?? 100) - (b.ocupacionActual?.porcentaje ?? 100) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );

  return { ...base, tienePreferencias: true, recomendaciones };
}
