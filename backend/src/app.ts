import cors from 'cors';
import express from 'express';
import { origenesCors } from './config/env';
import { manejarErrores, rutaNoEncontrada } from './middleware/errores';
import { rutasV1 } from './routes';

export function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: origenesCors.length > 0 ? origenesCors : true }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/v1', rutasV1);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
