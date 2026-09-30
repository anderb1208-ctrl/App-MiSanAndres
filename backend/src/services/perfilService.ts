import type { Db } from '../config/supabase';
import type { NivelOcupacion, UsuarioRow } from '../models/database.types';
import type { UsuarioAuth } from '../models/authModel';
import * as usuarioModel from '../models/usuarioModel';
import type { CuerpoPerfil } from '../middleware/esquemas';
import { noEncontrado } from '../utils/errores';

export interface Perfil {
  id: string;
  nombre: string | null;
  /** Correo de Supabase Auth (no se guarda en la tabla usuario). */
  correo: string | null;
  nivelOcupacionPreferido: NivelOcupacion | null;
  fechaRegistro: string;
}

const PERFIL_NO_ENCONTRADO = 'No se encontró el perfil del usuario.';

const aPerfil = (fila: UsuarioRow, usuario: UsuarioAuth): Perfil => ({
  id: fila.id_usuario,
  nombre: fila.nombre,
  correo: usuario.correo,
  nivelOcupacionPreferido: fila.nivel_ocupacion_preferido,
  fechaRegistro: fila.fecha_registro,
});

export async function obtener(db: Db, usuario: UsuarioAuth): Promise<Perfil> {
  const fila = await usuarioModel.obtener(db, usuario.id);
  if (!fila) throw noEncontrado(PERFIL_NO_ENCONTRADO);
  return aPerfil(fila, usuario);
}

export async function actualizar(db: Db, usuario: UsuarioAuth, cuerpo: CuerpoPerfil): Promise<Perfil> {
  const fila = await usuarioModel.actualizar(db, usuario.id, { nombre: cuerpo.nombre });
  if (!fila) throw noEncontrado(PERFIL_NO_ENCONTRADO);
  return aPerfil(fila, usuario);
}
