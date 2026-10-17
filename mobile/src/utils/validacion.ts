const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_CONTRASENA = 8;

export function validarCorreo(correo: string): string | undefined {
  if (!correo.trim()) return 'Ingresa tu correo.';
  if (!CORREO.test(correo.trim())) return 'El correo no es válido.';
  return undefined;
}

export function validarContrasena(contrasena: string): string | undefined {
  if (!contrasena) return 'Ingresa tu contraseña.';
  if (contrasena.length < MIN_CONTRASENA) return `Mínimo ${MIN_CONTRASENA} caracteres.`;
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) || !/d/.test(contrasena)) return 'Combina letras y números.';
  return undefined;
}

export type Fortaleza = 'debil' | 'media' | 'fuerte';

/** Fortaleza aproximada para guiar al usuario (no reemplaza la validación). */
export function fortalezaContrasena(contrasena: string): Fortaleza {
  let puntos = 0;
  if (contrasena.length >= MIN_CONTRASENA) puntos++;
  if (contrasena.length >= 12) puntos++;
  if (/[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena)) puntos++;
  if (/d/.test(contrasena)) puntos++;
  if (/[^A-Za-z0-9]/.test(contrasena)) puntos++;
  return puntos >= 4 ? 'fuerte' : puntos >= 2 ? 'media' : 'debil';
}

export function validarNombre(nombre: string): string | undefined {
  if (!nombre.trim()) return 'Ingresa tu nombre.';
  if (nombre.trim().length > 100) return 'Máximo 100 caracteres.';
  return undefined;
}

/** Primer nombre para el saludo ("Hola, Ana"). */
export const primerNombre = (nombre: string | null | undefined) => nombre?.trim().split(/\s+/)[0] ?? '';
