/**
 * Comparativa de los modelos de ML para el panel del administrador.
 *
 * - listarModelos: GET /modelo del servicio de ML (los tres modelos, el baseline, el ganador
 *   y cuál está activo).
 * - compararPrediccion: POST /comparar con las mismas features que una predicción normal
 *   (clima de la caché de la isla) y devuelve los tres modelos y el baseline lado a lado.
 *
 * Las predicciones normales NO pasan por aquí: siguen usando solo el ganador (mlProvider).
 * Si el servicio de ML no responde, se devuelve un 503 con un mensaje claro.
 */
import { z } from 'zod';
import { env } from '../config/env';
import type { Db } from '../config/supabase';
import * as destinoModel from '../models/destinoModel';
import { noEncontrado, servicioNoDisponible } from '../utils/errores';
import * as climaService from './clima/climaService';

/** /comparar puede cargar un modelo bajo demanda y Render gratis tarda en despertar. */
export const TIMEOUT_ADMIN_ML_MS = 20_000;

const nivel = z.enum(['Bajo', 'Medio', 'Alto']).nullable();
const numero = z.number().nullable();

const esquemaModelo = z.object({
  clave: z.string(),
  nombre: z.string(),
  mae: numero,
  rmse: numero,
  r2: numero,
  tamano_mb: numero,
  ganador: z.boolean(),
  activo: z.boolean(),
  disponible: z.boolean(),
});

const esquemaModelos = z.object({
  ganador: z.string().nullable(),
  activo: z.string().nullable(),
  respaldo: z.boolean(),
  modelos: z.array(esquemaModelo),
  baseline: z.object({ clave: z.string(), nombre: z.string(), mae: numero, rmse: numero, r2: numero }).nullable(),
  seleccion: z.object({ motivo: z.string(), criterio: z.string() }).nullable().optional(),
  datos_sinteticos: z.boolean(),
  mensaje_origen: z.string().nullable(),
  fecha_comparacion: z.string().nullable().optional(),
});

const esquemaComparar = z.object({
  id_destino: z.number().int(),
  fecha: z.string(),
  hora: z.string(),
  estado: z.enum(['Abierto', 'Cerrado']),
  ganador: z.string().nullable(),
  datos_sinteticos: z.boolean(),
  mensaje_origen: z.string().nullable(),
  resultados: z.array(
    z.object({
      clave: z.string(),
      nombre: z.string(),
      ganador: z.boolean(),
      activo: z.boolean(),
      disponible: z.boolean(),
      porcentaje: numero,
      nivel,
      personas_estimadas: numero,
      error: z.string().nullable().optional(),
    }),
  ),
});

export interface ModeloMl {
  clave: string;
  nombre: string;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  tamanoMb: number | null;
  ganador: boolean;
  activo: boolean;
  disponible: boolean;
}

export interface ComparativaModelos {
  ganador: string | null;
  activo: string | null;
  respaldo: boolean;
  modelos: ModeloMl[];
  baseline: { clave: string; nombre: string; mae: number | null; rmse: number | null; r2: number | null } | null;
  motivo: string | null;
  criterio: string | null;
  datosSimulados: boolean;
  mensajeOrigen: string | null;
  fechaComparacion: string | null;
}

export interface ResultadoComparado {
  clave: string;
  nombre: string;
  ganador: boolean;
  activo: boolean;
  disponible: boolean;
  porcentaje: number | null;
  nivel: 'Bajo' | 'Medio' | 'Alto' | null;
  personasEstimadas: number | null;
  error: string | null;
}

export interface ComparacionPrediccion {
  destinoId: number;
  nombre: string;
  fecha: string;
  hora: string;
  estado: 'Abierto' | 'Cerrado';
  ganador: string | null;
  conClima: boolean;
  datosSimulados: boolean;
  mensajeOrigen: string | null;
  resultados: ResultadoComparado[];
}

const MENSAJE_SIN_RESPUESTA =
  'El servicio de ML no respondió. Si está en Render gratis puede estar despertando (tarda hasta un minuto): inténtalo de nuevo.';

/** Llama al servicio de ML; convierte cualquier falla en un 503 claro (o 404 si el destino no existe allá). */
async function pedirMl<T>(ruta: string, esquema: z.ZodType<T>, cuerpo?: unknown): Promise<T> {
  const { ML_SERVICE_URL: url, ML_API_KEY: apiKey } = env;
  if (!url || !apiKey) {
    throw servicioNoDisponible('El servicio de ML no está configurado en el backend (faltan ML_SERVICE_URL y ML_API_KEY).');
  }
  let respuesta: Response;
  try {
    respuesta = await fetch(`${url.replace(/\/+$/, '')}${ruta}`, {
      method: cuerpo === undefined ? 'GET' : 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIMEOUT_ADMIN_ML_MS),
    });
  } catch {
    throw servicioNoDisponible(MENSAJE_SIN_RESPUESTA);
  }
  const datos: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const detalle = (datos as { detail?: { codigo?: string; mensaje?: string } } | null)?.detail;
    if (respuesta.status === 404 && detalle?.codigo === 'DESTINO_DESCONOCIDO') {
      throw noEncontrado('El modelo de ML no conoce este destino (se agregó después del último entrenamiento).');
    }
    throw servicioNoDisponible(`El servicio de ML respondió ${respuesta.status}${detalle?.mensaje ? `: ${detalle.mensaje}` : '.'}`);
  }
  const valido = esquema.safeParse(datos);
  if (!valido.success) throw servicioNoDisponible('El servicio de ML devolvió una respuesta con formato inesperado.');
  return valido.data;
}

export async function listarModelos(): Promise<ComparativaModelos> {
  const d = await pedirMl('/modelo', esquemaModelos);
  return {
    ganador: d.ganador,
    activo: d.activo,
    respaldo: d.respaldo,
    modelos: d.modelos.map((m) => ({
      clave: m.clave,
      nombre: m.nombre,
      mae: m.mae,
      rmse: m.rmse,
      r2: m.r2,
      tamanoMb: m.tamano_mb,
      ganador: m.ganador,
      activo: m.activo,
      disponible: m.disponible,
    })),
    baseline: d.baseline,
    motivo: d.seleccion?.motivo ?? null,
    criterio: d.seleccion?.criterio ?? null,
    datosSimulados: d.datos_sinteticos,
    mensajeOrigen: d.mensaje_origen,
    fechaComparacion: d.fecha_comparacion ?? null,
  };
}

export async function compararPrediccion(db: Db, idDestino: number, fecha: string, hora: string): Promise<ComparacionPrediccion> {
  const destino = await destinoModel.obtenerVisible(db, idDestino);
  if (!destino) throw noEncontrado('Destino no encontrado.');
  const punto = { clave: climaService.claveDestino(idDestino), latitud: Number(destino.latitud), longitud: Number(destino.longitud) };
  const clima = (await climaService.climaEnHora([punto], fecha, hora)).get(punto.clave)?.clima ?? null;
  const d = await pedirMl('/comparar', esquemaComparar, {
    id_destino: idDestino,
    fecha,
    hora,
    clima: clima ? { temperatura: clima.temperatura, precipitacion: clima.precipitacion, viento: clima.viento } : null,
  });
  return {
    destinoId: idDestino,
    nombre: destino.nombre,
    fecha,
    hora,
    estado: d.estado,
    ganador: d.ganador,
    conClima: clima !== null,
    datosSimulados: d.datos_sinteticos,
    mensajeOrigen: d.mensaje_origen,
    resultados: d.resultados.map((r) => ({
      clave: r.clave,
      nombre: r.nombre,
      ganador: r.ganador,
      activo: r.activo,
      disponible: r.disponible,
      porcentaje: r.porcentaje,
      nivel: r.nivel,
      personasEstimadas: r.personas_estimadas,
      error: r.error ?? null,
    })),
  };
}
