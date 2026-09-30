import type { Request, Response } from 'express';
import type { CuerpoPerfil } from '../middleware/esquemas';
import * as perfilService from '../services/perfilService';

export async function obtener(_req: Request, res: Response) {
  res.json(await perfilService.obtener(res.locals.db, res.locals.usuario));
}

export async function actualizar(_req: Request, res: Response) {
  const cuerpo = res.locals.validado.body as CuerpoPerfil;
  res.json(await perfilService.actualizar(res.locals.db, res.locals.usuario, cuerpo));
}
