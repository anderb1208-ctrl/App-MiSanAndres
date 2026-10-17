import { AuthError, type Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Traduce los errores de Supabase Auth a mensajes para el usuario. */
function mensajeAuth(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.';
    case 'email_not_confirmed':
      return 'Confirma tu correo con el enlace que te enviamos antes de iniciar sesión.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Ya existe una cuenta con este correo.';
    case 'weak_password':
      return 'La contraseña es muy débil. Usa al menos 8 caracteres.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    case 'email_address_invalid':
      return 'El correo no es válido.';
    case 'user_banned':
      return 'Esta cuenta está bloqueada. Escríbenos si crees que es un error.';
    case 'signup_disabled':
      return 'El registro de cuentas nuevas está desactivado en este momento.';
    case 'same_password':
      return 'La nueva contraseña debe ser distinta de la anterior.';
    case 'session_expired':
    case 'refresh_token_not_found':
      return 'Tu sesión venció. Inicia sesión de nuevo.';
    default:
      return error.status === 0 || !error.status
        ? 'No pudimos conectar. Verifica tu conexión e intenta de nuevo.'
        : 'No pudimos completar la operación. Intenta de nuevo.';
  }
}

export class ErrorAuth extends Error {}

export async function iniciarSesion(correo: string, contrasena: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: contrasena });
  if (error) throw new ErrorAuth(mensajeAuth(error));
}

/**
 * Registra al usuario con su nombre (lo guarda el trigger en public.usuario).
 * Devuelve `requiereConfirmacion` si Supabase exige confirmar el correo antes de entrar.
 */
export async function registrarse(
  nombre: string,
  correo: string,
  contrasena: string,
): Promise<{ requiereConfirmacion: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: correo.trim().toLowerCase(),
    password: contrasena,
    options: { data: { nombre } },
  });
  if (error) throw new ErrorAuth(mensajeAuth(error));
  // Con confirmación activa y correo ya registrado, Supabase responde sin error pero sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    throw new ErrorAuth('Ya existe una cuenta con este correo.');
  }
  return { requiereConfirmacion: !data.session };
}

/**
 * Cierra la sesión en ESTE dispositivo (borra la sesión guardada). Las sesiones en otros
 * dispositivos siguen activas.
 */
export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  // Si falla la red, la sesión local igual se borra; no hay nada más que hacer.
  if (error && error.status !== 0) console.warn('[auth] cerrar sesión:', error.message);
}

/** Envía el correo para restablecer la contraseña. */
export async function recuperarContrasena(correo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase());
  if (error) throw new ErrorAuth(mensajeAuth(error));
}

export async function obtenerSesion(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function escucharSesion(callback: (sesion: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion));
  return () => data.subscription.unsubscribe();
}
