import type { Insignia } from '../services/tipos';

/** "2 de 3", "¡Desbloqueada!". */
export function textoProgresoInsignia(i: Pick<Insignia, 'progreso' | 'meta' | 'desbloqueada'>): string {
  return i.desbloqueada ? '¡Desbloqueada!' : `${i.progreso} de ${i.meta}`;
}

/** Mensaje de Explorar al llegar desde una insignia: "Te faltan 2 cayos para Navegante de cayos". */
export function motivoPendientes(i: Pick<Insignia, 'nombre' | 'meta' | 'progreso' | 'pendientes'>): string {
  const faltan = Math.max(i.meta - i.progreso, 0);
  return `Te ${faltan === 1 ? 'falta 1 destino' : `faltan ${faltan} destinos`} para «${i.nombre}»`;
}
