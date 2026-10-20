import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Ajuste de accesibilidad "Reducir transparencia" (iOS; en Android siempre es false).
 * Una sola suscripción compartida por toda la app: cada superficie de vidrio la lee
 * sin agregar su propio listener (importa en listas largas).
 */
let reducir = false;
let iniciado = false;
const oyentes = new Set<() => void>();

function actualizar(valor: boolean) {
  if (valor === reducir) return;
  reducir = valor;
  oyentes.forEach((avisar) => avisar());
}

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  AccessibilityInfo.isReduceTransparencyEnabled().then(actualizar).catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', actualizar);
}

function suscribir(avisar: () => void) {
  iniciar();
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

export function useReducirTransparencia(): boolean {
  return useSyncExternalStore(suscribir, () => reducir, () => false);
}
