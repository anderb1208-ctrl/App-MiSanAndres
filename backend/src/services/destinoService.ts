import type { Db } from '../config/supabase';
import type {
  CategoriaDestino,
  DestinoRow,
  EstadoDestino,
  NivelOcupacion,
  RangoPrecio,
} from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import { noEncontrado } from '../utils/errores';
import { ahoraEnColombia } from '../utils/fecha';
import { type Horario, horarioDe } from '../utils/horario';
import * as prediccionService from './prediccionService';

export interface OcupacionActual {
  fecha: string;
  hora: string;
  /** "Cerrado" si a esta hora el destino está fuera de su horario. */
  estado: prediccionService.EstadoAtencion;
  porcentaje: number;
  /** null cuando está cerrado. */
  nivel: NivelOcupacion | null;
  personasEstimadas: number;
}

export interface ImagenDestino {
  url: string;
  autor: string | null;
  licencia: string | null;
  /** Enlace a la página de la foto. */
  fuente: string | null;
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
  /** Horario en hora de Colombia; null = sin horario (siempre accesible). */
  horario: Horario | null;
  rangoPrecio: RangoPrecio | null;
  comoLlegar: string | null;
  /** Se mantiene por compatibilidad; igual a `imagen.url`. */
  imagenUrl: string | null;
  imagen: ImagenDestino | null;
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
    estado: p.estado,
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
    horario: horarioDe(fila),
    rangoPrecio: fila.rango_precio,
    comoLlegar: fila.como_llegar,
    imagenUrl: fila.imagen_url,
    imagen: fila.imagen_url
      ? {
          url: fila.imagen_url,
          autor: fila.imagen_autor,
          licencia: fila.imagen_licencia,
          fuente: fila.imagen_fuente,
        }
      : null,
    ocupacionActual: aOcupacionActual(prediccion),
  };
}

/** Destinos con su ocupación predicha para ahora; filtros opcionales (q busca en el nombre). */
export async function listar(
  db: Db,
  filtros: { categoria?: CategoriaDestino; nivelOcupacion?: NivelOcupacion; q?: string },
): Promise<Destino[]> {
  const filas = await destinoModel.listarVisibles(db, { categoria: filtros.categoria, nombre: filtros.q });
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
