import { z } from 'zod';
import { Constants } from '../models/database.types';

const Enums = Constants.public.Enums;

const MENSAJE_FECHA = 'Debe tener el formato YYYY-MM-DD y ser una fecha válida.';
const MENSAJE_HORA = 'Debe tener el formato HH:MM (00:00 a 23:59).';
const MENSAJE_ID = 'Debe ser un número entero positivo.';

/** Entero positivo recibido como texto en la URL. */
export const idPositivo = z
  .string()
  .regex(/^\d+$/, MENSAJE_ID)
  .transform(Number)
  .refine((n) => Number.isSafeInteger(n) && n > 0 && n <= 2_147_483_647, MENSAJE_ID);

export const fecha = z
  .string({ error: 'Es obligatoria.' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, MENSAJE_FECHA)
  .refine((valor) => {
    const d = new Date(`${valor}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(valor);
  }, MENSAJE_FECHA);

export const hora = z
  .string({ error: 'Es obligatoria.' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, MENSAJE_HORA);

export const nivelOcupacion = z.enum(Enums.nivel_ocupacion, {
  error: 'Debe ser Bajo, Medio o Alto.',
});

export const categoria = z.enum(Enums.categoria_destino, {
  error: `Debe ser una categoría válida: ${Enums.categoria_destino.join(', ')}.`,
});

// ---- Destinos y ocupación ----
export const paramsId = z.object({ id: idPositivo });
export type ParamsId = z.infer<typeof paramsId>;

export const paramsDestinoId = z.object({ destinoId: idPositivo });
export type ParamsDestinoId = z.infer<typeof paramsDestinoId>;

export const consultaDestinos = z.object({
  categoria: categoria.optional(),
  nivelOcupacion: nivelOcupacion.optional(),
});
export type ConsultaDestinos = z.infer<typeof consultaDestinos>;

export const consultaFecha = z.object({ fecha });
export type ConsultaFecha = z.infer<typeof consultaFecha>;

export const consultaPrediccion = z.object({ fecha, hora });
export type ConsultaPrediccion = z.infer<typeof consultaPrediccion>;

// ---- Perfil ----
export const cuerpoPerfil = z.strictObject({
  nombre: z
    .string({ error: 'Es obligatorio.' })
    .trim()
    .min(1, 'No puede estar vacío.')
    .max(100, 'Máximo 100 caracteres.'),
});
export type CuerpoPerfil = z.infer<typeof cuerpoPerfil>;

// ---- Preferencias ----
const listaCodigos = z
  .array(z.string().trim().min(1, 'No puede estar vacío.'), { error: 'Debe ser una lista de códigos.' })
  .max(20, 'Máximo 20 elementos.')
  .transform((codigos) => [...new Set(codigos)]);

export const cuerpoPreferencias = z.strictObject({
  categorias: listaCodigos.refine((c) => c.length > 0, 'Selecciona al menos una categoría.'),
  tiposExperiencia: listaCodigos.default([]),
  tiposGrupo: listaCodigos.default([]),
  nivelOcupacion: nivelOcupacion.nullable().default(null),
});
export type CuerpoPreferencias = z.infer<typeof cuerpoPreferencias>;

// ---- Interacciones ----
export const cuerpoInteraccion = z.strictObject({
  idDestino: z
    .number({ error: MENSAJE_ID })
    .int(MENSAJE_ID)
    .positive(MENSAJE_ID)
    .max(2_147_483_647, MENSAJE_ID),
  tipo: z.enum(Enums.tipo_interaccion, {
    error: `Debe ser uno de: ${Enums.tipo_interaccion.join(', ')}.`,
  }),
});
export type CuerpoInteraccion = z.infer<typeof cuerpoInteraccion>;

const MENSAJE_LIMITE = 'Debe ser un número entero entre 1 y 100.';
export const consultaInteracciones = z.object({
  limite: z.coerce
    .number({ error: MENSAJE_LIMITE })
    .int(MENSAJE_LIMITE)
    .min(1, MENSAJE_LIMITE)
    .max(100, MENSAJE_LIMITE)
    .default(50),
});
export type ConsultaInteracciones = z.infer<typeof consultaInteracciones>;
