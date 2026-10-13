import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, mapColors, radius, spacing, typography } from '../theme';
import { colorMarcador, ETIQUETA_MARCADOR, type EstadoMarcador } from '../utils/mapa';
import { GlassPanel } from './GlassPanel';

const ESTADOS: EstadoMarcador[] = ['Bajo', 'Medio', 'Alto', 'Cerrado'];

/** Leyenda de los colores de los marcadores (siempre con la palabra, nunca solo el color). */
export function LeyendaMapa({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <GlassPanel tono="strong" radius={radius.lg} padding={10} style={style}>
      <Text style={styles.titulo}>Ocupación ahora</Text>
      <View style={styles.items}>
        {ESTADOS.map((e) => (
          <View key={e} style={styles.item}>
            <View style={[styles.punto, { backgroundColor: colorMarcador(e) }]} />
            <Text style={styles.texto}>{ETIQUETA_MARCADOR[e]}</Text>
          </View>
        ))}
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  titulo: { ...typography.labelBold, fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  items: { gap: 3 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  punto: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: mapColors.borde },
  texto: { ...typography.labelMd, fontSize: 12, color: colors.textBody },
});
