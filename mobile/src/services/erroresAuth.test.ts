import { AuthApiError, AuthRetryableFetchError, AuthWeakPasswordError } from '@supabase/supabase-js';
import { traducirErrorAuth } from './erroresAuth';

const api = (code: string, status = 400) => new AuthApiError('mensaje en inglés', status, code);

describe('traducción de errores de Supabase Auth', () => {
  it('weak_password muestra el motivo real, no "combina letras y números"', () => {
    const caracteres = traducirErrorAuth(new AuthWeakPasswordError('Password is weak', 422, ['characters']));
    expect(caracteres.campo).toBe('contrasena');
    expect(caracteres.mensaje).toMatch(/otros tipos de caracteres/);
    expect(caracteres.mensaje).not.toMatch(/Combina/i);

    expect(traducirErrorAuth(new AuthWeakPasswordError('weak', 422, ['length'])).mensaje).toMatch(/más larga \(mínimo 8/);
    expect(traducirErrorAuth(new AuthWeakPasswordError('weak', 422, ['pwned'])).mensaje).toMatch(/filtraciones/);
    // Varios motivos a la vez.
    expect(traducirErrorAuth(new AuthWeakPasswordError('weak', 422, ['length', 'pwned'])).mensaje).toMatch(/más larga.*filtraciones/);
    // Sin motivos (código weak_password genérico).
    expect(traducirErrorAuth(api('weak_password', 422)).mensaje).toBe('El servidor rechazó la contraseña por ser débil. Prueba con otra.');
  });

  it('los demás errores conservan su propio mensaje', () => {
    expect(traducirErrorAuth(api('user_already_exists', 422))).toEqual({
      mensaje: 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.',
      campo: 'correo',
    });
    expect(traducirErrorAuth(api('over_email_send_rate_limit', 429)).mensaje).toMatch(/Demasiados intentos/);
    expect(traducirErrorAuth(api('desconocido', 429)).mensaje).toMatch(/Demasiados intentos/);
    expect(traducirErrorAuth(api('invalid_credentials')).mensaje).toBe('Correo o contraseña incorrectos.');
    expect(traducirErrorAuth(new AuthRetryableFetchError('Failed to fetch', 0)).mensaje).toMatch(/No pudimos conectar/);
    expect(traducirErrorAuth(api('otro', 500)).mensaje).toBe('No pudimos completar la operación. Intenta de nuevo.');
  });
});
