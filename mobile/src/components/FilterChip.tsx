import { StyleSheet, Text, View } from 'react-native';
import { colors, motion, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { SuperficieVidrio } from './SuperficieVidrio';

interface Props {
  children: string;
  activo: boolean;
  onPress: () => void;
  icono?: NombreIcono;
  /** Acento turquesa para filtros secundarios ("Solo ocupación baja"). */
  acento?: 'navy' | 'turquoise';
  compacto?: boolean;
  /** Cuántos resultados da el filtro ("Abierto 3"). */
  cuenta?: number;
}

/**
 * Chip de filtro. Activo: vidrio con el tinte del acento, marca ✓ y texto en negrita blanca
 * (bien marcado, ≥ 4,5:1). Inactivo: chip translúcido simple (sin vidrio, para no multiplicar
 * superficies en filas largas). 36 px de alto + 4 px arriba y abajo = 44 px táctiles.
 */
export function FilterChip({ children, activo, onPress, icono, acento = 'navy', compacto = false, cuenta }: Props) {
  const fondoActivo = acento === 'navy' ? colors.primary : colors.secondary;
  const colorTexto = activo ? colors.white : colors.textMuted;
  const contenido = (
    <>
      {activo ? (
        <Icon name="check" size={16} color={colors.white} />
      ) : icono ? (
        <Icon name={icono} size={16} color={colors.secondary} />
      ) : null}
      <Text style={[styles.texto, compacto && styles.textoCompacto, { color: colorTexto }]}>{children}</Text>
      {cuenta !== undefined && (
        <View style={[styles.cuenta, activo ? styles.cuentaActiva : styles.cuentaInactiva]}>
          <Text style={[styles.cuentaTexto, { color: activo ? colors.white : colors.textStrong }]}>{cuenta}</Text>
        </View>
      )}
    </>
  );

  return (
    <PressableScale
      onPress={onPress}
      escala={motion.pressScale.chip}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={cuenta !== undefined ? `${children}, ${cuenta}` : children}
      hitSlop={{ top: 4, bottom: 4 }}
    >
      {activo ? (
        <SuperficieVidrio
          variante="chip"
          tono="oscuro"
          tinte={{ fondo: fondoActivo, borde: fondoActivo, fondoOpaco: fondoActivo }}
          style={[styles.base, compacto && styles.compacto]}
        >
          {contenido}
        </SuperficieVidrio>
      ) : (
        <View style={[styles.base, compacto && styles.compacto, styles.inactivo]}>{contenido}</View>
      )}
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
  compacto: { paddingHorizontal: spacing.gutter },
  inactivo: { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder },
  texto: { ...typography.labelBold, fontSize: 13 },
  textoCompacto: { fontSize: 12 },
  cuenta: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cuentaActiva: { backgroundColor: colors.chipCuentaActiva },
  cuentaInactiva: { backgroundColor: colors.track },
  cuentaTexto: { ...typography.labelBold, fontSize: 12, lineHeight: 16, fontVariant: ['tabular-nums'] },
});
