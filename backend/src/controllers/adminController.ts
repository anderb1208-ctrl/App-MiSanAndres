import type { Request, Response } from 'express';
import type {
  CuerpoEditarDestino,
  CuerpoEstadoDestino,
  CuerpoNuevoDestino,
  CuerpoRol,
  ParamsId,
  ParamsIdUsuario,
} from '../middleware/esquemas';
import * as adminService from '../services/adminService';

export async function usuarios(_req: Request, res: Response) {
  res.json(await adminService.listarUsuarios(res.locals.db));
}

export async function cambiarRol(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsIdUsuario;
  const { rol } = res.locals.validado.body as CuerpoRol;
  res.json(await adminService.cambiarRol(res.locals.db, res.locals.usuario, id, rol));
}

export async function metricas(_req: Request, res: Response) {
  res.json(await adminService.metricas(res.locals.db));
}

export async function destinos(_req: Request, res: Response) {
  res.json(await adminService.listarDestinos(res.locals.db));
}

export async function crearDestino(_req: Request, res: Response) {
  const cuerpo = res.locals.validado.body as CuerpoNuevoDestino;
  res.status(201).json(await adminService.crearDestino(res.locals.db, cuerpo));
}

export async function editarDestino(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  const cuerpo = res.locals.validado.body as CuerpoEditarDestino;
  res.json(await adminService.editarDestino(res.locals.db, id, cuerpo));
}

export async function estadoDestino(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  const cuerpo = res.locals.validado.body as CuerpoEstadoDestino;
  res.json(await adminService.cambiarEstadoDestino(res.locals.db, id, cuerpo));
}
