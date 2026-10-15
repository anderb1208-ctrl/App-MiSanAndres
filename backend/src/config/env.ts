import { z } from 'zod';

const esquemaEnv = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().optional().default(''),
});

const resultado = esquemaEnv.safeParse(process.env);

if (!resultado.success) {
  const faltantes = resultado.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Variables de entorno inválidas o faltantes: ${faltantes}. Revisa backend/.env.example.`);
}

export const env = resultado.data;

/** Lista de orígenes permitidos por CORS; vacía = cualquiera. */
export const origenesCors = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
