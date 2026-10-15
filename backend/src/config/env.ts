import { z } from 'zod';

/** Una variable vacía en el .env ("ML_API_KEY=") cuenta como no definida. */
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), esquema.optional());

const esquemaEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SUPABASE_URL: z.url(),
    SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: z.string().optional().default(''),

    // Predicción de ocupación: heuristico (promedio histórico + factores), ml (servicio de
    // ml/) o auto (ML y, si falla o no responde, heurístico).
    PREDICCION_PROVEEDOR: z.enum(['heuristico', 'ml', 'auto']).default('heuristico'),
    ML_SERVICE_URL: opcional(z.url()),
    ML_API_KEY: opcional(z.string().min(1)),
    ML_TIMEOUT_MS: z.coerce.number().int().min(200).max(30_000).default(2500),
    // Origen de la tabla ocupacion que usa el heurístico: hoy es simulada (supabase/seed.sql).
    ORIGEN_DATOS_HISTORICOS: z.enum(['sintetico', 'real']).default('sintetico'),
  })
  .superRefine((v, ctx) => {
    if (v.PREDICCION_PROVEEDOR === 'heuristico') return;
    for (const clave of ['ML_SERVICE_URL', 'ML_API_KEY'] as const) {
      if (!v[clave]) {
        ctx.addIssue({
          code: 'custom',
          path: [clave],
          message: `${clave} es obligatoria con PREDICCION_PROVEEDOR=${v.PREDICCION_PROVEEDOR}`,
        });
      }
    }
  });

const resultado = esquemaEnv.safeParse(process.env);

if (!resultado.success) {
  const faltantes = resultado.error.issues
    .map((i) => (i.code === 'custom' ? i.message : i.path.join('.')))
    .join(', ');
  throw new Error(`Variables de entorno inválidas o faltantes: ${faltantes}. Revisa backend/.env.example.`);
}

export const env = resultado.data;

/** Lista de orígenes permitidos por CORS; vacía = cualquiera. */
export const origenesCors = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
