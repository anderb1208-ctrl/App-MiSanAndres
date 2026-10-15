/**
 * Único lugar donde la app lee su configuración (variables EXPO_PUBLIC_ de mobile/.env;
 * ver mobile/.env.example).
 *
 * Expo REEMPLAZA estas variables por su valor al construir el bundle: cambiar el .env
 * no tiene efecto hasta reiniciar Metro limpiando la caché (`npm run start:limpio`,
 * que es `expo start --clear`). Por eso se leen una por una y con el nombre literal.
 *
 * No hay valores por defecto: si falta una variable o la URL no es válida, la app
 * muestra una pantalla de configuración en vez de apuntar a otro servidor en silencio.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Valida y normaliza la URL del backend: sin barra final y sin /v1. */
function normalizarApiUrl(valor: string | undefined): { origen: string } | { error: string } {
  const texto = valor?.trim();
  if (!texto) return { error: 'Falta EXPO_PUBLIC_API_URL en mobile/.env.' };
  if (!/^https?:\/\/[^\s/]+/i.test(texto)) {
    return { error: `EXPO_PUBLIC_API_URL debe empezar por http:// o https:// (valor actual: "${texto}").` };
  }
  return { origen: texto.replace(/\/+$/, '').replace(/\/v1$/i, '') };
}

const api = normalizarApiUrl(apiUrl);

/** Problemas de configuración, en texto para mostrar (lista vacía = todo bien). */
export const erroresConfiguracion: string[] = [
  ...('error' in api ? [api.error] : []),
  ...(!supabaseUrl ? ['Falta EXPO_PUBLIC_SUPABASE_URL en mobile/.env.'] : []),
  ...(!supabasePublishableKey ? ['Falta EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en mobile/.env.'] : []),
];

export const configuracionValida = erroresConfiguracion.length === 0;

function requerir<T>(valor: T | undefined, nombre: string): T {
  if (valor === undefined || valor === '') {
    throw new Error(`Configuración incompleta: ${nombre}. ${erroresConfiguracion.join(' ')}`);
  }
  return valor;
}

/** Origen del backend (sin /v1 ni barra final); sirve también los archivos estáticos (fotos). */
export const API_ORIGEN: string = 'origen' in api ? api.origen : '';

/** Base de la API (origen + /v1). */
export const API_BASE_URL: string = API_ORIGEN ? `${API_ORIGEN}/v1` : '';

export const SUPABASE_URL = supabaseUrl ?? '';
export const SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey ?? '';

/** Base de la API o error claro si la configuración está incompleta (nunca una URL vacía). */
export const obtenerApiBaseUrl = () => requerir(API_BASE_URL || undefined, 'EXPO_PUBLIC_API_URL');

/** true si la URL apunta a la red local (localhost, IP privada o puerto 3000). */
export function esServidorLocal(url: string): boolean {
  return /\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?(\/|$)|:3000(\/|$)/i.test(
    url,
  );
}

// En desarrollo se muestra al arrancar a qué servidor habla la app.
if (__DEV__) {
  if (configuracionValida) {
    console.log(`[MiSanAndrés] API: ${API_BASE_URL}`);
    if (esServidorLocal(API_BASE_URL)) {
      console.warn(
        '[MiSanAndrés] La app apunta a un servidor LOCAL. Si el .env ya tiene otra URL, reinicia con `npm run start:limpio` (expo start --clear).',
      );
    }
  } else {
    console.warn(`[MiSanAndrés] Configuración incompleta: ${erroresConfiguracion.join(' ')}`);
  }
}
