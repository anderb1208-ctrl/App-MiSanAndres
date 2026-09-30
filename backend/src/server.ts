import 'dotenv/config';
import { crearApp } from './app';
import { env } from './config/env';

crearApp().listen(env.PORT, () => {
  console.log(`API de MiSanAndrés escuchando en http://localhost:${env.PORT}/v1`);
});
