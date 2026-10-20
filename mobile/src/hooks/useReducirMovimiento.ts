import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Ajuste de accesibilidad "Reducir movimiento" (iOS) / "Quitar animaciones" (Android). */
export function useReducirMovimiento(): boolean {
  const [reducir, setReducir] = useState(false);

  useEffect(() => {
    let activo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (activo) setReducir(valor);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducir);
    return () => {
      activo = false;
      sub.remove();
    };
  }, []);

  return reducir;
}
