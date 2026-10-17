import type { PrecioDestino, Presupuesto } from '../services/tipos';

/** Límites y paso del control de presupuesto (COP por persona por visita). */
export const PRESUPUESTO_MIN = 0;
export const PRESUPUESTO_MAX = 500_000;
export const PRESUPUESTO_PASO = 5_000;
/** Rango con el que arranca el control cuando el usuario aún no definió uno. */
export const PRESUPUESTO_INICIAL: Presupuesto = { minCop: 20_000, maxCop: 150_000 };

/**
 * "$85.000" (separador de miles con punto). Se hace a mano porque Hermes no siempre trae
 * los datos de configuración regional para es-CO.
 */
export function formatearCop(valor: number): string {
  const entero = Math.round(Math.abs(valor)).toString();
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${valor < 0 ? '-' : ''}$${conPuntos}`;
}

/** "$20.000 – $80.000 COP"; el máximo del control se muestra como "$500.000+". */
export function formatearPresupuesto(p: Presupuesto): string {
  const max = p.maxCop >= PRESUPUESTO_MAX ? `${formatearCop(PRESUPUESTO_MAX)}+` : formatearCop(p.maxCop);
  return `${formatearCop(p.minCop)} – ${max} COP`;
}

/** "Gratis", "$15.000 – $25.000" o "$0 – $5.000", por persona. */
export function formatearPrecio(precio: PrecioDestino): string {
  if (precio.maxCop === 0) return 'Gratis';
  if (precio.minCop === precio.maxCop) return formatearCop(precio.minCop);
  return `${formatearCop(precio.minCop)} – ${formatearCop(precio.maxCop)}`;
}

/** Ajusta un valor al paso y a los límites del control. */
export function ajustarAlPaso(valor: number): number {
  const redondeado = Math.round(valor / PRESUPUESTO_PASO) * PRESUPUESTO_PASO;
  return Math.min(PRESUPUESTO_MAX, Math.max(PRESUPUESTO_MIN, redondeado));
}
