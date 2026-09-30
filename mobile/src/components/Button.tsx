import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

type Variante = 'primary' | 'secondary' | 'glass' | 'light' | 'danger';

interface Props {
  children: string;
  onPress?: () => void;
  variante?: Variante;
  tamano?: 'md' | 'lg';
  icono?: NombreIcono;
  iconoDerecha?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
  anchoCompleto?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANTES: Record<Variante, { fondo: string; texto: string; borde: string }> = {
  primary: { fondo: colors.primary, texto: colors.onPrimary, borde: colors.primary },
  secondary: { fondo: colors.secondary, texto: colors.onPrimary, borde: colors.secondary },
  glass: { fondo: colors.glassStrong, texto: colors.textStrong, borde: colors.glassBorder },
  light: { fondo: colors.white, texto: colors.primary, borde: colors.white },
  danger: { fondo: colors.errorContainer, texto: colors.error, borde: 'rgba(186,26,26,0.2)' },
};

/** Botón principal (CustomButton del diagrama de componentes). */
export function Button({
  children,
  onPress,
  variante = 'primary',
  tamano = 'md',
  icono,
  iconoDerecha,
  cargando = false,
  deshabilitado = false,
  anchoCompleto = false,
  style,
}: Props) {
  const v = VARIANTES[variante];
  const inactivo = deshabilitado || cargando;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      accessibilityLabel={children}
      style={[
        styles.base,
        tamano === 'lg' ? styles.lg : styles.md,
        { backgroundColor: v.fondo, borderColor: v.borde },
        variante === 'primary' && shadows.sm,
        anchoCompleto && styles.anchoCompleto,
        inactivo && !cargando && styles.inactivo,
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <View style={styles.contenido}>
          {icono && <Icon name={icono} size={20} color={v.texto} />}
          <Text style={[styles.texto, { color: v.texto }]} numberOfLines={1}>
            {children}
          </Text>
          {iconoDerecha && <Icon name={iconoDerecha} size={20} color={v.texto} />}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  md: { height: 44 },
  lg: { height: 52 },
  anchoCompleto: { alignSelf: 'stretch' },
  inactivo: { opacity: 0.45 },
  contenido: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texto: typography.button,
});
