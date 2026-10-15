import 'dotenv/config';
import { crearApp } from './app';
import { env } from './config/env';

crearApp().listen(env.PORT, () => {
  // Sin "localhost": en Render el servidor no es local. RENDER_EXTERNAL_URL la define Render.
  const publica = process.env.RENDER_EXTERNAL_URL ? ` · URL pública: ${process.env.RENDER_EXTERNAL_URL}/v1` : '';
  console.log(`API de MiSanAndrés iniciada · entorno: ${env.NODE_ENV} · puerto: ${env.PORT}${publica}`);
});
