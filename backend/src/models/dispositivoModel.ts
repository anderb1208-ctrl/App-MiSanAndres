import type { Db } from '../config/supabase';
import type { PlataformaDispositivo } from './database.types';
import { verificarLista, verificarOperacion, verificar } from './verificar';

/** Registra el token de Expo para el usuario del JWT (la función lo reasigna si cambió de cuenta). */
export async function registrar(db: Db, token: string, plataforma: PlataformaDispositivo): Promise<void> {
  const { error } = await db.rpc('registrar_dispositivo_push', { p_token: token, p_plataforma: plataforma });
  verificarOperacion(error, 'Registrar dispositivo');
}

export async function quitar(db: Db, token: string): Promise<void> {
  const { error } = await db.rpc('quitar_dispositivo_push', { p_token: token });
  verificarOperacion(error, 'Quitar dispositivo');
}

/** Tokens de quienes tienen el destino en favoritos con ese aviso (solo administrador). */
export async function tokensParaAviso(db: Db, idDestino: number, tipo: 'cierre' | 'apertura'): Promise<string[]> {
  const filas = verificarLista(await db.rpc('tokens_para_aviso', { p_id_destino: idDestino, p_tipo: tipo }), 'Tokens para aviso');
  return filas.map((f) => f.token);
}

/** Marca como inactivos los tokens que Expo rechazó (DeviceNotRegistered). */
export async function desactivar(db: Db, tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;
  return verificar(await db.rpc('desactivar_tokens_push', { p_tokens: tokens }), 'Desactivar tokens') ?? 0;
}
