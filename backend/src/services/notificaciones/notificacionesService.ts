/**
 * Notificaciones push remotas (Expo Push API).
 *
 * Solo se usan para los cambios que decide un administrador: cierre temporal y reapertura
 * de un destino. Los avisos de apertura/cierre del horario normal son notificaciones
 * LOCALES que programa la app (sin servidor).
 *
 * - El envío depende de la interfaz ProveedorPush (en las pruebas se usa uno falso).
 * - Lotes de máximo 100 mensajes (límite de Expo).
 * - Los tokens que Expo reporta como DeviceNotRegistered se desactivan en la base.
 * - Un fallo al notificar nunca deshace el cambio de estado: se informa en el resultado.
 */
import type { Db } from '../../config/supabase';
import { env } from '../../config/env';
import * as dispositivoModel from '../../models/dispositivoModel';
import { ExpoPushProvider } from './expoPushProvider';

export const TAMANO_LOTE = 100;
export const CANAL_ANDROID = 'avisos-destinos';

export interface MensajePush {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: 'default';
  channelId: string;
}

/** Ticket de Expo por mensaje (mismo orden del lote). */
export type TicketPush = { status: 'ok'; id?: string } | { status: 'error'; message: string; details?: { error?: string } };

export interface ProveedorPush {
  readonly nombre: string;
  /** Envía un lote (≤ 100 mensajes) y devuelve un ticket por mensaje. Lanza si el servicio falla. */
  enviarLote(mensajes: MensajePush[]): Promise<TicketPush[]>;
}

export interface ResultadoAviso {
  tipo: 'cierre' | 'apertura';
  destinatarios: number;
  enviados: number;
  fallidos: number;
  tokensDesactivados: number;
  /** Mensaje si el envío no se pudo completar (p. ej. Expo no respondió). */
  error: string | null;
}

let proveedor: ProveedorPush = new ExpoPushProvider({ accessToken: env.EXPO_ACCESS_TOKEN });

/** Cambia el proveedor (uno falso en las pruebas). */
export function usarProveedorPush(nuevo: ProveedorPush) {
  proveedor = nuevo;
}

const lotes = <T>(lista: T[], tamano: number) =>
  Array.from({ length: Math.ceil(lista.length / tamano) }, (_, i) => lista.slice(i * tamano, (i + 1) * tamano));

/** Texto del aviso, con el motivo del cierre si lo hay. */
export function textoAviso(nombre: string, tipo: 'cierre' | 'apertura', motivo: string | null, hasta: string | null) {
  if (tipo === 'apertura') {
    return { title: `${nombre} reabrió`, body: `${nombre} ya está abierto de nuevo. ¡Buen momento para visitarlo!` };
  }
  const hastaTexto = hasta
    ? ` hasta el ${new Date(hasta).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}`
    : '';
  return {
    title: `${nombre} cerró temporalmente`,
    body: `${motivo ? `Motivo: ${motivo}. ` : ''}Cerrado${hastaTexto}. Te avisaremos cuando reabra.`,
  };
}

/**
 * Avisa a quienes tienen el destino en favoritos con el aviso activo. Se ejecuta con el
 * JWT del administrador (las funciones de la base comprueban el rol).
 */
export async function avisarCambioDestino(
  db: Db,
  destino: { id: number; nombre: string; motivo: string | null; hasta: string | null },
  tipo: 'cierre' | 'apertura',
): Promise<ResultadoAviso> {
  const resultado: ResultadoAviso = { tipo, destinatarios: 0, enviados: 0, fallidos: 0, tokensDesactivados: 0, error: null };
  try {
    const tokens = await dispositivoModel.tokensParaAviso(db, destino.id, tipo);
    resultado.destinatarios = tokens.length;
    if (tokens.length === 0) return resultado;

    const { title, body } = textoAviso(destino.nombre, tipo, destino.motivo, destino.hasta);
    const mensajes: MensajePush[] = tokens.map((to) => ({
      to,
      title,
      body,
      data: { tipo: 'destino', idDestino: destino.id, aviso: tipo },
      sound: 'default',
      channelId: CANAL_ANDROID,
    }));

    const invalidos: string[] = [];
    for (const lote of lotes(mensajes, TAMANO_LOTE)) {
      const tickets = await proveedor.enviarLote(lote);
      tickets.forEach((t, i) => {
        if (t.status === 'ok') resultado.enviados++;
        else {
          resultado.fallidos++;
          if (t.details?.error === 'DeviceNotRegistered') invalidos.push(lote[i]!.to);
        }
      });
    }
    resultado.tokensDesactivados = await dispositivoModel.desactivar(db, invalidos);
  } catch (e) {
    resultado.error = (e as Error).message;
    if (env.NODE_ENV !== 'test') console.warn(`[push] No se pudo avisar (${tipo}) de ${destino.nombre}: ${resultado.error}`);
  }
  return resultado;
}
