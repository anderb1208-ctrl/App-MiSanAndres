import type { Request, Response } from 'express';
import type {
  ConsultaTickets,
  CuerpoActualizarTicket,
  CuerpoComentario,
  CuerpoTicket,
  ParamsId,
} from '../middleware/esquemas';
import * as ticketService from '../services/ticketService';

export async function crear(_req: Request, res: Response) {
  const cuerpo = res.locals.validado.body as CuerpoTicket;
  res.status(201).json(await ticketService.crear(res.locals.db, res.locals.usuario, cuerpo));
}

export async function listar(_req: Request, res: Response) {
  const consulta = res.locals.validado.query as ConsultaTickets;
  res.json(await ticketService.listar(res.locals.db, res.locals.usuario, res.locals.rol!, consulta));
}

export async function obtener(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  res.json(await ticketService.obtenerDetalle(res.locals.db, res.locals.usuario, id));
}

export async function actualizar(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  const cuerpo = res.locals.validado.body as CuerpoActualizarTicket;
  res.json(await ticketService.actualizar(res.locals.db, res.locals.usuario, id, cuerpo));
}

export async function comentar(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  const cuerpo = res.locals.validado.body as CuerpoComentario;
  res.status(201).json(await ticketService.comentar(res.locals.db, res.locals.usuario, id, cuerpo));
}
