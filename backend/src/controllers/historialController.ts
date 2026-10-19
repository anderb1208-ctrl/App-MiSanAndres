import type { Request, Response } from 'express';
import type { ConsultaHistorial } from '../middleware/esquemas';
import * as historialService from '../services/historialService';
import * as pasaporteService from '../services/pasaporteService';

export async function listar(_req: Request, res: Response) {
  const consulta = res.locals.validado.query as ConsultaHistorial;
  res.json(await historialService.historial(res.locals.db, res.locals.usuario.id, consulta));
}

export async function borrar(_req: Request, res: Response) {
  res.json(await historialService.borrar(res.locals.db, res.locals.usuario.id));
}

export async function pasaporte(_req: Request, res: Response) {
  res.json(await pasaporteService.obtener(res.locals.db, res.locals.usuario.id));
}
