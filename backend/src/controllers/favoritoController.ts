import type { Request, Response } from 'express';
import type {
  CuerpoAvisosFavorito,
  CuerpoDispositivo,
  CuerpoFavorito,
  CuerpoQuitarDispositivo,
  ParamsIdDestino,
} from '../middleware/esquemas';
import * as favoritoService from '../services/favoritoService';

export async function listar(_req: Request, res: Response) {
  res.json(await favoritoService.listar(res.locals.db, res.locals.usuario));
}

export async function agregar(_req: Request, res: Response) {
  const cuerpo = res.locals.validado.body as CuerpoFavorito;
  res.status(201).json(await favoritoService.agregar(res.locals.db, res.locals.usuario, cuerpo));
}

export async function actualizarAvisos(_req: Request, res: Response) {
  const { idDestino } = res.locals.validado.params as ParamsIdDestino;
  const cuerpo = res.locals.validado.body as CuerpoAvisosFavorito;
  res.json(await favoritoService.actualizarAvisos(res.locals.db, res.locals.usuario, idDestino, cuerpo));
}

export async function quitar(_req: Request, res: Response) {
  const { idDestino } = res.locals.validado.params as ParamsIdDestino;
  await favoritoService.quitar(res.locals.db, res.locals.usuario, idDestino);
  res.status(204).end();
}

export async function registrarDispositivo(_req: Request, res: Response) {
  const cuerpo = res.locals.validado.body as CuerpoDispositivo;
  await favoritoService.registrarDispositivo(res.locals.db, cuerpo);
  res.status(204).end();
}

export async function quitarDispositivo(_req: Request, res: Response) {
  const { token } = res.locals.validado.body as CuerpoQuitarDispositivo;
  await favoritoService.quitarDispositivo(res.locals.db, token);
  res.status(204).end();
}
