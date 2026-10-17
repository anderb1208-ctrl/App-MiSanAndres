import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ErrorApi, ErrorBaseDatos, errorApiDesdeBd, noEncontrado } from '../utils/errores';

export const rutaNoEncontrada: RequestHandler = (req) => {
  throw noEncontrado(`La ruta ${req.method} ${req.path} no existe.`);
};

/** Manejo de errores centralizado: siempre responde { error: { codigo, mensaje, detalles? } }. */
export const manejarErrores: ErrorRequestHandler = (errOriginal, _req, res, _next) => {
  // Errores de la base causados por la petición (permiso, regla de negocio, no existe).
  const err: unknown = errOriginal instanceof ErrorBaseDatos ? (errorApiDesdeBd(errOriginal) ?? errOriginal) : errOriginal;
  if (err instanceof ErrorApi) {
    res.status(err.status).json({
      error: {
        codigo: err.codigo,
        mensaje: err.message,
        ...(err.detalles && { detalles: err.detalles }),
      },
    });
    return;
  }

  // JSON mal formado o cuerpo inválido (errores 4xx lanzados por express.json).
  const status: unknown = (err as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(400).json({
      error: { codigo: 'SOLICITUD_INVALIDA', mensaje: 'El cuerpo de la petición no es un JSON válido.' },
    });
    return;
  }

  if (process.env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({
    error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.' },
  });
};
