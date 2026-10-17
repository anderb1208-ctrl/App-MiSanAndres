/**
 * Tickets de soporte. Cualquier usuario reporta; el turista solo ve los suyos y técnico
 * y administrador ven todos (lo garantiza RLS; el filtro por usuario de aquí es una
 * segunda barrera). Solo técnico y administrador cambian estado, prioridad y asignación.
 */
import type { Db } from '../config/supabase';
import type { UsuarioAuth } from '../models/authModel';
import type { CategoriaTicket, EstadoTicket, PrioridadTicket, RolUsuario } from '../models/database.types';
import * as ticketModel from '../models/ticketModel';
import type {
  ConsultaTickets,
  CuerpoActualizarTicket,
  CuerpoComentario,
  CuerpoTicket,
} from '../middleware/esquemas';
import { noEncontrado } from '../utils/errores';

export interface Ticket {
  id: number;
  categoria: CategoriaTicket;
  asunto: string;
  descripcion: string;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  destino: { id: number; nombre: string } | null;
  creador: { id: string; nombre: string | null };
  tecnico: { id: string; nombre: string | null } | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaCierre: string | null;
  /** true si lo creó el usuario que consulta. */
  esPropio: boolean;
}

export interface Comentario {
  id: number;
  comentario: string;
  fecha: string;
  /** nombre y rol son null si RLS no deja ver a esa persona (el turista ve "Equipo de soporte"). */
  autor: { id: string; nombre: string | null; rol: RolUsuario | null; esYo: boolean };
}

export interface TicketDetalle extends Ticket {
  comentarios: Comentario[];
}

const NO_ENCONTRADO = (id: number) => `No existe un ticket con id ${id} o no tienes acceso a él.`;

export function aTicket(fila: ticketModel.TicketConRelaciones, idUsuario: string): Ticket {
  return {
    id: fila.id_ticket,
    categoria: fila.categoria,
    asunto: fila.asunto,
    descripcion: fila.descripcion,
    prioridad: fila.prioridad,
    estado: fila.estado,
    destino: fila.destino ? { id: fila.destino.id_destino, nombre: fila.destino.nombre } : null,
    creador: { id: fila.id_usuario, nombre: fila.creador?.nombre ?? null },
    tecnico: fila.id_tecnico ? { id: fila.id_tecnico, nombre: fila.tecnico?.nombre ?? null } : null,
    fechaCreacion: fila.fecha_creacion,
    fechaActualizacion: fila.fecha_actualizacion,
    fechaCierre: fila.fecha_cierre,
    esPropio: fila.id_usuario === idUsuario,
  };
}

const aComentario = (fila: ticketModel.ComentarioConAutor, idUsuario: string): Comentario => ({
  id: fila.id_comentario,
  comentario: fila.comentario,
  fecha: fila.fecha,
  autor: {
    id: fila.id_usuario,
    nombre: fila.autor?.nombre ?? null,
    rol: (fila.autor?.rol as RolUsuario | undefined) ?? null,
    esYo: fila.id_usuario === idUsuario,
  },
});

export async function crear(db: Db, usuario: UsuarioAuth, cuerpo: CuerpoTicket): Promise<Ticket> {
  const fila = await ticketModel.crear(db, {
    id_usuario: usuario.id,
    categoria: cuerpo.categoria,
    asunto: cuerpo.asunto,
    descripcion: cuerpo.descripcion,
    prioridad: cuerpo.prioridad,
    id_destino: cuerpo.idDestino,
  });
  return aTicket(fila, usuario.id);
}

export async function listar(db: Db, usuario: UsuarioAuth, rol: RolUsuario, consulta: ConsultaTickets): Promise<Ticket[]> {
  const esPersonal = rol === 'tecnico' || rol === 'administrador';
  const filas = await ticketModel.listar(db, {
    estado: consulta.estado,
    prioridad: consulta.prioridad,
    limite: consulta.limite,
    ...(esPersonal ? {} : { idUsuario: usuario.id }),
    ...(esPersonal && consulta.asignadosAMi ? { idTecnico: usuario.id } : {}),
  });
  return filas.map((f) => aTicket(f, usuario.id));
}

async function obtenerOFallar(db: Db, id: number) {
  const fila = await ticketModel.obtener(db, id);
  if (!fila) throw noEncontrado(NO_ENCONTRADO(id));
  return fila;
}

export async function obtenerDetalle(db: Db, usuario: UsuarioAuth, id: number): Promise<TicketDetalle> {
  const fila = await obtenerOFallar(db, id);
  const comentarios = await ticketModel.listarComentarios(db, id);
  return { ...aTicket(fila, usuario.id), comentarios: comentarios.map((c) => aComentario(c, usuario.id)) };
}

export async function actualizar(db: Db, usuario: UsuarioAuth, id: number, cuerpo: CuerpoActualizarTicket): Promise<Ticket> {
  await obtenerOFallar(db, id);
  const fila = await ticketModel.actualizar(db, id, {
    ...(cuerpo.estado !== undefined && { estado: cuerpo.estado }),
    ...(cuerpo.prioridad !== undefined && { prioridad: cuerpo.prioridad }),
    ...(cuerpo.idTecnico !== undefined && { id_tecnico: cuerpo.idTecnico }),
  });
  if (!fila) throw noEncontrado(NO_ENCONTRADO(id));
  return aTicket(fila, usuario.id);
}

export async function comentar(db: Db, usuario: UsuarioAuth, id: number, cuerpo: CuerpoComentario): Promise<Comentario> {
  await obtenerOFallar(db, id);
  const fila = await ticketModel.crearComentario(db, { id_ticket: id, id_usuario: usuario.id, comentario: cuerpo.comentario });
  return aComentario(fila, usuario.id);
}
