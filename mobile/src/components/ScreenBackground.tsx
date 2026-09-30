import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/**
 * Fondo de la app: #f3f6f8 con tintes ambientales muy suaves
 * (turquesa arriba a la izquierda, arena a la derecha) para que el glass tenga algo que refractar.
 */
export function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.fondo}>
      <LinearGradient
        colors={[colors.ambientTurquoise, 'rgba(179,235,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.45 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(230,227,208,0)', colors.ambientSand, 'rgba(230,227,208,0)']}
        locations={[0.3, 0.6, 0.95]}
        start={{ x: 0.4, y: 0.3 }}
        end={{ x: 1, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.surfaceApp },
});
