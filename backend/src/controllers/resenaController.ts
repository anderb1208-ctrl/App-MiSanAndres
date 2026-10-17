import type { Request, Response } from 'express';
import type { CuerpoOcultarResena, CuerpoResena, ParamsId } from '../middleware/esquemas';
import * as resenaService from '../services/resenaService';

export async function deDestino(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  res.json(await resenaService.deDestino(res.locals.db, id));
}

export async function propia(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  res.json({ resena: await resenaService.obtenerPropia(res.locals.db, res.locals.usuario.id, id) });
}

export async function guardar(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  const cuerpo = res.locals.validado.body as CuerpoResena;
  res.json(await resenaService.guardarPropia(res.locals.db, res.locals.usuario.id, id, cuerpo));
}

export async function borrar(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  await resenaService.borrarPropia(res.locals.db, res.locals.usuario.id, id);
  res.status(204).end();
}

export async function listarAdmin(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  res.json(await resenaService.listarAdmin(res.locals.db, id));
}

export async function ocultar(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  const { oculta } = res.locals.validado.body as CuerpoOcultarResena;
  res.json(await resenaService.ocultar(res.locals.db, id, oculta));
}
