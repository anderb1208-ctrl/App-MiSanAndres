import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

/** Íconos de la barra de estado claros (sobre fotos) u oscuros, mientras la pantalla tiene el foco. */
export function useBarraEstado(estilo: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(estilo, true);
    }, [estilo]),
  );
}
