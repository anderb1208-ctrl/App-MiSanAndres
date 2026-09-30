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
  return undefined;
}

export function validarNombre(nombre: string): string | undefined {
  if (!nombre.trim()) return 'Ingresa tu nombre.';
  if (nombre.trim().length > 100) return 'Máximo 100 caracteres.';
  return undefined;
}

/** Primer nombre para el saludo ("Hola, Ana"). */
export const primerNombre = (nombre: string | null | undefined) => nombre?.trim().split(/\s+/)[0] ?? '';
