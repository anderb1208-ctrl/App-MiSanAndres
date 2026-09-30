import type { Request, Response } from 'express';
import type { ConsultaFecha, ConsultaPrediccion, ParamsDestinoId } from '../middleware/esquemas';
import * as ocupacionService from '../services/ocupacionService';

export async function registrosDelDia(_req: Request, res: Response) {
  const { destinoId } = res.locals.validado.params as ParamsDestinoId;
  const { fecha } = res.locals.validado.query as ConsultaFecha;
  res.json(await ocupacionService.registrosDelDia(res.locals.db, destinoId, fecha));
}

export async function prediccion(_req: Request, res: Response) {
  const { destinoId } = res.locals.validado.params as ParamsDestinoId;
  const { fecha, hora } = res.locals.validado.query as ConsultaPrediccion;
  res.json(await ocupacionService.prediccion(res.locals.db, destinoId, fecha, hora));
}

export async function prediccionDelDia(_req: Request, res: Response) {
  const { destinoId } = res.locals.validado.params as ParamsDestinoId;
  const { fecha } = res.locals.validado.query as ConsultaFecha;
  res.json(await ocupacionService.prediccionDelDia(res.locals.db, destinoId, fecha));
}
