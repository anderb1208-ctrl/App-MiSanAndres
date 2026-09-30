import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { blur, colors, radius as radios, shadows } from '../theme';
import { PressableScale } from './PressableScale';

type Tono = 'normal' | 'strong' | 'dark';

interface Props {
  children: ReactNode;
  tono?: Tono;
  padding?: number;
  radius?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const FONDOS: Record<Tono, string> = {
  normal: colors.glass,
  strong: colors.glassStrong,
  dark: colors.glassDark,
};

/**
 * Superficie "liquid glass": blanco translúcido, borde blanco fino y sombra navy.
 * En iOS agrega desenfoque real; en Android queda como superficie translúcida
 * (el desenfoque de Android requiere un BlurTargetView y no vale la pena aquí).
 */
export function GlassPanel({
  children,
  tono = 'normal',
  padding = 16,
  radius = radios.panel,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const estilo: StyleProp<ViewStyle> = [
    styles.base,
    shadows.md,
    {
      padding,
      borderRadius: radius,
      backgroundColor: FONDOS[tono],
      borderColor: tono === 'dark' ? colors.glassBorderDark : colors.glassBorder,
    },
    style,
  ];

  const fondo =
    Platform.OS === 'ios' ? (
      <BlurView
        intensity={blur.panel}
        tint={tono === 'dark' ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
      />
    ) : null;

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={estilo}>
        {fondo}
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={estilo}>
      {fondo}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1 },
});
