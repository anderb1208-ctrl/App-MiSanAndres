export type CodigoError =
  | 'SOLICITUD_INVALIDA'
  | 'NO_AUTENTICADO'
  | 'NO_ENCONTRADO'
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

export const noEncontrado = (mensaje: string) => new ErrorApi(404, 'NO_ENCONTRADO', mensaje);

/** Error inesperado al hablar con la base de datos. */
export class ErrorBaseDatos extends Error {
  constructor(operacion: string, causa: { message: string; code?: string }) {
    super(`${operacion}: ${causa.message}${causa.code ? ` (${causa.code})` : ''}`);
    this.name = 'ErrorBaseDatos';
  }
}
