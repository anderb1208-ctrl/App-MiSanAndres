import type { Db } from '../config/supabase';
import type { NivelOcupacion, PreferenciaRow, TipoPreferencia } from '../models/database.types';
import * as preferenciaModel from '../models/preferenciaModel';
import * as usuarioModel from '../models/usuarioModel';
import type { CuerpoPreferencias } from '../middleware/esquemas';
import { noEncontrado, solicitudInvalida, type DetalleError } from '../utils/errores';

export interface ItemCatalogo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface Catalogo {
  categorias: ItemCatalogo[];
  experiencias: ItemCatalogo[];
  grupos: ItemCatalogo[];
}

export interface PreferenciasUsuario {
  categorias: string[];
  tiposExperiencia: string[];
  tiposGrupo: string[];
  nivelOcupacion: NivelOcupacion | null;
}

/** Preferencia del usuario con su tipo y nombre (la usa el recomendador). */
export interface PreferenciaDetallada {
  id: number;
  tipo: TipoPreferencia;
  codigo: string;
  nombre: string;
}

const aItem = (p: PreferenciaRow): ItemCatalogo => ({
  id: p.id_preferencia,
  codigo: p.codigo,
  nombre: p.nombre,
  descripcion: p.descripcion,
});

export async function obtenerCatalogo(db: Db): Promise<Catalogo> {
  const filas = await preferenciaModel.listarCatalogo(db);
  const deTipo = (tipo: TipoPreferencia) => filas.filter((f) => f.tipo === tipo).map(aItem);
  return { categorias: deTipo('categoria'), experiencias: deTipo('experiencia'), grupos: deTipo('grupo') };
}

/** Preferencias del usuario con tipo y nombre, más su nivel de ocupación preferido. */
export async function obtenerDetalladas(
  db: Db,
  idUsuario: string,
): Promise<{ preferencias: PreferenciaDetallada[]; nivelOcupacion: NivelOcupacion | null }> {
  const [catalogo, ids, usuario] = await Promise.all([
    preferenciaModel.listarCatalogo(db),
    preferenciaModel.listarIdsDelUsuario(db, idUsuario),
    usuarioModel.obtener(db, idUsuario),
  ]);
  if (!usuario) throw noEncontrado('No se encontró el perfil del usuario.');

  const propias = new Set(ids);
  const preferencias = catalogo
    .filter((p) => propias.has(p.id_preferencia))
    .map((p) => ({ id: p.id_preferencia, tipo: p.tipo, codigo: p.codigo, nombre: p.nombre }));
  return { preferencias, nivelOcupacion: usuario.nivel_ocupacion_preferido };
}

function aPreferenciasUsuario(
  preferencias: PreferenciaDetallada[],
  nivelOcupacion: NivelOcupacion | null,
): PreferenciasUsuario {
  const codigos = (tipo: TipoPreferencia) =>
    preferencias.filter((p) => p.tipo === tipo).map((p) => p.codigo);
  return {
    categorias: codigos('categoria'),
    tiposExperiencia: codigos('experiencia'),
    tiposGrupo: codigos('grupo'),
    nivelOcupacion,
  };
}

export async function obtener(db: Db, idUsuario: string): Promise<PreferenciasUsuario> {
  const { preferencias, nivelOcupacion } = await obtenerDetalladas(db, idUsuario);
  return aPreferenciasUsuario(preferencias, nivelOcupacion);
}

/**
 * Reemplaza las preferencias del usuario por las enviadas. Aplica solo la
 * diferencia (agrega las nuevas y luego quita las que sobran) para que un fallo
 * a mitad de camino no deje al usuario sin preferencias.
 */
export async function reemplazar(
  db: Db,
  idUsuario: string,
  cuerpo: CuerpoPreferencias,
): Promise<PreferenciasUsuario> {
  const catalogo = await preferenciaModel.listarCatalogo(db);
  const detalles: DetalleError[] = [];

  const resolver = (campo: string, tipo: TipoPreferencia, codigos: string[]) =>
    codigos.flatMap((codigo, i) => {
      const item = catalogo.find((p) => p.tipo === tipo && p.codigo === codigo);
      if (!item) {
        detalles.push({ campo: `body.${campo}.${i}`, mensaje: `"${codigo}" no existe en el catálogo.` });
        return [];
      }
      return [item.id_preferencia];
    });

  const nuevas = new Set([
    ...resolver('categorias', 'categoria', cuerpo.categorias),
    ...resolver('tiposExperiencia', 'experiencia', cuerpo.tiposExperiencia),
    ...resolver('tiposGrupo', 'grupo', cuerpo.tiposGrupo),
  ]);
  if (detalles.length > 0) throw solicitudInvalida('Hay preferencias que no existen.', detalles);

  const actuales = new Set(await preferenciaModel.listarIdsDelUsuario(db, idUsuario));
  const usuario = await usuarioModel.actualizar(db, idUsuario, {
    nivel_ocupacion_preferido: cuerpo.nivelOcupacion,
  });
  if (!usuario) throw noEncontrado('No se encontró el perfil del usuario.');

  await preferenciaModel.agregar(db, idUsuario, [...nuevas].filter((id) => !actuales.has(id)));
  await preferenciaModel.quitar(db, idUsuario, [...actuales].filter((id) => !nuevas.has(id)));

  return obtener(db, idUsuario);
}

/** Borra todas las preferencias y el nivel de ocupación preferido. */
export async function restablecer(db: Db, idUsuario: string): Promise<void> {
  const usuario = await usuarioModel.actualizar(db, idUsuario, { nivel_ocupacion_preferido: null });
  if (!usuario) throw noEncontrado('No se encontró el perfil del usuario.');
  await preferenciaModel.quitarTodas(db, idUsuario);
}
