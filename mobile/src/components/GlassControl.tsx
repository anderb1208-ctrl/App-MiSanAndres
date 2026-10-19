import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useReducirTransparencia } from '../hooks/useReducirTransparencia';
import { blur, colors, shadows } from '../theme';

/** Liquid Glass nativo solo existe en iOS 26+ y con el módulo disponible en el binario. */
function hayLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

/** Depende del sistema y del binario, no cambia mientras la app corre. */
const LIQUID_GLASS = hayLiquidGlass();

interface Props extends Omit<ViewProps, 'style'> {
  /** claro: sobre fondos claros (ícono oscuro). oscuro: sobre fotos (ícono blanco). */
  tono?: 'claro' | 'oscuro';
  /** Sombra navy del respaldo (con Liquid Glass la sombra la pone el sistema). */
  conSombra?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Superficie de vidrio para navegación y controles flotantes (barra de pestañas, volver,
 * favorito, barras de acciones). No usar en contenido.
 * - iOS 26+: Liquid Glass nativo (expo-glass-effect).
 * - iOS anterior: desenfoque (expo-blur) + velo blanco translúcido, como la referencia.
 * - Android: velo translúcido sin desenfoque.
 * - "Reducir transparencia" activo: superficie casi opaca para que el texto se lea siempre.
 * No se le debe poner opacity < 1 ni a ella ni a sus padres (rompe el efecto nativo).
 */
export function GlassControl({ tono = 'claro', conSombra = true, style, children, ...resto }: Props) {
  const reducir = useReducirTransparencia();
  const oscuro = tono === 'oscuro';

  if (LIQUID_GLASS && !reducir) {
    return (
      <GlassView {...resto} glassEffectStyle="regular" colorScheme={oscuro ? 'dark' : 'light'} style={style}>
        {children}
      </GlassView>
    );
  }

  const { borderRadius } = StyleSheet.flatten(style) ?? {};
  const capa = [StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' as const }];
  const velo = reducir
    ? oscuro
      ? colors.glassDarkOpaque
      : colors.glassOpaque
    : oscuro
      ? colors.glassDark
      : Platform.OS === 'ios'
        ? colors.glass
        : colors.glassStrong;

  return (
    <View
      {...resto}
      style={[
        styles.respaldo,
        { borderColor: oscuro ? colors.glassBorderDark : colors.glassBorder },
        conSombra && shadows.lg,
        style,
      ]}
    >
      {Platform.OS === 'ios' && !reducir && (
        <BlurView intensity={blur.bar} tint={oscuro ? 'dark' : 'light'} style={capa} />
      )}
      <View pointerEvents="none" style={[capa, { backgroundColor: velo }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  respaldo: { borderWidth: 1 },
});
