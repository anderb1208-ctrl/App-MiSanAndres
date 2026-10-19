import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { SANGRIA_BOTON_VOLVER } from './BotonVolver';
import { IconButton } from './IconButton';

interface Accion {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
}

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Deja libre la esquina izquierda para el BotonVolver flotante. */
  conBotonVolver?: boolean;
  acciones?: Accion[];
}

/** Encabezado grande de pantalla ("Mi perfil", "Explorar destinos"…). */
export function ScreenHeader({ titulo, subtitulo, conBotonVolver = false, acciones = [] }: Props) {
  return (
    <View style={[styles.contenedor, conBotonVolver && styles.conBotonVolver]}>
      <View style={styles.textos}>
        <Text style={styles.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {acciones.map((a) => (
        <IconButton key={a.etiqueta} icono={a.icono} etiqueta={a.etiqueta} onPress={a.onPress} />
      ))}
    </View>
  );
}

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
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  // El título empieza después del botón flotante (16 + 44 + 12) y queda centrado con él.
  conBotonVolver: { paddingLeft: spacing.screen + SANGRIA_BOTON_VOLVER, minHeight: 44 + spacing.sm + spacing.md },
  textos: { flex: 1, gap: 2 },
  titulo: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted },
  seccion: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.gutter, marginBottom: spacing.gutter },
  seccionTitulo: { ...typography.headlineSm, color: colors.textStrong },
  accion: { ...typography.labelBold, fontSize: 13, color: colors.textLink, paddingBottom: 4 },
  overline: { ...typography.overline, color: colors.textMuted },
});
