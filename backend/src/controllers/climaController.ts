import type { Request, Response } from 'express';
import type { ConsultaClima, ParamsId } from '../middleware/esquemas';
import * as climaService from '../services/clima/climaService';
import * as destinoService from '../services/destinoService';

export async function delDestino(_req: Request, res: Response) {
  const { id } = res.locals.validado.params as ParamsId;
  const { horas } = res.locals.validado.query as ConsultaClima;
  res.json(await destinoService.climaDelDestino(res.locals.db, id, horas));
}

export async function deLaIsla(_req: Request, res: Response) {
  const { horas } = res.locals.validado.query as ConsultaClima;
  res.json(await climaService.pronosticoIsla(horas));
}
