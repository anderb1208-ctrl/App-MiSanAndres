import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { solicitudInvalida, type DetalleError } from '../utils/errores';

interface Esquemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

/**
 * Valida params, query y body con zod. Si algo falla responde 400 con el detalle
 * por campo; si todo es válido deja los datos convertidos en res.locals.validado.
 */
export function validar(esquemas: Esquemas): RequestHandler {
  return (req, res, next) => {
    const detalles: DetalleError[] = [];
    const validado: Express.Locals['validado'] = { params: {}, query: {}, body: {} };

    for (const parte of ['params', 'query', 'body'] as const) {
      const esquema = esquemas[parte];
      if (!esquema) continue;
      const resultado = esquema.safeParse(req[parte] ?? {});
      if (resultado.success) {
        validado[parte] = resultado.data;
      } else {
        for (const issue of resultado.error.issues) {
          detalles.push({
            campo: [parte, ...issue.path.map(String)].join('.'),
            mensaje: issue.message,
          });
        }
      }
    }

    if (detalles.length > 0) {
      throw solicitudInvalida('Los datos enviados no son válidos.', detalles);
    }
    res.locals.validado = validado;
    next();
  };
}
