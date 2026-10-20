import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius as radios, shadows } from '../theme';
import type { CalidadVidrio } from '../utils/vidrio';
import { PressableScale } from './PressableScale';
import { bordeVidrio, FondoVidrio, useMedicionVidrio, useModoVidrio, type TinteVidrio } from './SuperficieVidrio';

type Tono = 'normal' | 'strong' | 'dark';

interface Props {
  children: ReactNode;
  tono?: Tono;
  padding?: number;
  radius?: number;
  /**
   * desenfoque (por defecto): desenfoque en iOS, velo en Android; nunca Liquid Glass porque es
   * contenido. ligera: solo velo, para elementos repetidos de listas largas.
   */
  calidad?: Exclude<CalidadVidrio, 'nativa'>;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Acciones extra para lectores de pantalla (p. ej. "Alertas" en una tarjeta tocable). */
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (e: AccessibilityActionEvent) => void;
  style?: StyleProp<ViewStyle>;
}

const TINTES: Record<Tono, TinteVidrio | undefined> = {
  normal: { fondo: colors.glass, borde: colors.glassBorder },
  strong: { fondo: colors.glassStrong, borde: colors.glassBorder },
  dark: undefined,
};

/**
 * Panel de contenido translúcido: blanco translúcido, borde blanco fino y sombra navy.
 * Usa las mismas capas de vidrio que SuperficieVidrio (FondoVidrio), incluido el respaldo
 * opaco de "Reducir transparencia".
 */
export function GlassPanel({
  children,
  tono = 'normal',
  padding = 16,
  radius = radios.panel,
  calidad = 'desenfoque',
  onPress,
  accessibilityLabel,
  accessibilityActions,
  onAccessibilityAction,
  style,
}: Props) {
  const modo = useModoVidrio(calidad);
  useMedicionVidrio(modo);
  const tonoVidrio = tono === 'dark' ? 'oscuro' : 'claro';
  const tinte = TINTES[tono];

  const estilo: StyleProp<ViewStyle> = [
    styles.base,
    shadows.md,
    { padding, borderRadius: radius, borderColor: bordeVidrio(tonoVidrio, tinte) },
    style,
  ];
  const fondo = <FondoVidrio modo={modo} tono={tonoVidrio} tinte={tinte} radio={radius} />;

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={onAccessibilityAction}
        style={estilo}
      >
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
