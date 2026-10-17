import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Destino } from '../services/tipos';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { BotonFavorito } from './BotonFavorito';
import { GlassPanel } from './GlassPanel';
import { Icon } from './Icon';
import { ImagenDestino } from './ImagenDestino';
import { IndicadorOcupacion } from './IndicadorOcupacion';
import { PressableScale } from './PressableScale';

interface Props {
  destino: Destino;
  /** featured: foto completa con leyenda; horizontal/list: miniatura y datos. */
  layout?: 'featured' | 'list';
  /** Línea extra (razón de la recomendación, ubicación…). */
  nota?: string;
  /** Texto destacado a la derecha del nombre (p. ej. "92%" de compatibilidad). */
  destacado?: string;
  onPress: () => void;
  /** Oculta el corazón de favorito. */
  sinFavorito?: boolean;
  style?: StyleProp<ViewStyle>;
}

const cerrado = (d: Destino) => d.estado === 'cerrado_temporal';

/** DestinoCard: tarjeta de destino con su IndicadorOcupacion. */
export function DestinoCard({ destino, layout = 'list', nota, destacado, onPress, sinFavorito, style }: Props) {
  const categoria = CATEGORIAS[destino.categoria];
  const accesible = `${destino.nombre}, ${categoria.singular}${nota ? `. ${nota}` : ''}`;

  if (layout === 'featured') {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accesible}
        style={[styles.featured, shadows.md, style]}
      >
        <ImagenDestino destino={destino} style={StyleSheet.absoluteFill} tamanoIcono={56} />
        <LinearGradient colors={colors.scrimBottom} locations={[0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.featuredArriba}>
          <IndicadorOcupacion ocupacion={destino.ocupacionActual} mostrarPorcentaje />
          <View style={styles.featuredAcciones}>
            {destacado && (
              <View style={styles.featuredDestacado}>
                <Text style={styles.featuredDestacadoTexto}>{destacado}</Text>
              </View>
            )}
            {!sinFavorito && <BotonFavorito destino={destino} tono="glass" tamano={20} />}
          </View>
        </View>
        <GlassPanel tono="dark" padding={14} radius={18} style={styles.featuredLeyenda}>
          <Text style={styles.featuredMeta}>
            {categoria.singular}
            {cerrado(destino) ? ' • Cerrado temporalmente' : ''}
          </Text>
          <Text style={styles.featuredNombre} numberOfLines={1}>
            {destino.nombre}
          </Text>
          {nota ? (
            <Text style={styles.featuredNota} numberOfLines={2}>
              {nota}
            </Text>
          ) : null}
        </GlassPanel>
      </PressableScale>
    );
  }

  return (
    <GlassPanel tono="strong" padding={12} radius={radius.xl} onPress={onPress} accessibilityLabel={accesible} style={style}>
      <View style={styles.fila}>
        <ImagenDestino destino={destino} style={styles.miniatura} tamanoIcono={26} />
        <View style={styles.info}>
          <View style={styles.filaNombre}>
            <Text style={styles.nombre} numberOfLines={1}>
              {destino.nombre}
            </Text>
            {destacado && <Text style={styles.destacado}>{destacado}</Text>}
            {!sinFavorito && <BotonFavorito destino={destino} tamano={20} style={styles.corazon} />}
          </View>
          <View style={styles.meta}>
            <Icon name={categoria.icono} size={14} color={colors.secondary} />
            <Text style={styles.metaTexto} numberOfLines={1}>
              {categoria.singular}
              {cerrado(destino) ? ' • Cerrado temporalmente' : ''}
            </Text>
          </View>
          {nota ? (
            <Text style={styles.nota} numberOfLines={2}>
              {nota}
            </Text>
          ) : null}
          <IndicadorOcupacion ocupacion={destino.ocupacionActual} mostrarPorcentaje />
        </View>
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  featured: {
    height: 300,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.navy950,
    justifyContent: 'space-between',
    padding: spacing.gutter,
  },
  featuredArriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  featuredAcciones: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  corazon: { marginTop: -8, marginRight: -8 },
  featuredDestacado: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.glassStrong,
  },
  featuredDestacadoTexto: { ...typography.labelBold, color: colors.secondary },
  featuredLeyenda: { gap: 2 },
  featuredMeta: { ...typography.labelMd, color: colors.textOnDarkMuted },
  featuredNombre: { ...typography.headlineSm, color: colors.white },
  featuredNota: { ...typography.bodyMd, color: colors.textOnDarkMuted },

  fila: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  miniatura: { width: 84, height: 84, borderRadius: radius.lg, backgroundColor: colors.surfaceLow },
  info: { flex: 1, gap: 6 },
  filaNombre: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nombre: { ...typography.titleMd, color: colors.textStrong, flexShrink: 1 },
  destacado: { ...typography.labelBold, color: colors.secondary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTexto: { ...typography.labelMd, color: colors.textSubtle, flexShrink: 1 },
  nota: { ...typography.bodyMd, color: colors.textMuted },
});
