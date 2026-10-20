import { z } from 'zod';
import { Constants } from '../models/database.types';
import { FILTROS_HISTORIAL } from '../services/historialService';

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
  q: z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .min(1, 'No puede estar vacío.')
    .max(100, 'Máximo 100 caracteres.')
    .optional(),
  categoria: categoria.optional(),
  nivelOcupacion: nivelOcupacion.optional(),
});
export type ConsultaDestinos = z.infer<typeof consultaDestinos>;

export const consultaFecha = z.object({ fecha });
export type ConsultaFecha = z.infer<typeof consultaFecha>;

export const consultaPrediccion = z.object({ fecha, hora });
export type ConsultaPrediccion = z.infer<typeof consultaPrediccion>;

// ---- Clima ----
const MENSAJE_HORAS = 'Debe ser un número entero entre 1 y 48.';
export const consultaClima = z.object({
  horas: z.coerce
    .number({ error: MENSAJE_HORAS })
    .int(MENSAJE_HORAS)
    .min(1, MENSAJE_HORAS)
    .max(48, MENSAJE_HORAS)
    .default(12),
});
export type ConsultaClima = z.infer<typeof consultaClima>;

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

const MENSAJE_COP = 'Debe ser un valor en pesos entre 0 y 5.000.000.';
const pesos = z.number({ error: MENSAJE_COP }).int(MENSAJE_COP).min(0, MENSAJE_COP).max(5_000_000, MENSAJE_COP);
const presupuestoCoherente = (c: { presupuestoMin?: number | null; presupuestoMax?: number | null }) =>
  (c.presupuestoMin == null) === (c.presupuestoMax == null) &&
  (c.presupuestoMin == null || c.presupuestoMax == null || c.presupuestoMin <= c.presupuestoMax);
const MENSAJE_PRESUPUESTO = 'Envía presupuestoMin y presupuestoMax juntos, con el mínimo menor o igual al máximo.';

export const cuerpoPreferencias = z
  .strictObject({
    categorias: listaCodigos.refine((c) => c.length > 0, 'Selecciona al menos una categoría.'),
    tiposExperiencia: listaCodigos.default([]),
    tiposGrupo: listaCodigos.default([]),
    nivelOcupacion: nivelOcupacion.nullable().default(null),
    /** Presupuesto por persona por visita, COP (opcional). */
    presupuestoMin: pesos.nullable().default(null),
    presupuestoMax: pesos.nullable().default(null),
  })
  .refine(presupuestoCoherente, { message: MENSAJE_PRESUPUESTO, path: ['presupuestoMax'] });
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

// ---- Historial (filtros en chips de la app) ----
const MENSAJE_PAGINA = 'Debe ser un número entero mayor o igual a 1.';
const MENSAJE_TAMANO = 'Debe ser un número entero entre 1 y 50.';
export const consultaHistorial = z.object({
  filtro: z
    .enum(FILTROS_HISTORIAL, { error: `Debe ser uno de: ${FILTROS_HISTORIAL.join(', ')}.` })
    .default('recientes'),
  pagina: z.coerce.number({ error: MENSAJE_PAGINA }).int(MENSAJE_PAGINA).min(1, MENSAJE_PAGINA).max(1000, MENSAJE_PAGINA).default(1),
  tamano: z.coerce.number({ error: MENSAJE_TAMANO }).int(MENSAJE_TAMANO).min(1, MENSAJE_TAMANO).max(50, MENSAJE_TAMANO).default(20),
});
export type ConsultaHistorial = z.infer<typeof consultaHistorial>;

// ---- Roles y usuarios ----
const MENSAJE_UUID = 'Debe ser un identificador (UUID) válido.';
export const uuid = z.uuid({ error: MENSAJE_UUID });

export const rol = z.enum(Enums.rol_usuario, { error: `Debe ser uno de: ${Enums.rol_usuario.join(', ')}.` });

export const paramsIdUsuario = z.object({ id: uuid });
export type ParamsIdUsuario = z.infer<typeof paramsIdUsuario>;

export const cuerpoRol = z.strictObject({ rol });
export type CuerpoRol = z.infer<typeof cuerpoRol>;

// ---- Tickets ----
const prioridadTicket = z.enum(Enums.prioridad_ticket, { error: `Debe ser una de: ${Enums.prioridad_ticket.join(', ')}.` });
const estadoTicket = z.enum(Enums.estado_ticket, { error: `Debe ser uno de: ${Enums.estado_ticket.join(', ')}.` });
const idDestinoCuerpo = z.number({ error: MENSAJE_ID }).int(MENSAJE_ID).positive(MENSAJE_ID).max(2_147_483_647, MENSAJE_ID);

export const cuerpoTicket = z.strictObject({
  categoria: z.enum(Enums.categoria_ticket, { error: `Debe ser una de: ${Enums.categoria_ticket.join(', ')}.` }),
  asunto: z.string({ error: 'Es obligatorio.' }).trim().min(3, 'Mínimo 3 caracteres.').max(120, 'Máximo 120 caracteres.'),
  descripcion: z
    .string({ error: 'Es obligatoria.' })
    .trim()
    .min(5, 'Mínimo 5 caracteres.')
    .max(2000, 'Máximo 2000 caracteres.'),
  prioridad: prioridadTicket.default('media'),
  idDestino: idDestinoCuerpo.nullable().default(null),
});
export type CuerpoTicket = z.infer<typeof cuerpoTicket>;

export const consultaTickets = z.object({
  estado: estadoTicket.optional(),
  prioridad: prioridadTicket.optional(),
  /** Técnico/administrador: solo los asignados a mí. */
  asignadosAMi: z
    .enum(['true', 'false'], { error: 'Debe ser true o false.' })
    .transform((v) => v === 'true')
    .optional(),
  limite: z.coerce.number({ error: MENSAJE_LIMITE }).int(MENSAJE_LIMITE).min(1, MENSAJE_LIMITE).max(100, MENSAJE_LIMITE).default(50),
});
export type ConsultaTickets = z.infer<typeof consultaTickets>;

export const cuerpoActualizarTicket = z
  .strictObject({
    estado: estadoTicket.optional(),
    prioridad: prioridadTicket.optional(),
    idTecnico: uuid.nullable().optional(),
  })
  .refine((c) => c.estado !== undefined || c.prioridad !== undefined || c.idTecnico !== undefined, {
    message: 'Indica al menos estado, prioridad o idTecnico.',
  });
export type CuerpoActualizarTicket = z.infer<typeof cuerpoActualizarTicket>;

export const cuerpoComentario = z.strictObject({
  comentario: z.string({ error: 'Es obligatorio.' }).trim().min(1, 'No puede estar vacío.').max(2000, 'Máximo 2000 caracteres.'),
});
export type CuerpoComentario = z.infer<typeof cuerpoComentario>;

// ---- Administración de destinos ----
const textoOpcional = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`).nullable();
const horaOpcional = hora.nullable();

const camposDestino = {
  nombre: z.string({ error: 'Es obligatorio.' }).trim().min(2, 'Mínimo 2 caracteres.').max(150, 'Máximo 150 caracteres.'),
  descripcion: textoOpcional(2000),
  categoria,
  latitud: z.number({ error: 'Debe ser un número.' }).min(-90).max(90),
  longitud: z.number({ error: 'Debe ser un número.' }).min(-180).max(180),
  ubicacion: z.string({ error: 'Es obligatoria.' }).trim().min(2, 'Mínimo 2 caracteres.').max(255, 'Máximo 255 caracteres.'),
  capacidad: z.number({ error: 'Debe ser un número.' }).int('Debe ser entero.').positive('Debe ser mayor que 0.'),
  horarioApertura: horaOpcional,
  horarioCierre: horaOpcional,
  rangoPrecio: z.enum(Enums.rango_precio).nullable(),
  comoLlegar: textoOpcional(1000),
};

const horarioCoherente = (d: { horarioApertura?: string | null; horarioCierre?: string | null }) =>
  (d.horarioApertura == null) === (d.horarioCierre == null) &&
  (d.horarioApertura == null || d.horarioCierre == null || d.horarioApertura < d.horarioCierre);
const MENSAJE_HORARIO = 'El horario va completo (apertura y cierre) y la apertura debe ser anterior al cierre.';

export const cuerpoNuevoDestino = z
  .strictObject({
    ...camposDestino,
    descripcion: camposDestino.descripcion.default(null),
    horarioApertura: horaOpcional.default(null),
    horarioCierre: horaOpcional.default(null),
    rangoPrecio: camposDestino.rangoPrecio.default(null),
    comoLlegar: camposDestino.comoLlegar.default(null),
  })
  .refine(horarioCoherente, { message: MENSAJE_HORARIO, path: ['horarioCierre'] });
export type CuerpoNuevoDestino = z.infer<typeof cuerpoNuevoDestino>;

export const cuerpoEditarDestino = z
  .strictObject(Object.fromEntries(Object.entries(camposDestino).map(([k, v]) => [k, v.optional()])) as {
    [K in keyof typeof camposDestino]: z.ZodOptional<(typeof camposDestino)[K]>;
  })
  .refine((c) => Object.keys(c).length > 0, { message: 'Indica al menos un campo para editar.' })
  .refine((c) => c.horarioApertura === undefined && c.horarioCierre === undefined ? true : c.horarioApertura !== undefined && c.horarioCierre !== undefined && horarioCoherente(c), {
    message: `${MENSAJE_HORARIO} Envía ambos campos.`,
    path: ['horarioCierre'],
  });
export type CuerpoEditarDestino = z.infer<typeof cuerpoEditarDestino>;

export const cuerpoEstadoDestino = z
  .strictObject({
    estado: z.enum(Enums.estado_destino, { error: `Debe ser uno de: ${Enums.estado_destino.join(', ')}.` }),
    /** Solo para cerrado_temporal: se muestra en el aviso y en el detalle. */
    motivo: z.string().trim().min(3, 'Mínimo 3 caracteres.').max(200, 'Máximo 200 caracteres.').optional(),
    /** Fin previsto del cierre (ISO 8601); al pasar, el destino se considera abierto. */
    hasta: z.iso.datetime({ offset: true, error: 'Debe ser una fecha y hora ISO 8601 (p. ej. 2026-10-20T08:00:00-05:00).' }).optional(),
  })
  .refine((c) => c.estado === 'cerrado_temporal' || (c.motivo === undefined && c.hasta === undefined), {
    message: 'motivo y hasta solo aplican al cierre temporal.',
    path: ['estado'],
  })
  .refine((c) => c.hasta === undefined || new Date(c.hasta).getTime() > Date.now(), {
    message: 'La fecha de fin del cierre debe ser futura.',
    path: ['hasta'],
  });

// ---- Favoritos y dispositivos ----
export const paramsIdDestino = z.object({ idDestino: idPositivo });
export type ParamsIdDestino = z.infer<typeof paramsIdDestino>;

export const cuerpoFavorito = z.strictObject({
  idDestino: idDestinoCuerpo,
  avisarApertura: z.boolean({ error: 'Debe ser verdadero o falso.' }).default(true),
  avisarCierre: z.boolean({ error: 'Debe ser verdadero o falso.' }).default(true),
});
export type CuerpoFavorito = z.infer<typeof cuerpoFavorito>;

export const cuerpoAvisosFavorito = z
  .strictObject({
    avisarApertura: z.boolean({ error: 'Debe ser verdadero o falso.' }).optional(),
    avisarCierre: z.boolean({ error: 'Debe ser verdadero o falso.' }).optional(),
  })
  .refine((c) => c.avisarApertura !== undefined || c.avisarCierre !== undefined, { message: 'Indica avisarApertura o avisarCierre.' });
export type CuerpoAvisosFavorito = z.infer<typeof cuerpoAvisosFavorito>;

const tokenExpo = z
  .string({ error: 'Es obligatorio.' })
  .trim()
  .regex(/^Expo(nent)?PushToken\[.+\]$/,'Debe ser un token de Expo (ExponentPushToken[...]).')
  .max(200);

export const cuerpoDispositivo = z.strictObject({
  token: tokenExpo,
  plataforma: z.enum(Enums.plataforma_dispositivo, { error: 'Debe ser ios, android o web.' }),
});
export type CuerpoDispositivo = z.infer<typeof cuerpoDispositivo>;

export const cuerpoQuitarDispositivo = z.strictObject({ token: tokenExpo });
export type CuerpoQuitarDispositivo = z.infer<typeof cuerpoQuitarDispositivo>;
export type CuerpoEstadoDestino = z.infer<typeof cuerpoEstadoDestino>;

// ---- Recomendaciones ----
const pesosConsulta = z.coerce.number({ error: MENSAJE_COP }).int(MENSAJE_COP).min(0, MENSAJE_COP).max(5_000_000, MENSAJE_COP);

/** Hora planeada (fecha y hora) y filtro rápido de presupuesto, todos opcionales. */
export const consultaRecomendaciones = z
  .object({
    fecha: fecha.optional(),
    hora: hora.optional(),
    presupuestoMin: pesosConsulta.optional(),
    presupuestoMax: pesosConsulta.optional(),
  })
  .refine((c) => (c.presupuestoMin === undefined) === (c.presupuestoMax === undefined) && (c.presupuestoMin === undefined || c.presupuestoMin <= c.presupuestoMax!), {
    message: MENSAJE_PRESUPUESTO,
    path: ['presupuestoMax'],
  });
export type ConsultaRecomendaciones = z.infer<typeof consultaRecomendaciones>;

// ---- Reseñas ----
export const cuerpoResena = z.strictObject({
  estrellas: z.number({ error: 'Debe ser un número del 1 al 5.' }).int('Debe ser un número entero.').min(1, 'Mínimo 1 estrella.').max(5, 'Máximo 5 estrellas.'),
  comentario: z.string().trim().max(1000, 'Máximo 1000 caracteres.').nullable().default(null).transform((c) => (c ? c : null)),
});
export type CuerpoResena = z.infer<typeof cuerpoResena>;

export const cuerpoOcultarResena = z.strictObject({ oculta: z.boolean({ error: 'Debe ser verdadero o falso.' }) });
export type CuerpoOcultarResena = z.infer<typeof cuerpoOcultarResena>;

export const consultaResenasAdmin = z.object({ idDestino: idPositivo.optional() });
export type ConsultaResenasAdmin = z.infer<typeof consultaResenasAdmin>;

/** Comparar una predicción con los tres modelos de ML (panel del administrador). */
export const cuerpoCompararModelos = z.strictObject({
  idDestino: z.number({ error: 'Debe ser un número entero positivo.' }).int(MENSAJE_ID).positive(MENSAJE_ID),
  fecha,
  hora,
});
export type CuerpoCompararModelos = z.infer<typeof cuerpoCompararModelos>;
