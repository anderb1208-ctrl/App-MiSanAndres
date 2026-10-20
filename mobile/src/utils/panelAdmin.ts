import type { Destino, Ticket } from '../services/tipos';
import { esActivo } from './panelTecnico';

export interface Variacion {
  texto: string;
  direccion: 'sube' | 'baja' | 'igual' | 'nuevo';
}

/** Variación frente al periodo anterior: "+12 %", "−5 %", "Sin cambios". null si no hay dato anterior. */
export function variacion(actual: number, anterior: number | null | undefined): Variacion | null {
  if (anterior === null || anterior === undefined) return null;
  if (anterior === 0) return actual > 0 ? { texto: 'Nuevo en este periodo', direccion: 'nuevo' } : { texto: 'Sin cambios', direccion: 'igual' };
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  if (pct === 0) return { texto: 'Sin cambios', direccion: 'igual' };
  return { texto: `${pct > 0 ? '+' : '−'}${Math.abs(pct)} %`, direccion: pct > 0 ? 'sube' : 'baja' };
}

/** Estado del servicio de ML visto desde el panel. */
export type EstadoMl = 'ok' | 'respaldo' | 'sin_respuesta' | 'heuristico';

export interface AlertaAdmin {
  clave: string;
  tono: 'alerta' | 'aviso';
  titulo: string;
  detalle: string;
  destino?: 'tickets' | 'destinos' | 'modelos';
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * Alertas del administrador, de más a menos grave: tickets de prioridad alta sin asignar, destinos
 * cerrados temporalmente (con motivo y desde cuándo) y el servicio de ML en respaldo o sin respuesta.
 * Lista vacía = todo funcionando.
 */
export function alertasAdmin(
  tickets: readonly Pick<Ticket, 'estado' | 'prioridad' | 'tecnico'>[] | null | undefined,
  destinos: readonly Pick<Destino, 'id' | 'nombre' | 'estado' | 'cierre'>[] | null | undefined,
  estadoMl: EstadoMl | null,
): AlertaAdmin[] {
  const alertas: AlertaAdmin[] = [];
  const altaSinAsignar = (tickets ?? []).filter((t) => esActivo(t) && t.prioridad === 'alta' && !t.tecnico).length;
  if (altaSinAsignar > 0) {
    alertas.push({
      clave: 'alta-sin-asignar',
      tono: 'alerta',
      titulo: `${altaSinAsignar} ${altaSinAsignar === 1 ? 'ticket de prioridad alta sin asignar' : 'tickets de prioridad alta sin asignar'}`,
      detalle: 'Asígnalos a un técnico para que alguien los atienda.',
      destino: 'tickets',
    });
  }
  for (const d of destinos ?? []) {
    if (d.estado !== 'cerrado_temporal') continue;
    const partes = [
      d.cierre?.motivo ? `Motivo: ${d.cierre.motivo}` : 'Sin motivo registrado',
      d.cierre?.desde ? `desde el ${fechaCorta(d.cierre.desde)}` : null,
      d.cierre?.hasta ? `reabre el ${fechaCorta(d.cierre.hasta)}` : null,
    ].filter(Boolean);
    alertas.push({ clave: `cerrado-${d.id}`, tono: 'aviso', titulo: `${d.nombre} está cerrado temporalmente`, detalle: `${partes.join(' · ')}.`, destino: 'destinos' });
  }
  if (estadoMl === 'respaldo') {
    alertas.push({
      clave: 'ml-respaldo',
      tono: 'aviso',
      titulo: 'El servicio de ML está usando un modelo de respaldo',
      detalle: 'El ganador no se pudo cargar; las predicciones las da el siguiente mejor modelo.',
      destino: 'modelos',
    });
  } else if (estadoMl === 'sin_respuesta') {
    alertas.push({
      clave: 'ml-caido',
      tono: 'aviso',
      titulo: 'El servicio de ML no responde',
      detalle: 'Las predicciones usan el cálculo heurístico (promedio histórico) hasta que vuelva.',
      destino: 'modelos',
    });
  }
  return alertas;
}

export interface SegmentoBarra<K extends string> {
  clave: K;
  cantidad: number;
  fraccion: number;
}

/** Segmentos de una barra apilada en el orden dado (solo los que tienen algo). */
export function segmentosBarra<K extends string>(conteos: Partial<Record<K, number>>, orden: readonly K[]): { total: number; segmentos: SegmentoBarra<K>[] } {
  const total = orden.reduce((a, k) => a + Math.max(0, conteos[k] ?? 0), 0);
  if (total === 0) return { total, segmentos: [] };
  return {
    total,
    segmentos: orden.filter((k) => (conteos[k] ?? 0) > 0).map((k) => ({ clave: k, cantidad: conteos[k]!, fraccion: conteos[k]! / total })),
  };
}

/** Hora de la predicción de prueba del panel (a mediodía casi todos los destinos atienden). */
export const HORA_SONDA = '12:00';

/** Destino para la predicción de prueba: visible y abierto a HORA_SONDA (o sin horario). */
export function elegirDestinoSonda(
  destinos: readonly Pick<Destino, 'id' | 'estado' | 'horario'>[] | null | undefined,
): number | null {
  const abiertoA = (h: Destino['horario']) => !h || (h.apertura <= HORA_SONDA && HORA_SONDA < h.cierre);
  return (destinos ?? []).find((d) => d.estado === 'abierto' && abiertoA(d.horario))?.id ?? null;
}

/**
 * Estado del ML según lo que de verdad pasó en una predicción de prueba (el proveedor que la
 * respondió), no según si responde la comparativa de modelos (/v1/admin/modelos), que es otra cosa:
 * - proveedor ml: funciona (o con un modelo de respaldo si la comparativa lo dice).
 * - heurístico con proveedorRespaldo: se pidió el ML y no respondió.
 * - heurístico sin respaldo: el backend está configurado para no usar el ML.
 * Sin predicción de prueba, se usa la comparativa y, si tampoco hay, la configuración del backend.
 */
export function estadoMlDesde(p: {
  prediccion?: { proveedor: 'heuristico' | 'ml' | 'horario'; proveedorRespaldo: boolean } | null;
  comparativa?: { respaldo: boolean } | null;
  proveedorConfig?: string | null;
}): EstadoMl {
  if (p.prediccion?.proveedor === 'ml') return p.comparativa?.respaldo ? 'respaldo' : 'ok';
  if (p.prediccion?.proveedor === 'heuristico') return p.prediccion.proveedorRespaldo ? 'sin_respuesta' : 'heuristico';
  if (p.comparativa) return p.comparativa.respaldo ? 'respaldo' : 'ok';
  return p.proveedorConfig === 'heuristico' ? 'heuristico' : 'sin_respuesta';
}
