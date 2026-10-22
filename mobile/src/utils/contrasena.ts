/**
 * Política de contraseña de MiSanAndrés (única regla en toda la app):
 *   - mínimo 8 caracteres;
 *   - al menos un número (0–9).
 * No se exigen mayúsculas, minúsculas ni símbolos; se aceptan espacios y caracteres especiales.
 *
 * Es la misma regla de backend/src/utils/contrasena.ts. En Supabase Auth: longitud mínima 8 y
 * sin requisitos de caracteres (Supabase no tiene "solo números": "letters_digits" exigiría
 * también letras y rechazaría "12345678"); el número lo exigen la app y el backend.
 */
export const MIN_CONTRASENA = 8;

const TIENE_NUMERO = /[0-9]/;

export type ClaveRequisito = 'longitud' | 'numero';

export interface RequisitoContrasena {
  clave: ClaveRequisito;
  texto: string;
  cumple: boolean;
}

/** Los dos requisitos, cada uno con si se cumple (para la lista de la pantalla de registro). */
export function requisitosContrasena(contrasena: string): RequisitoContrasena[] {
  return [
    { clave: 'longitud', texto: `Mínimo ${MIN_CONTRASENA} caracteres`, cumple: contrasena.length >= MIN_CONTRASENA },
    { clave: 'numero', texto: 'Al menos un número', cumple: TIENE_NUMERO.test(contrasena) },
  ];
}

export const cumplePoliticaContrasena = (contrasena: string) => requisitosContrasena(contrasena).every((r) => r.cumple);

/** Mensaje de error del campo, o undefined si la contraseña cumple la política. */
export function validarContrasena(contrasena: string): string | undefined {
  if (!contrasena) return 'Ingresa tu contraseña.';
  if (contrasena.length < MIN_CONTRASENA) return `Debe tener al menos ${MIN_CONTRASENA} caracteres.`;
  if (!TIENE_NUMERO.test(contrasena)) return 'Debe incluir al menos un número.';
  return undefined;
}
