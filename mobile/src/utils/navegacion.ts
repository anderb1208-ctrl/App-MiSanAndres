import type { Rol } from '../services/tipos';
import type { TabsParamList } from '../navigation/types';

/** Pestaña de inicio de cada rol: a dónde vuelve "Volver" cuando no hay historial. */
export function pestanaDeInicio(rol: Rol | null): keyof TabsParamList {
  if (rol === 'administrador') return 'Panel';
  return 'Inicio';
}
