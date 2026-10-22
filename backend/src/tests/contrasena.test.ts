/** Política de contraseña: mínimo 8 caracteres y al menos un número (igual que en la app). */
import { validarContrasena } from '../utils/contrasena';

describe('política de contraseña', () => {
  it.each(['Julia1N2005C', 'abcdefg1', '12345678', 'clave 1234', 'Clave2024', 'ñandú#2026!'])('acepta "%s"', (c) => {
    expect(validarContrasena(c)).toBeUndefined();
  });

  it.each([
    ['abcdefgh', 'Debe incluir al menos un número.'],
    ['dddddddd', 'Debe incluir al menos un número.'],
    ['abc123', 'Debe tener al menos 8 caracteres.'],
    ['', 'Ingresa la contraseña.'],
  ])('rechaza "%s"', (c, mensaje) => {
    expect(validarContrasena(c)).toBe(mensaje);
  });
});
