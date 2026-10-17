/**
 * Panel del administrador: usuarios y roles, destinos y métricas.
 * Las reglas críticas (no quitarse el propio rol, al menos un administrador) las aplica
 * también la base en cambiar_rol_usuario(); aquí se adelantan para dar mensajes claros.
 */
import type { Db } from '../config/supabase';
import type { UsuarioAuth } from '../models/authModel';
import * as adminModel from '../models/adminModel';
import type { EstadoDestino, Json, RolUsuario } from '../models/database.types';
import type { CuerpoEditarDestino, CuerpoNuevoDestino } from '../middleware/esquemas';
import { noEncontrado, solicitudInvalida } from '../utils/errores';
import { aDestino, type Destino } from './destinoService';

export interface UsuarioAdmin {
  id: string;
  nombre: string | null;
  correo: string | null;
  rol: RolUsuario;
  fechaRegistro: string;
}

const aUsuario = (u: adminModel.UsuarioAdmin): UsuarioAdmin => ({
  id: u.id_usuario,
  nombre: u.nombre,
  correo: u.correo,
  rol: u.rol,
  fechaRegistro: u.fecha_registro,
});

export async function listarUsuarios(db: Db): Promise<UsuarioAdmin[]> {
  return (await adminModel.listarUsuarios(db)).map(aUsuario);
}

export async function cambiarRol(db: Db, admin: UsuarioAuth, idUsuario: string, rol: RolUsuario): Promise<UsuarioAdmin> {
  if (idUsuario === admin.id && rol !== 'administrador') {
    throw solicitudInvalida('No puedes quitarte tu propio rol de administrador.');
  }
  const usuarios = await adminModel.listarUsuarios(db);
  const objetivo = usuarios.find((u) => u.id_usuario === idUsuario);
  if (!objetivo) throw noEncontrado('No existe el usuario.');
  const administradores = usuarios.filter((u) => u.rol === 'administrador').length;
  if (objetivo.rol === 'administrador' && rol !== 'administrador' && administradores <= 1) {
    throw solicitudInvalida('El sistema debe tener al menos un administrador.');
  }
  const fila = await adminModel.cambiarRol(db, idUsuario, rol);
  return aUsuario({ ...objetivo, rol: fila.rol });
}

export async function metricas(db: Db): Promise<Json> {
  return adminModel.metricas(db);
}

/** Destino con su estado operativo (incluye los ocultos). */
export async function listarDestinos(db: Db): Promise<Destino[]> {
  return (await adminModel.listarDestinos(db)).map((f) => aDestino(f));
}

export async function crearDestino(db: Db, c: CuerpoNuevoDestino): Promise<Destino> {
  const fila = await adminModel.crearDestino(db, {
    nombre: c.nombre,
    descripcion: c.descripcion,
    categoria: c.categoria,
    latitud: c.latitud,
    longitud: c.longitud,
    ubicacion_texto: c.ubicacion,
    capacidad: c.capacidad,
    horario_apertura: c.horarioApertura,
    horario_cierre: c.horarioCierre,
    rango_precio: c.rangoPrecio,
    como_llegar: c.comoLlegar,
    // Las coordenadas de un destino creado a mano no están revisadas (ver docs/revision-ubicaciones.html).
    ubicacion_fuente: 'manual',
    ubicacion_verificada: false,
  });
  return aDestino(fila);
}

export async function editarDestino(db: Db, id: number, c: CuerpoEditarDestino): Promise<Destino> {
  const fila = await adminModel.editarDestino(db, id, {
    ...(c.nombre !== undefined && { nombre: c.nombre }),
    ...(c.descripcion !== undefined && { descripcion: c.descripcion }),
    ...(c.categoria !== undefined && { categoria: c.categoria }),
    ...(c.latitud !== undefined && { latitud: c.latitud, ubicacion_fuente: 'manual' as const }),
    ...(c.longitud !== undefined && { longitud: c.longitud, ubicacion_fuente: 'manual' as const }),
    ...(c.ubicacion !== undefined && { ubicacion_texto: c.ubicacion }),
    ...(c.capacidad !== undefined && { capacidad: c.capacidad }),
    ...(c.horarioApertura !== undefined && { horario_apertura: c.horarioApertura }),
    ...(c.horarioCierre !== undefined && { horario_cierre: c.horarioCierre }),
    ...(c.rangoPrecio !== undefined && { rango_precio: c.rangoPrecio }),
    ...(c.comoLlegar !== undefined && { como_llegar: c.comoLlegar }),
  });
  if (!fila) throw noEncontrado(`No existe un destino con id ${id}.`);
  return aDestino(fila);
}

/** Estado operativo: abierto, cerrado_temporal u oculto (inactivo). */
export async function cambiarEstadoDestino(db: Db, id: number, estado: EstadoDestino): Promise<Destino> {
  const fila = await adminModel.editarDestino(db, id, { estado });
  if (!fila) throw noEncontrado(`No existe un destino con id ${id}.`);
  return aDestino(fila);
}
