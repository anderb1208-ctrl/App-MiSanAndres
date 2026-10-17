export type CodigoError =
  | 'SOLICITUD_INVALIDA'
  | 'NO_AUTENTICADO'
  | 'PROHIBIDO'
  | 'NO_ENCONTRADO'
  | 'SERVICIO_NO_DISPONIBLE'
  | 'ERROR_INTERNO';

export interface DetalleError {
  campo: string;
  mensaje: string;
}

/** Error de la API con código HTTP. El manejador central lo convierte en JSON. */
export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: CodigoError,
    mensaje: string,
    public readonly detalles?: DetalleError[],
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export const solicitudInvalida = (mensaje: string, detalles?: DetalleError[]) =>
  new ErrorApi(400, 'SOLICITUD_INVALIDA', mensaje, detalles);

export const noAutenticado = (mensaje = 'Se requiere un token de acceso válido.') =>
  new ErrorApi(401, 'NO_AUTENTICADO', mensaje);

/** Autenticado, pero su rol no le permite la acción. */
export const prohibido = (mensaje = 'No tienes permiso para realizar esta acción.') =>
  new ErrorApi(403, 'PROHIBIDO', mensaje);

export const noEncontrado = (mensaje: string) => new ErrorApi(404, 'NO_ENCONTRADO', mensaje);

/** Un servicio externo del que depende la respuesta no está disponible (p. ej. el de ML). */
export const servicioNoDisponible = (mensaje: string) => new ErrorApi(503, 'SERVICIO_NO_DISPONIBLE', mensaje);

/** Error inesperado al hablar con la base de datos. */
export class ErrorBaseDatos extends Error {
  /** Código de Postgres/PostgREST (p. ej. 42501 = sin permiso por RLS o privilegios). */
  readonly codigoBd: string | undefined;
  /** Mensaje original de la base (las funciones propias lo escriben para el usuario). */
  readonly motivo: string;

  constructor(operacion: string, causa: { message: string; code?: string }) {
    super(`${operacion}: ${causa.message}${causa.code ? ` (${causa.code})` : ''}`);
    this.name = 'ErrorBaseDatos';
    this.codigoBd = causa.code;
    this.motivo = causa.message;
  }
}

/**
 * Traduce los errores de la base que son culpa de la petición (no del servidor):
 * - 42501: RLS o privilegios niegan la operación → 403.
 * - P0001: regla de negocio de una función propia (mensaje en español) → 400.
 * - P0002: no existe → 404.
 * - 23514 / 23503 / 22P02 / 23505: restricción, referencia inexistente, valor inválido o duplicado → 400.
 */
export function errorApiDesdeBd(error: ErrorBaseDatos): ErrorApi | null {
  switch (error.codigoBd) {
    case '42501':
      return prohibido();
    case 'P0001':
      return solicitudInvalida(error.motivo);
    case 'P0002':
      return noEncontrado(error.motivo);
    case '23514':
      return solicitudInvalida(error.motivo.startsWith('Solo') ? error.motivo : 'Los datos no cumplen las reglas del sistema.');
    case '23503':
      return solicitudInvalida('Hace referencia a un registro que no existe.');
    case '23505':
      return solicitudInvalida('Ya existe un registro con esos datos.');
    case '22P02':
      return solicitudInvalida('Algún valor no tiene el formato esperado.');
    default:
      return null;
  }
}
