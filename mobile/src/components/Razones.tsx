import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Razon } from '../services/tipos';
import { colors, occupancyColors, radius, spacing, typography } from '../theme';
import { Icon } from './Icon';

const TONO = {
  positiva: { fondo: occupancyColors.Bajo.bg, texto: occupancyColors.Bajo.fg, borde: occupancyColors.Bajo.border, icono: 'check' as const },
  advertencia: { fondo: occupancyColors.Medio.bg, texto: occupancyColors.Medio.fg, borde: occupancyColors.Medio.border, icono: 'warning-amber' as const },
};

/**
 * Las razones más importantes como chips (✓ / ⚠). Se muestran hasta `max` positivas y, si
 * hay, la primera advertencia, para que la tarjeta no oculte lo que no conviene.
 */
export function ChipsRazones({ razones, max = 3, style }: { razones: Razon[]; max?: number; style?: StyleProp<ViewStyle> }) {
  const advertencia = razones.find((r) => r.tipo === 'advertencia');
  const positivas = razones.filter((r) => r.tipo === 'positiva').slice(0, advertencia ? max - 1 : max);
  const visibles = advertencia ? [...positivas, advertencia] : positivas;
  if (visibles.length === 0) return null;
  return (
    <View style={[styles.chips, style]}>
      {visibles.map((r) => {
        const t = TONO[r.tipo];
        return (
          <View
            key={r.codigo}
            style={[styles.chip, { backgroundColor: t.fondo, borderColor: t.borde }]}
            accessible
            accessibilityLabel={`${r.tipo === 'advertencia' ? 'Atención: ' : ''}${r.texto}`}
          >
            <Icon name={t.icono} size={13} color={t.texto} />
            <Text style={[styles.chipTexto, { color: t.texto }]} numberOfLines={1}>
              {r.texto}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Lista completa para "Por qué es para ti" en el detalle. */
export function ListaRazones({ razones }: { razones: Razon[] }) {
  return (
    <View style={styles.lista}>
      {razones.map((r) => {
        const t = TONO[r.tipo];
        return (
          <View key={r.codigo} style={styles.fila} accessible accessibilityLabel={`${r.tipo === 'advertencia' ? 'Atención: ' : ''}${r.texto}`}>
            <View style={[styles.icono, { backgroundColor: t.fondo, borderColor: t.borde }]}>
              <Icon name={t.icono} size={16} color={t.texto} />
            </View>
            <Text style={styles.filaTexto}>{r.texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipTexto: { ...typography.labelMd, fontSize: 12, flexShrink: 1 },
  lista: { gap: spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icono: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filaTexto: { ...typography.bodyMd, color: colors.textStrong, flex: 1 },
});
