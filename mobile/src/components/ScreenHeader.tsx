/** Títulos de sección. El encabezado de pantalla está en EncabezadoPantalla. */
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

/** Título de sección con acción opcional a la derecha. */
export function SectionHeader({
  titulo,
  subtitulo,
  accion,
}: {
  titulo: string;
  subtitulo?: string;
  accion?: { texto: string; onPress: () => void };
}) {
  return (
    <View style={styles.seccion}>
      <View style={styles.textos}>
        <Text style={styles.seccionTitulo} accessibilityRole="header">
          {titulo}
        </Text>
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {accion && (
        <Text style={styles.accion} onPress={accion.onPress} accessibilityRole="button" suppressHighlighting>
          {accion.texto}
        </Text>
      )}
    </View>
  );
}

/** Etiqueta de sección en mayúsculas ("CATEGORÍAS DE INTERÉS"). */
export function Overline({ children }: { children: string }) {
  return <Text style={styles.overline}>{children}</Text>;
}

const styles = StyleSheet.create({
  textos: { flex: 1, gap: 2 },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted },
  seccion: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.gutter, marginBottom: spacing.gutter },
  seccionTitulo: { ...typography.headlineSm, color: colors.textStrong },
  accion: { ...typography.labelBold, fontSize: 13, color: colors.textLink, paddingBottom: 4 },
  overline: { ...typography.overline, color: colors.textMuted },
});
