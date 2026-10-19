/**
 * Ciclo de vida de la sesión en el dispositivo:
 * - Acciones al cerrar sesión (p. ej. desasociar el token de notificaciones).
 * - Aviso de sesión vencida cuando el backend responde 401.
 *
 * Supabase guarda la sesión y la renueva sola: la app no vuelve a pedir credenciales.
 */

/** Ajuste local del antiguo modo demostración ("pedir inicio de sesión al abrir la app"). */
const CLAVE_OBSOLETA_PEDIR_LOGIN = 'misanandres.pedirLoginAlAbrir';

/** Borra los ajustes locales que la app ya no usa. localStorage puede fallar: nunca rompe la app. */
export function limpiarAjustesObsoletos(): void {
  try {
    globalThis.localStorage?.removeItem(CLAVE_OBSOLETA_PEDIR_LOGIN);
  } catch {
    // Sin almacenamiento disponible no hay nada que borrar.
  }
}

type Accion = () => unknown;
const accionesAlCerrar = new Set<Accion>();

/** Registra algo que debe hacerse antes de cerrar sesión (devuelve la función para quitarlo). */
export function registrarAlCerrarSesion(accion: Accion): () => void {
  accionesAlCerrar.add(accion);
  return () => accionesAlCerrar.delete(accion);
}

const TIEMPO_MAXIMO_MS = 4000;

/** Ejecuta las acciones registradas sin que un fallo o una red lenta impida cerrar sesión. */
export async function ejecutarAlCerrarSesion(): Promise<void> {
  await Promise.all(
    [...accionesAlCerrar].map((accion) =>
      Promise.race([
        Promise.resolve()
          .then(accion)
          .catch(() => undefined),
        new Promise((r) => setTimeout(r, TIEMPO_MAXIMO_MS)),
      ]),
    ),
  );
}

let alVencer: (() => void) | null = null;

/** AuthContext se suscribe para volver al login con un mensaje claro. */
export function escucharSesionVencida(manejador: () => void): () => void {
  alVencer = manejador;
  return () => {
    if (alVencer === manejador) alVencer = null;
  };
}

/** Lo llama el cliente HTTP cuando el backend responde 401 a una petición autenticada. */
export function notificarSesionVencida() {
  alVencer?.();
}

export const MENSAJE_SESION_VENCIDA = 'Tu sesión venció. Inicia sesión de nuevo para continuar.';
