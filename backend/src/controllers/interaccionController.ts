import type { Request, Response } from 'express';
import type { ConsultaInteracciones, CuerpoInteraccion } from '../middleware/esquemas';
import * as interaccionService from '../services/interaccionService';

export async function registrar(_req: Request, res: Response) {
  const cuerpo = res.locals.validado.body as CuerpoInteraccion;
  const interaccion = await interaccionService.registrar(res.locals.db, res.locals.usuario.id, cuerpo);
  res.status(201).json(interaccion);
}

export async function historial(_req: Request, res: Response) {
  const { limite } = res.locals.validado.query as ConsultaInteracciones;
  res.json(await interaccionService.historial(res.locals.db, res.locals.usuario.id, limite));
}
