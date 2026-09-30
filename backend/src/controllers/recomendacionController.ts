import type { Request, Response } from 'express';
import * as recomendacionService from '../services/recomendacionService';

export async function listar(_req: Request, res: Response) {
  res.json(await recomendacionService.recomendar(res.locals.db, res.locals.usuario.id));
}
