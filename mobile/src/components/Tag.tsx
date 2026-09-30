import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';

type Tono = 'neutral' | 'turquoise' | 'glass';

interface Props {
  children: string;
  icono?: NombreIcono;
  tono?: Tono;
  style?: StyleProp<ViewStyle>;
}

const TONOS: Record<Tono, { fondo: string; texto: string; borde: string }> = {
  neutral: { fondo: colors.surfaceLow, texto: colors.textMuted, borde: colors.borderCard },
  turquoise: { fondo: 'rgba(179,235,255,0.45)', texto: colors.turq700, borde: 'transparent' },
  glass: { fondo: colors.glassDark, texto: colors.white, borde: colors.glassBorderDark },
};

/** Etiqueta en forma de píldora (categoría, características, coincidencias). */
export function Tag({ children, icono, tono = 'neutral', style }: Props) {
  const t = TONOS[tono];
  return (
    <View style={[styles.base, { backgroundColor: t.fondo, borderColor: t.borde }, style]}>
      {icono && <Icon name={icono} size={14} color={t.texto} />}
      <Text style={[styles.texto, { color: t.texto }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  texto: typography.labelMd,
});
