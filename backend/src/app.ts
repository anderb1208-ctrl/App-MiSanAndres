import { resolve } from 'node:path';
import cors from 'cors';
import express from 'express';
import { origenesCors } from './config/env';
import { manejarErrores, rutaNoEncontrada } from './middleware/errores';
import { rutasV1 } from './routes';

/** backend/public/destinos (igual desde src/ en desarrollo que desde dist/ en producción). */
export const DIRECTORIO_FOTOS = resolve(__dirname, '../public/destinos');

export function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: origenesCors.length > 0 ? origenesCors : true }));
  app.use(express.json({ limit: '100kb' }));

  // Fotos de los destinos (imagen_url guarda "/destinos/<slug>.jpg"). Caché de un día:
  // para reemplazar una foto basta con sustituir el archivo con el mismo nombre.
  app.use(
    '/destinos',
    express.static(DIRECTORIO_FOTOS, { maxAge: '1d', index: false, fallthrough: true, extensions: false }),
  );

  app.use('/v1', rutasV1);

  app.use(rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
