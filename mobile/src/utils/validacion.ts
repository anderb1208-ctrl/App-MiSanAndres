const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCorreo(correo: string): string | undefined {
  if (!correo.trim()) return 'Ingresa tu correo.';
  if (!CORREO.test(correo.trim())) return 'El correo no es válido.';
  return undefined;
}

export function validarNombre(nombre: string): string | undefined {
  if (!nombre.trim()) return 'Ingresa tu nombre.';
  if (nombre.trim().length > 100) return 'Máximo 100 caracteres.';
  return undefined;
}

/** Primer nombre para el saludo ("Hola, Ana"). */
export const primerNombre = (nombre: string | null | undefined) => nombre?.trim().split(/\s+/)[0] ?? '';
