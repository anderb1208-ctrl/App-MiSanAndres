/**
 * Envío por la Expo Push API (https://exp.host/--/api/v2/push/send). No necesita clave;
 * si en el proyecto de Expo se activa "Enhanced Security for Push Notifications", hay que
 * definir EXPO_ACCESS_TOKEN.
 */
import type { MensajePush, ProveedorPush, TicketPush } from './notificacionesService';

const URL_EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

export class ExpoPushProvider implements ProveedorPush {
  readonly nombre = 'Expo Push';

  constructor(private readonly opciones: { accessToken?: string; timeoutMs?: number; fetch?: typeof fetch } = {}) {}

  async enviarLote(mensajes: MensajePush[]): Promise<TicketPush[]> {
    const respuesta = await (this.opciones.fetch ?? fetch)(URL_EXPO_PUSH, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        ...(this.opciones.accessToken && { Authorization: `Bearer ${this.opciones.accessToken}` }),
      },
      body: JSON.stringify(mensajes),
      signal: AbortSignal.timeout(this.opciones.timeoutMs ?? 10_000),
    });
    const cuerpo = (await respuesta.json().catch(() => null)) as { data?: TicketPush[]; errors?: { message: string }[] } | null;
    if (!respuesta.ok || !Array.isArray(cuerpo?.data)) {
      throw new Error(`Expo Push respondió ${respuesta.status}${cuerpo?.errors?.[0] ? `: ${cuerpo.errors[0].message}` : ''}`);
    }
    return cuerpo.data;
  }
}
