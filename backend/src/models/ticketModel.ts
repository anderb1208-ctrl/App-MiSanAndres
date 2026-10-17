import type { Db } from '../config/supabase';
import type {
  CategoriaTicket,
  EstadoTicket,
  PrioridadTicket,
  TicketComentarioRow,
  TicketRow,
} from './database.types';
import { verificar, verificarLista } from './verificar';

/** Ticket con el nombre del destino y de las personas (si RLS deja verlos). */
export interface TicketConRelaciones extends TicketRow {
  destino: { id_destino: number; nombre: string } | null;
  creador: { nombre: string | null } | null;
  tecnico: { nombre: string | null } | null;
}

export interface ComentarioConAutor extends TicketComentarioRow {
  autor: { nombre: string | null; rol: string } | null;
}

const SELECCION =
  '*, destino (id_destino, nombre), creador:usuario!ticket_id_usuario_fkey (nombre), tecnico:usuario!ticket_id_tecnico_fkey (nombre)';

export interface NuevoTicket {
  id_usuario: string;
  categoria: CategoriaTicket;
  asunto: string;
  descripcion: string;
  prioridad?: PrioridadTicket;
  id_destino?: number | null;
}

export async function crear(db: Db, ticket: NuevoTicket): Promise<TicketConRelaciones> {
  const resultado = await db.from('ticket').insert(ticket).select(SELECCION).single();
  return verificar(resultado, 'Crear ticket') as unknown as TicketConRelaciones;
}

export interface FiltrosTickets {
  estado?: EstadoTicket;
  prioridad?: PrioridadTicket;
  /** Solo los creados por este usuario. */
  idUsuario?: string;
  /** Solo los asignados a este técnico. */
  idTecnico?: string;
  limite: number;
}

/** Tickets visibles (RLS: el turista ve solo los suyos), del más reciente al más antiguo. */
export async function listar(db: Db, filtros: FiltrosTickets): Promise<TicketConRelaciones[]> {
  let consulta = db.from('ticket').select(SELECCION);
  if (filtros.estado) consulta = consulta.eq('estado', filtros.estado);
  if (filtros.prioridad) consulta = consulta.eq('prioridad', filtros.prioridad);
  if (filtros.idUsuario) consulta = consulta.eq('id_usuario', filtros.idUsuario);
  if (filtros.idTecnico) consulta = consulta.eq('id_tecnico', filtros.idTecnico);
  const resultado = await consulta.order('fecha_creacion', { ascending: false }).limit(filtros.limite);
  return verificarLista(resultado, 'Listar tickets') as unknown as TicketConRelaciones[];
}

/** Un ticket visible, o null si no existe o RLS no deja verlo. */
export async function obtener(db: Db, id: number): Promise<TicketConRelaciones | null> {
  const resultado = await db.from('ticket').select(SELECCION).eq('id_ticket', id).maybeSingle();
  return verificar(resultado, 'Obtener ticket') as unknown as TicketConRelaciones | null;
}

export interface CambiosTicket {
  estado?: EstadoTicket;
  prioridad?: PrioridadTicket;
  id_tecnico?: string | null;
}

/** Actualiza estado, prioridad o asignación (RLS: solo técnico o administrador). null si no se pudo. */
export async function actualizar(db: Db, id: number, cambios: CambiosTicket): Promise<TicketConRelaciones | null> {
  const resultado = await db.from('ticket').update(cambios).eq('id_ticket', id).select(SELECCION).maybeSingle();
  return verificar(resultado, 'Actualizar ticket') as unknown as TicketConRelaciones | null;
}

export async function listarComentarios(db: Db, idTicket: number): Promise<ComentarioConAutor[]> {
  const resultado = await db
    .from('ticket_comentario')
    .select('*, autor:usuario (nombre, rol)')
    .eq('id_ticket', idTicket)
    .order('fecha', { ascending: true });
  return verificarLista(resultado, 'Listar comentarios') as unknown as ComentarioConAutor[];
}

export async function crearComentario(
  db: Db,
  comentario: { id_ticket: number; id_usuario: string; comentario: string },
): Promise<ComentarioConAutor> {
  const resultado = await db.from('ticket_comentario').insert(comentario).select('*, autor:usuario (nombre, rol)').single();
  return verificar(resultado, 'Crear comentario') as unknown as ComentarioConAutor;
}
