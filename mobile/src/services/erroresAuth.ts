/**
 * Traducción de los errores de Supabase Auth a mensajes en español, con el campo del
 * formulario al que corresponden. Sin dependencias de red: se prueba con Jest.
 */
import { isAuthWeakPasswordError, type AuthError } from '@supabase/supabase-js';
import { MIN_CONTRASENA } from '../utils/contrasena';

export type CampoAuth = 'correo' | 'contrasena';

export interface ErrorTraducido {
  mensaje: string;
  /** Campo del formulario al que se refiere (si no, es un error general). */
  campo?: CampoAuth;
}

/** Motivos de weak_password que da Supabase, traducidos. */
const MOTIVO_DEBIL: Record<string, string> = {
  length: `El servidor pide una contraseña más larga (mínimo ${MIN_CONTRASENA} caracteres).`,
  characters: 'El servidor pide otros tipos de caracteres (por ejemplo mayúsculas o símbolos). Prueba con otra contraseña o avísanos.',
  pwned: 'Esta contraseña apareció en filtraciones de datos conocidas. Elige otra.',
};

/** El motivo real por el que Supabase rechazó la contraseña (puede haber varios). */
function mensajeContrasenaDebil(error: AuthError): string {
  const motivos = isAuthWeakPasswordError(error) ? error.reasons : [];
  const textos = motivos.map((m) => MOTIVO_DEBIL[m]).filter(Boolean);
  return textos.length > 0 ? textos.join(' ') : 'El servidor rechazó la contraseña por ser débil. Prueba con otra.';
}

export function traducirErrorAuth(error: AuthError): ErrorTraducido {
  if (isAuthWeakPasswordError(error) || error.code === 'weak_password') {
    return { mensaje: mensajeContrasenaDebil(error), campo: 'contrasena' };
  }
  switch (error.code) {
    case 'invalid_credentials':
      return { mensaje: 'Correo o contraseña incorrectos.' };
    case 'email_not_confirmed':
      return { mensaje: 'Confirma tu correo con el enlace que te enviamos antes de iniciar sesión.' };
    case 'user_already_exists':
    case 'email_exists':
      return { mensaje: 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.', campo: 'correo' };
    case 'email_address_invalid':
      return { mensaje: 'El correo no es válido.', campo: 'correo' };
    case 'email_address_not_authorized':
      return { mensaje: 'Todavía no podemos enviar correos a esa dirección. Prueba con otro correo.', campo: 'correo' };
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return { mensaje: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' };
    case 'user_banned':
      return { mensaje: 'Esta cuenta está bloqueada. Escríbenos si crees que es un error.' };
    case 'signup_disabled':
    case 'email_provider_disabled':
      return { mensaje: 'El registro de cuentas nuevas está desactivado en este momento.' };
    case 'same_password':
      return { mensaje: 'La nueva contraseña debe ser distinta de la anterior.', campo: 'contrasena' };
    case 'session_expired':
    case 'refresh_token_not_found':
      return { mensaje: 'Tu sesión venció. Inicia sesión de nuevo.' };
    default:
      if (error.status === 429) return { mensaje: 'Demasiados intentos. Espera unos minutos e intenta de nuevo.' };
      return error.status === 0 || !error.status
        ? { mensaje: 'No pudimos conectar. Verifica tu conexión e intenta de nuevo.' }
        : { mensaje: 'No pudimos completar la operación. Intenta de nuevo.' };
  }
}
