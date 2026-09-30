import type { Request, Response } from 'express';
import type { ConsultaDestinos, ParamsId } from '../middleware/esquemas';
import * as destinoService from '../services/destinoService';

export async function listar(_req: Request, res: Response) {
  const filtros = res.locals.validado.query as ConsultaDestinos;
  res.json(await destinoService.listar(res.locals.db, filtros));
}

export async function obtener(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  res.json(await destinoService.obtenerDetalle(res.locals.db, id));
}
