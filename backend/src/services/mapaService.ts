/**
 * Datos de la pestaña Mapa en una sola respuesta liviana: todos los destinos visibles
 * con sus coordenadas y la ocupación predicha para ahora. Pensado para conexiones
 * móviles lentas: una petición en vez de una por destino.
 *
 * Reutiliza prediccionService.predecirVarios (horario, clima y calendario), que hace
 * una consulta al histórico y una sola llamada de clima para todo el lote.
 */
import type { Db } from '../config/supabase';
import type { CategoriaDestino, NivelOcupacion } from '../models/database.types';
import * as destinoModel from '../models/destinoModel';
import { ahoraEnColombia } from '../utils/fecha';
import type { MotivoSinClima } from './clima/climaService';
import * as prediccionService from './prediccionService';

export interface OcupacionMapa {
  estado: prediccionService.EstadoAtencion;
  porcentaje: number;
  /** null si está cerrado. */
  nivel: NivelOcupacion | null;
}

export interface DestinoMapa {
  id: number;
  nombre: string;
  categoria: CategoriaDestino;
  latitud: number;
  longitud: number;
  /** Foto para la tarjeta del marcador (o null: placeholder por categoría). */
  imagenUrl: string | null;
  /** null si no hay historial para predecir. */
  ocupacion: OcupacionMapa | null;
}

export interface Mapa {
  fecha: string;
  hora: string;
  /** Por qué la predicción no usó clima (si a ningún destino abierto le llegó clima), o null. */
  motivoSinClima: MotivoSinClima | null;
  destinos: DestinoMapa[];
}

export async function obtener(db: Db): Promise<Mapa> {
  const filas = await destinoModel.listarVisibles(db);
  const { fecha, hora } = ahoraEnColombia();
  const predicciones = await prediccionService.predecirVarios(db, filas, fecha, hora);

  const destinos = filas.map((f): DestinoMapa => {
    const p = predicciones.get(f.id_destino);
    return {
      id: f.id_destino,
      nombre: f.nombre,
      categoria: f.categoria,
      latitud: Number(f.latitud),
      longitud: Number(f.longitud),
      imagenUrl: f.imagen_url,
      ocupacion: p ? { estado: p.estado, porcentaje: p.porcentaje, nivel: p.nivel } : null,
    };
  });

  // Los cerrados no consultan el clima: el motivo sale de los abiertos.
  const abiertas = [...predicciones.values()].filter((p) => p.estado === 'Abierto');
  const motivoSinClima =
    abiertas.length > 0 && abiertas.every((p) => p.clima === null) ? (abiertas[0]?.motivoSinClima ?? null) : null;

  return { fecha, hora, motivoSinClima, destinos };
}
