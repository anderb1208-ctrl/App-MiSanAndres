import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, motion, radius, sizes } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

type Tono = 'glass-dark' | 'glass' | 'tonal';

interface Props {
  icono: NombreIcono;
  etiqueta: string;
  onPress?: () => void;
  tono?: Tono;
  style?: StyleProp<ViewStyle>;
}

const TONOS: Record<Tono, { fondo: string; borde: string; icono: string }> = {
  'glass-dark': { fondo: colors.glassDark, borde: colors.glassBorderDark, icono: colors.white },
  glass: { fondo: colors.glassStrong, borde: colors.glassBorder, icono: colors.textStrong },
  tonal: { fondo: colors.secondarySoft, borde: 'transparent', icono: colors.secondary },
};

/** Botón circular de icono (volver, editar, preferencias…). */
export function IconButton({ icono, etiqueta, onPress, tono = 'glass', style }: Props) {
  const t = TONOS[tono];
  return (
    <PressableScale
      onPress={onPress}
      escala={motion.pressScale.icon}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      hitSlop={6}
      style={[styles.base, { backgroundColor: t.fondo, borderColor: t.borde }, style]}
    >
      <Icon name={icono} size={sizes.iconSm + 2} color={t.icono} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
