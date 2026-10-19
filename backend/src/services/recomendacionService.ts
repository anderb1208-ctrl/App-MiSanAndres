/**
 * Recomendaciones calculadas al momento (no se guardan), para la hora planeada (por defecto,
 * ahora en Colombia).
 *
 * 1. Afinidad (0–1) por dimensión en la que el usuario tiene preferencias:
 *    - categoría   (peso 0,5): 1 si la categoría del destino es una de las suyas.
 *    - experiencia (peso 0,3): coincidencias / min(preferencias del usuario, 2).
 *    - grupo       (peso 0,2): igual que experiencia (etiquetas de grupo del destino).
 *    La afinidad es el promedio ponderado de las dimensiones activas.
 * 2. Ajuste por ocupación predicha a esa hora frente al nivel preferido:
 *    +15 si coincide, 0 si es adyacente, −15 si es opuesto (0 sin preferencia o sin predicción).
 *    Si el destino está cerrado a esa hora, el ajuste es −15.
 * 3. Ajuste por presupuesto (si el usuario lo definió y el destino tiene precio): +5 dentro o
 *    por debajo, +2 si el rango se cruza, −10 si está por encima.
 * 4. Ajuste por calificación (con al menos 3 reseñas reales): +3 si el promedio es ≥ 4,
 *    −3 si es < 3.
 * 5. Puntaje = 85 × afinidad + ajustes, acotado a 0–100.
 *
 * Cada recomendación trae sus razones (✓ y ⚠) calculadas con estos mismos datos y reglas
 * (razonesRecomendacion.ts) y una frase corta `porQue`.
 *
 * Filtro rápido de presupuesto (?presupuestoMin&presupuestoMax): deja fuera los destinos cuyo
 * precio queda entero por encima del máximo y usa ese presupuesto para las razones.
 *
 * Solo entran destinos abiertos con al menos una coincidencia.
 */
import type { Db } from '../config/supabase';
import type { NivelOcupacion, TipoPreferencia } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import * as resenaModel from '../models/resenaModel';
import { ahoraEnColombia } from '../utils/fecha';
import { ADJETIVO_OCUPACION, distanciaNiveles } from '../utils/nivelOcupacion';
import { aDestino, type Destino } from './destinoService';
import * as prediccionService from './prediccionService';
import * as preferenciaService from './preferenciaService';
import {
  AJUSTE_PRESUPUESTO,
  ajusteCalificacion,
  encajePresupuesto,
  explicar,
  type Presupuesto,
  type Razon,
} from './razonesRecomendacion';

export interface Recomendacion extends Destino {
  /** Compatibilidad con el usuario, 0–100. */
  puntaje: number;
  /** Nombres de las preferencias del usuario que cumple el destino. */
  coincidencias: string[];
  /** Explicación corta (se mantiene por compatibilidad; ver porQue y razones). */
  razon: string;
  /** Frase corta: "Coincide con Cayos y está dentro de tu presupuesto, aunque…". */
  porQue: string;
  /** UNA razón de una línea para las tarjetas de Inicio: "Dentro de tu presupuesto". */
  porQueCorto: string;
  /** Razones positivas primero y advertencias después, con valores reales. */
  razones: Razon[];
  calificacion: resenaModel.Calificacion | null;
}

export interface ResultadoRecomendaciones {
  fecha: string;
  hora: string;
  nivelOcupacionPreferido: NivelOcupacion | null;
  /** Presupuesto usado para las razones (el del filtro rápido o el de las preferencias). */
  presupuesto: Presupuesto | null;
  /** false si el usuario aún no configuró preferencias (lista vacía). */
  tienePreferencias: boolean;
  recomendaciones: Recomendacion[];
}

export interface OpcionesRecomendacion {
  fecha?: string;
  hora?: string;
  /** Filtro rápido; si no viene, se usa el presupuesto guardado en las preferencias. */
  presupuesto?: Presupuesto;
}

const PESOS: Record<TipoPreferencia, number> = { categoria: 0.5, experiencia: 0.3, grupo: 0.2 };
const TOPE_COINCIDENCIAS: Record<TipoPreferencia, number> = { categoria: 1, experiencia: 2, grupo: 2 };
const PUNTOS_AFINIDAD = 85;
const AJUSTE_OCUPACION = [15, 0, -15] as const; // por distancia entre niveles

const AJUSTE_CERRADO = -15;

export function ajustePorOcupacion(
  predicho: NivelOcupacion | null | undefined,
  preferido: NivelOcupacion | null,
  cerrado = false,
): number {
  if (cerrado) return AJUSTE_CERRADO;
  if (!predicho || !preferido) return 0;
  return AJUSTE_OCUPACION[distanciaNiveles(predicho, preferido)] ?? 0;
}

export function construirRazon(
  coincidencias: string[],
  predicho: NivelOcupacion | null | undefined,
  preferido: NivelOcupacion | null,
  cerrado = false,
): string {
  const [a, b, ...resto] = coincidencias;
  let razon = `Coincide con ${b ? `${a} y ${b}` : a}`;
  if (resto.length > 0) razon += ` (+${resto.length})`;
  if (cerrado) {
    razon += ' · cerrado ahora';
  } else if (predicho) {
    razon += ` · ocupación ${ADJETIVO_OCUPACION[predicho]} ahora`;
    if (predicho === preferido) razon += ', como prefieres';
  }
  return razon;
}

export async function recomendar(
  db: Db,
  idUsuario: string,
  opciones: OpcionesRecomendacion = {},
): Promise<ResultadoRecomendaciones> {
  const ahora = ahoraEnColombia();
  const fecha = opciones.fecha ?? ahora.fecha;
  const hora = opciones.hora ?? ahora.hora;
  const { preferencias, nivelOcupacion, presupuesto: guardado } = await preferenciaService.obtenerDetalladas(db, idUsuario);
  const presupuesto = opciones.presupuesto ?? guardado;
  const base = { fecha, hora, nivelOcupacionPreferido: nivelOcupacion, presupuesto };

  if (preferencias.length === 0) {
    return { ...base, tienePreferencias: false, recomendaciones: [] };
  }

  let destinos = await destinoModel.listarVisibles(db, { soloAbiertos: true });
  if (opciones.presupuesto) {
    const filtro = opciones.presupuesto;
    destinos = destinos.filter((d) => d.precio_min_cop == null || d.precio_min_cop <= filtro.maxCop);
  }
  const ids = destinos.map((d) => d.id_destino);
  const [etiquetas, predicciones, calificaciones] = await Promise.all([
    destinoModel.listarEtiquetas(db, ids),
    prediccionService.predecirVarios(db, destinos, fecha, hora),
    resenaModel.resumen(db, ids),
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
    const cumplidasPorTipo: Record<TipoPreferencia, preferenciaService.PreferenciaDetallada[]> = {
      categoria: [],
      experiencia: [],
      grupo: [],
    };
    let afinidad = 0;
    for (const tipo of dimensiones) {
      const propias = delUsuario(tipo);
      const cumplidas = propias.filter(cumple);
      cumplidasPorTipo[tipo] = cumplidas;
      coincidencias.push(...cumplidas.map((p) => p.nombre));
      const tope = Math.min(propias.length, TOPE_COINCIDENCIAS[tipo]);
      afinidad += PESOS[tipo] * (Math.min(cumplidas.length, tope) / tope);
    }
    if (coincidencias.length === 0) continue;
    afinidad /= pesoTotal;

    const prediccion = predicciones.get(destino.id_destino);
    const cerrado = prediccion?.estado === 'Cerrado';
    const calificacion = calificaciones.get(destino.id_destino) ?? null;
    const precio =
      destino.precio_min_cop != null && destino.precio_max_cop != null
        ? { minCop: destino.precio_min_cop, maxCop: destino.precio_max_cop, estimado: destino.precio_es_estimado }
        : null;

    const ajuste =
      ajustePorOcupacion(prediccion?.nivel, nivelOcupacion, cerrado) +
      (precio && presupuesto ? AJUSTE_PRESUPUESTO[encajePresupuesto(precio, presupuesto)] : 0) +
      ajusteCalificacion(calificacion);
    const puntaje = Math.round(Math.min(100, Math.max(0, PUNTOS_AFINIDAD * afinidad + ajuste)));

    const destinoApi = aDestino(destino, prediccion);
    const { razones, porQue, porQueCorto } = explicar({
      categoria: destino.categoria,
      horario: destinoApi.horario,
      hora,
      gustos: [...cumplidasPorTipo.categoria, ...cumplidasPorTipo.experiencia].map((p) => p.nombre),
      grupos: cumplidasPorTipo.grupo.map((p) => p.codigo),
      precio,
      presupuesto,
      prediccion,
      motivoCierre: destinoApi.cierre?.motivo ?? null,
      calificacion,
      nivelPreferido: nivelOcupacion,
    });

    recomendaciones.push({
      ...destinoApi,
      puntaje,
      coincidencias,
      razon: construirRazon(coincidencias, prediccion?.nivel, nivelOcupacion, cerrado),
      porQue,
      porQueCorto,
      razones,
      calificacion,
    });
  }

  recomendaciones.sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      Number(a.ocupacionActual?.estado === 'Cerrado') - Number(b.ocupacionActual?.estado === 'Cerrado') ||
      (a.ocupacionActual?.porcentaje ?? 100) - (b.ocupacionActual?.porcentaje ?? 100) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );

  return { ...base, tienePreferencias: true, recomendaciones };
}
