import { obtenerApiBaseUrl } from '../config/env';
import { MENSAJE_SESION_VENCIDA, notificarSesionVencida } from './sesion';
import { supabase } from './supabase';

const TIEMPO_LIMITE_MS = 15_000;

/** Error de una llamada a la API con el formato { error: { codigo, mensaje } } del backend. */
export class ErrorApi extends Error {
  constructor(
    /** Código HTTP; 0 si no hubo respuesta (sin conexión o tiempo agotado). */
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  get sinConexion() {
    return this.status === 0;
  }
}

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cuerpo?: unknown;
  /** Envía el JWT de la sesión en Authorization. */
  autenticado?: boolean;
  consulta?: Record<string, string | number | undefined>;
}

async function tokenDeSesion(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    notificarSesionVencida();
    throw new ErrorApi(401, 'NO_AUTENTICADO', MENSAJE_SESION_VENCIDA);
  }
  return token;
}

function construirUrl(ruta: string, consulta?: Opciones['consulta']) {
  const params = Object.entries(consulta ?? {})
    .filter((par): par is [string, string | number] => par[1] !== undefined && par[1] !== '')
    .map(([clave, valor]) => `${encodeURIComponent(clave)}=${encodeURIComponent(String(valor))}`)
    .join('&');
  return `${obtenerApiBaseUrl()}${ruta}${params ? `?${params}` : ''}`;
}

/** Hace una petición al backend y devuelve el JSON tipado (o undefined en 204). */
export async function solicitud<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { metodo = 'GET', cuerpo, autenticado = false, consulta } = opciones;
  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (autenticado) cabeceras.Authorization = `Bearer ${await tokenDeSesion()}`;

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

  let respuesta: Response;
  try {
    respuesta = await fetch(construirUrl(ruta, consulta), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
  } catch {
    // En desarrollo se muestra la URL usada, para detectar un EXPO_PUBLIC_API_URL mal configurado.
    const detalle = __DEV__ ? ` (Servidor: ${obtenerApiBaseUrl()})` : '';
    throw new ErrorApi(
      0,
      'SIN_CONEXION',
      `No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo.${detalle}`,
    );
  } finally {
    clearTimeout(temporizador);
  }

  if (respuesta.status === 204) return undefined as T;

  const datos: unknown = await respuesta.json().catch(() => null);
  // Sesión vencida o revocada: la app vuelve al login con un mensaje claro.
  if (respuesta.status === 401 && autenticado) {
    notificarSesionVencida();
    throw new ErrorApi(401, 'NO_AUTENTICADO', MENSAJE_SESION_VENCIDA);
  }
  if (!respuesta.ok) {
    const error = (datos as { error?: { codigo?: string; mensaje?: string } } | null)?.error;
    throw new ErrorApi(
      respuesta.status,
      error?.codigo ?? 'ERROR_INTERNO',
      error?.mensaje ?? 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
    );
  }
  return datos as T;
}

/** Mensaje apto para mostrar al usuario a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  return 'Algo salió mal. Intenta de nuevo en unos minutos.';
}
