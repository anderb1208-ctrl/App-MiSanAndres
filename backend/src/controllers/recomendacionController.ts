import type { Request, Response } from 'express';
import type { ConsultaRecomendaciones } from '../middleware/esquemas';
import * as recomendacionService from '../services/recomendacionService';

export async function listar(_req: Request, res: Response) {
  const c = res.locals.validado.query as ConsultaRecomendaciones;
  res.json(
    await recomendacionService.recomendar(res.locals.db, res.locals.usuario.id, {
      fecha: c.fecha,
      hora: c.hora,
      presupuesto:
        c.presupuestoMin !== undefined && c.presupuestoMax !== undefined
          ? { minCop: c.presupuestoMin, maxCop: c.presupuestoMax }
          : undefined,
    }),
  );
}
