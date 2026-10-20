/**
 * Decisiones del vidrio, sin React ni módulos nativos (se prueban con Jest).
 *
 * nativo: Liquid Glass (iOS 26+). desenfoque: expo-blur + velo (iOS anterior).
 * color: velo translúcido con borde sutil (Android y elementos de listas).
 * opaco: superficie casi opaca ("Reducir transparencia").
 */
export type ModoVidrio = 'nativo' | 'desenfoque' | 'color' | 'opaco';

/**
 * Calidad pedida por quien usa la superficie:
 * nativa: el mejor efecto disponible (controles, panel de Inicio, carrusel).
 * desenfoque: nunca Liquid Glass; desenfoque en iOS (paneles de contenido).
 * ligera: solo color translúcido (elementos repetidos de listas, por rendimiento).
 */
export type CalidadVidrio = 'nativa' | 'desenfoque' | 'ligera';

export interface EntornoVidrio {
  plataforma: string;
  /** isLiquidGlassAvailable() && isGlassEffectAPIAvailable() */
  liquidGlass: boolean;
  reducirTransparencia: boolean;
}

export function decidirModoVidrio(entorno: EntornoVidrio, calidad: CalidadVidrio): ModoVidrio {
  if (entorno.reducirTransparencia) return 'opaco';
  if (calidad === 'ligera') return 'color';
  if (calidad === 'nativa' && entorno.liquidGlass && entorno.plataforma === 'ios') return 'nativo';
  if (entorno.plataforma === 'ios') return 'desenfoque';
  return 'color';
}

/** Modos que cuestan GPU (vista nativa de vidrio o desenfoque en vivo). */
export const esVidrioCostoso = (modo: ModoVidrio) => modo === 'nativo' || modo === 'desenfoque';

/**
 * Contador de superficies costosas montadas a la vez (medición de rendimiento).
 * En desarrollo se registra el máximo alcanzado para compararlo con el presupuesto.
 */
export const PRESUPUESTO_VIDRIO = 12;
const activas: Record<'nativo' | 'desenfoque', number> = { nativo: 0, desenfoque: 0 };
let maximo = 0;

export function registrarVidrio(modo: ModoVidrio, alSuperarPresupuesto?: (total: number) => void): () => void {
  if (modo !== 'nativo' && modo !== 'desenfoque') return () => undefined;
  activas[modo]++;
  const total = activas.nativo + activas.desenfoque;
  if (total > maximo) maximo = total;
  if (total > PRESUPUESTO_VIDRIO) alSuperarPresupuesto?.(total);
  return () => {
    activas[modo] = Math.max(0, activas[modo] - 1);
  };
}

export function medicionVidrio() {
  return { nativo: activas.nativo, desenfoque: activas.desenfoque, total: activas.nativo + activas.desenfoque, maximo };
}

/** Solo para pruebas. */
export function reiniciarMedicionVidrio() {
  activas.nativo = 0;
  activas.desenfoque = 0;
  maximo = 0;
}
