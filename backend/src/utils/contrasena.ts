/**
 * Política de contraseña de MiSanAndrés (la misma de mobile/src/utils/contrasena.ts):
 *   - mínimo 8 caracteres;
 *   - al menos un número (0–9).
 * No se exigen mayúsculas, minúsculas ni símbolos; se aceptan espacios y caracteres especiales.
 *
 * El registro va de la app directo a Supabase Auth (el backend no recibe contraseñas); esta regla
 * la usan los scripts que crean usuarios (crear-usuarios-demo). En Supabase Auth: longitud mínima 8
 * y sin requisitos de caracteres (ver supabase/config.toml).
 */
export const MIN_CONTRASENA = 8;

const TIENE_NUMERO = /[0-9]/;

/** Mensaje de error, o undefined si la contraseña cumple la política. */
export function validarContrasena(contrasena: string): string | undefined {
  if (!contrasena) return 'Ingresa la contraseña.';
  if (contrasena.length < MIN_CONTRASENA) return `Debe tener al menos ${MIN_CONTRASENA} caracteres.`;
  if (!TIENE_NUMERO.test(contrasena)) return 'Debe incluir al menos un número.';
  return undefined;
}
