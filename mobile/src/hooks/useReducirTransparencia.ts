import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Ajuste de accesibilidad "Reducir transparencia" (iOS). En Android siempre es false. */
export function useReducirTransparencia(): boolean {
  const [reducir, setReducir] = useState(false);

  useEffect(() => {
    let activo = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((valor) => {
        if (activo) setReducir(valor);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReducir);
    return () => {
      activo = false;
      sub.remove();
    };
  }, []);

  return reducir;
}
