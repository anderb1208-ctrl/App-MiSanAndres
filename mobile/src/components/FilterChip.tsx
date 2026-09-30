import { StyleSheet, Text } from 'react-native';
import { colors, motion, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

interface Props {
  children: string;
  activo: boolean;
  onPress: () => void;
  icono?: NombreIcono;
  /** Acento turquesa para filtros secundarios ("Solo ocupación baja"). */
  acento?: 'navy' | 'turquoise';
  compacto?: boolean;
}

export function FilterChip({ children, activo, onPress, icono, acento = 'navy', compacto = false }: Props) {
  const fondoActivo = acento === 'navy' ? colors.primary : colors.secondary;
  const colorTexto = activo ? colors.white : colors.textMuted;
  return (
    <PressableScale
      onPress={onPress}
      escala={motion.pressScale.chip}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={children}
      style={[
        styles.base,
        compacto && styles.compacto,
        activo ? { backgroundColor: fondoActivo, borderColor: fondoActivo } : styles.inactivo,
      ]}
    >
      {icono && <Icon name={icono} size={16} color={activo ? colors.white : colors.secondary} />}
      <Text style={[styles.texto, compacto && styles.textoCompacto, { color: colorTexto }]}>{children}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  compacto: { height: 30, paddingHorizontal: spacing.gutter },
  inactivo: { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
  texto: { ...typography.labelBold, fontSize: 13 },
  textoCompacto: { fontSize: 12 },
});
