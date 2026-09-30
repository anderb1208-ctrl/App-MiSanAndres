import type { Db } from '../config/supabase';
import type {
  CategoriaDestino,
  DestinoRow,
  EstadoDestino,
  NivelOcupacion,
} from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import { noEncontrado } from '../utils/errores';
import { ahoraEnColombia } from '../utils/fecha';
import * as prediccionService from './prediccionService';

export interface OcupacionActual {
  fecha: string;
  hora: string;
  porcentaje: number;
  nivel: NivelOcupacion;
  personasEstimadas: number;
}

export interface Destino {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaDestino;
  ubicacion: string;
  latitud: number;
  longitud: number;
  capacidad: number;
  estado: EstadoDestino;
  imagenUrl: string | null;
  /** Ocupación predicha para la hora actual en Colombia (null si no hay historial). */
  ocupacionActual: OcupacionActual | null;
}

export interface Etiqueta {
  codigo: string;
  nombre: string;
}

export interface DestinoDetalle extends Destino {
  etiquetas: { experiencias: Etiqueta[]; grupos: Etiqueta[] };
}

export function aOcupacionActual(p: prediccionService.Prediccion | undefined | null): OcupacionActual | null {
  if (!p) return null;
  return {
    fecha: p.fecha,
    hora: p.hora,
    porcentaje: p.porcentaje,
    nivel: p.nivel,
    personasEstimadas: p.personasEstimadas,
  };
}

export function aDestino(fila: DestinoRow, prediccion?: prediccionService.Prediccion | null): Destino {
  return {
    id: fila.id_destino,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    ubicacion: fila.ubicacion_texto,
    latitud: Number(fila.latitud),
    longitud: Number(fila.longitud),
    capacidad: fila.capacidad,
    estado: fila.estado,
    imagenUrl: fila.imagen_url,
    ocupacionActual: aOcupacionActual(prediccion),
  };
}

/** Destinos con su ocupación predicha para ahora; filtros opcionales. */
export async function listar(
  db: Db,
  filtros: { categoria?: CategoriaDestino; nivelOcupacion?: NivelOcupacion },
): Promise<Destino[]> {
  const filas = await destinoModel.listarVisibles(db, { categoria: filtros.categoria });
  const { fecha, hora } = ahoraEnColombia();
  const predicciones = await prediccionService.predecirVarios(db, filas, fecha, hora);

  const destinos = filas.map((f) => aDestino(f, predicciones.get(f.id_destino)));
  return filtros.nivelOcupacion
    ? destinos.filter((d) => d.ocupacionActual?.nivel === filtros.nivelOcupacion)
    : destinos;
}

/** Destino visible o 404. */
export async function obtenerOFallar(db: Db, id: number): Promise<DestinoRow> {
  const fila = await destinoModel.obtenerVisible(db, id);
  if (!fila) throw noEncontrado(`No existe un destino con id ${id}.`);
  return fila;
}

/** Detalle completo: datos, etiquetas y ocupación predicha para ahora. */
export async function obtenerDetalle(db: Db, id: number): Promise<DestinoDetalle> {
  const fila = await obtenerOFallar(db, id);
  const { fecha, hora } = ahoraEnColombia();
  const [etiquetas, prediccion] = await Promise.all([
    destinoModel.listarEtiquetas(db, [id]),
    prediccionService.predecir(db, fila, fecha, hora),
  ]);

  const deTipo = (tipo: 'experiencia' | 'grupo') =>
    etiquetas.filter((e) => e.tipo === tipo).map(({ codigo, nombre }) => ({ codigo, nombre }));

  return {
    ...aDestino(fila, prediccion),
    etiquetas: { experiencias: deTipo('experiencia'), grupos: deTipo('grupo') },
  };
}
