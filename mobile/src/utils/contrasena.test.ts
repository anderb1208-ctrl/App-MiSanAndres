import { cumplePoliticaContrasena, requisitosContrasena, validarContrasena } from './contrasena';

describe('política de contraseña: mínimo 8 caracteres y al menos un número', () => {
  it.each(['Julia1N2005C', 'abcdefg1', '12345678', 'clave 1234', 'Clave2024', 'ñandú#2026!', '        1'])('acepta "%s"', (c) => {
    expect(validarContrasena(c)).toBeUndefined();
    expect(cumplePoliticaContrasena(c)).toBe(true);
  });

  it('rechaza la que no tiene número (el error anterior aceptaba cualquier "d" como número)', () => {
    expect(validarContrasena('abcdefgh')).toBe('Debe incluir al menos un número.');
    expect(validarContrasena('dddddddd')).toBe('Debe incluir al menos un número.');
  });

  it('rechaza la de menos de 8 caracteres y la vacía', () => {
    expect(validarContrasena('abc123')).toBe('Debe tener al menos 8 caracteres.');
    expect(validarContrasena('')).toBe('Ingresa tu contraseña.');
    expect(cumplePoliticaContrasena('')).toBe(false);
  });

  it('marca cada requisito por separado', () => {
    expect(requisitosContrasena('abc123').map((r) => r.cumple)).toEqual([false, true]);
    expect(requisitosContrasena('abcdefgh').map((r) => r.cumple)).toEqual([true, false]);
    expect(requisitosContrasena('Julia1N2005C').map((r) => r.texto)).toEqual(['Mínimo 8 caracteres', 'Al menos un número']);
  });
});
