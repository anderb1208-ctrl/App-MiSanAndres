import type { Request, Response } from 'express';
import type { CuerpoPreferencias } from '../middleware/esquemas';
import * as preferenciaService from '../services/preferenciaService';

export async function catalogo(_req: Request, res: Response) {
  res.json(await preferenciaService.obtenerCatalogo(res.locals.db));
}

export async function obtener(_req: Request, res: Response) {
  res.json(await preferenciaService.obtener(res.locals.db, res.locals.usuario.id));
}

export async function reemplazar(_req: Request, res: Response) {
  const cuerpo = res.locals.validado.body as CuerpoPreferencias;
  res.json(await preferenciaService.reemplazar(res.locals.db, res.locals.usuario.id, cuerpo));
}

export async function restablecer(_req: Request, res: Response) {
  await preferenciaService.restablecer(res.locals.db, res.locals.usuario.id);
  res.status(204).end();
}
