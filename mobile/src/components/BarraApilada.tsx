import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type TonoChip, typography } from '../theme';
import { segmentosBarra } from '../utils/panelAdmin';
import { ChipEstado } from './ChipEstado';

interface Props<K extends string> {
  conteos: Partial<Record<K, number>>;
  orden: readonly K[];
  etiqueta: (clave: K) => string;
  tono: (clave: K) => TonoChip;
  onElegir?: (clave: K) => void;
  /** Resumen hablado de la barra ("Tickets por estado: 3 abiertos…"). */
  etiquetaAccesible: string;
}

/**
 * Barra apilada de proporciones con leyenda: chip de cada grupo y su número alineado a la derecha.
 * La leyenda es la versión accesible y tocable (≥ 44 px); la barra es su representación visual.
 */
export function BarraApilada<K extends string>({ conteos, orden, etiqueta, tono, onElegir, etiquetaAccesible }: Props<K>) {
  const { total, segmentos } = segmentosBarra(conteos, orden);
  return (
    <View style={styles.contenedor}>
      <View style={styles.barra} accessible accessibilityRole="image" accessibilityLabel={`${etiquetaAccesible}, ${total} en total`}>
        {segmentos.map((s) => (
          <View key={s.clave} style={{ flexGrow: s.cantidad, flexBasis: 0, minWidth: 6, backgroundColor: tono(s.clave).punto }} />
        ))}
      </View>
      <View style={styles.leyenda}>
        {orden.map((k) => {
          const n = conteos[k] ?? 0;
          const fila = (
            <>
              <ChipEstado etiqueta={etiqueta(k)} tono={tono(k)} />
              <Text style={styles.cifra}>
                {n}
                <Text style={styles.porcentaje}>{total > 0 ? `  ${Math.round((n / total) * 100)} %` : ''}</Text>
              </Text>
            </>
          );
          return onElegir ? (
            <Pressable
              key={k}
              onPress={() => onElegir(k)}
              accessibilityRole="button"
              accessibilityLabel={`${etiqueta(k)}: ${n}`}
              style={({ pressed }) => [styles.fila, pressed && styles.presionada]}
            >
              {fila}
            </Pressable>
          ) : (
            <View key={k} style={styles.fila} accessible accessibilityLabel={`${etiqueta(k)}: ${n}`}>
              {fila}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.gutter },
  barra: { flexDirection: 'row', height: 14, gap: 2, borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.track },
  leyenda: { gap: spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, borderRadius: radius.md, paddingHorizontal: 4 },
  presionada: { backgroundColor: colors.pressedOverlay },
  cifra: { ...typography.titleMd, fontFamily: typography.display.fontFamily, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  porcentaje: { ...typography.labelMd, color: colors.textMuted },
});
