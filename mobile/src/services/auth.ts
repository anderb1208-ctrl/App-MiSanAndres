import type { AuthError, Session } from '@supabase/supabase-js';
import { traducirErrorAuth, type CampoAuth } from './erroresAuth';
import { supabase } from './supabase';

/** Error de autenticación ya traducido; `campo` indica a qué campo del formulario se refiere. */
export class ErrorAuth extends Error {
  constructor(
    mensaje: string,
    readonly campo?: CampoAuth,
  ) {
    super(mensaje);
    this.name = 'ErrorAuth';
  }
}

const errorAuth = (error: AuthError) => {
  const { mensaje, campo } = traducirErrorAuth(error);
  return new ErrorAuth(mensaje, campo);
};


export async function iniciarSesion(correo: string, contrasena: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: correo.trim().toLowerCase(), password: contrasena });
  if (error) throw errorAuth(error);
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
  if (error) throw errorAuth(error);
  // Con confirmación activa y correo ya registrado, Supabase responde sin error pero sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    throw new ErrorAuth('Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.', 'correo');
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
  if (error) throw errorAuth(error);
}

export async function obtenerSesion(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function escucharSesion(callback: (sesion: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion));
  return () => data.subscription.unsubscribe();
}
