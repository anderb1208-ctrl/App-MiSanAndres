import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Destino } from '../services/tipos';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { descripcionBreve } from '../utils/contenido';
import { formatearPrecio } from '../utils/presupuesto';
import { textoOcupacion } from '../utils/ocupacion';
import { BotonFavorito } from './BotonFavorito';
import { GlassPanel } from './GlassPanel';
import { Icon } from './Icon';
import { ImagenDestino } from './ImagenDestino';
import { OcupacionCompacta } from './OcupacionCompacta';
import { PressableScale } from './PressableScale';

interface Props {
  destino: Destino;
  /** featured: foto completa con leyenda (carrusel); list: miniatura y datos. */
  layout?: 'featured' | 'list';
  /** Línea extra (ubicación en Explorar, avisos en Favoritos…). */
  nota?: string;
  /** Compatibilidad ("92% compatible"): arriba a la izquierda en el carrusel, junto al nombre en la lista. */
  destacado?: string;
  /** Muestra la descripción breve del lugar (tarjetas de Inicio). */
  conDescripcion?: boolean;
  /** UNA frase corta de por qué se recomienda (una línea; el detalle completo va en la pantalla del lugar). */
  porQueCorto?: string;
  onPress: () => void;
  /** Oculta el corazón de favorito. */
  sinFavorito?: boolean;
  style?: StyleProp<ViewStyle>;
}

const cerrado = (d: Destino) => d.estado === 'cerrado_temporal';

/** DestinoCard: tarjeta de destino con la ocupación compartida (OcupacionCompacta). */
export function DestinoCard({ destino, layout = 'list', nota, destacado, conDescripcion, porQueCorto, onPress, sinFavorito, style }: Props) {
  const categoria = CATEGORIAS[destino.categoria];
  const precio = destino.precio ? `${formatearPrecio(destino.precio)}${destino.precio.estimado ? ' · Estimado' : ''}` : null;
  const descripcion = conDescripcion ? descripcionBreve(destino.descripcion) : null;
  const accesible = [
    destino.nombre,
    categoria.singular,
    destacado,
    textoOcupacion(destino.ocupacionActual).accesible,
    precio ? `Precio por persona: ${precio}` : null,
    descripcion,
    porQueCorto ? `Por qué: ${porQueCorto}` : null,
    nota,
  ]
    .filter(Boolean)
    .join('. ');

  if (layout === 'featured') {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accesible}
        style={[styles.featured, shadows.md, style]}
      >
        <ImagenDestino destino={destino} style={StyleSheet.absoluteFill} tamanoIcono={56} />
        <LinearGradient colors={colors.scrimBottom} locations={[0.3, 0.62, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.featuredArriba}>
          {destacado ? (
            <View style={styles.compatibilidad}>
              <Icon name="auto-awesome" size={14} color={colors.secondary} />
              <Text style={styles.compatibilidadTexto} numberOfLines={1}>
                {destacado}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {!sinFavorito && <BotonFavorito destino={destino} tono="glass" tamano={20} />}
        </View>
        <GlassPanel tono="dark" padding={14} radius={18} style={styles.featuredLeyenda}>
          <Text style={styles.featuredMeta} numberOfLines={1}>
            {categoria.singular}
            {cerrado(destino) ? ' • Cerrado temporalmente' : ''}
          </Text>
          <Text style={styles.featuredNombre} numberOfLines={1}>
            {destino.nombre}
          </Text>
          {descripcion ? (
            <Text style={styles.featuredDescripcion} numberOfLines={2}>
              {descripcion}
            </Text>
          ) : null}
          {porQueCorto ? (
            <View style={styles.porQue}>
              <Icon name="thumb-up-off-alt" size={13} color={colors.secondaryContainer} />
              <Text style={styles.featuredPorQue} numberOfLines={1}>
                {porQueCorto}
              </Text>
            </View>
          ) : null}
          {nota ? (
            <Text style={styles.featuredDescripcion} numberOfLines={2}>
              {nota}
            </Text>
          ) : null}
          {/* Fila de información: precio y ocupación. Si no caben, la ocupación baja de línea. */}
          <View style={styles.featuredInfo}>
            {precio ? (
              <Text style={styles.featuredPrecio} numberOfLines={1}>
                {precio}
              </Text>
            ) : null}
            <OcupacionCompacta ocupacion={destino.ocupacionActual} sobreOscuro />
          </View>
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
          {/* Metadatos: categoría y ocupación como chip; pasan a otra línea en pantallas angostas. */}
          <View style={styles.metadatos}>
            <View style={styles.meta}>
              <Icon name={categoria.icono} size={14} color={colors.secondary} />
              <Text style={styles.metaTexto} numberOfLines={1}>
                {categoria.singular}
                {cerrado(destino) ? ' • Cerrado temporalmente' : ''}
              </Text>
            </View>
            <OcupacionCompacta ocupacion={destino.ocupacionActual} variante="chip" />
          </View>
          {precio ? (
            <View style={styles.meta}>
              <Icon name="payments" size={14} color={colors.secondary} />
              <Text style={styles.metaTexto} numberOfLines={1}>
                {precio}
              </Text>
            </View>
          ) : null}
          {descripcion ? (
            <Text style={styles.descripcion} numberOfLines={2}>
              {descripcion}
            </Text>
          ) : null}
          {porQueCorto ? (
            <View style={styles.porQue}>
              <Icon name="thumb-up-off-alt" size={13} color={colors.secondary} />
              <Text style={styles.porQueTexto} numberOfLines={1}>
                {porQueCorto}
              </Text>
            </View>
          ) : null}
          {nota ? (
            <Text style={styles.nota} numberOfLines={2}>
              {nota}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  featured: {
    height: 320,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: colors.navy950,
    justifyContent: 'space-between',
    padding: spacing.gutter,
  },
  featuredArriba: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  compatibilidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.glassStrong,
  },
  compatibilidadTexto: { ...typography.labelBold, color: colors.secondary, flexShrink: 1 },
  corazon: { marginTop: -8, marginRight: -8 },
  featuredLeyenda: { gap: 3 },
  featuredMeta: { ...typography.labelMd, color: colors.textOnDarkMuted },
  featuredNombre: { ...typography.headlineSm, color: colors.white },
  featuredDescripcion: { ...typography.bodyMd, color: colors.textOnDarkMuted },
  porQue: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredPorQue: { ...typography.labelBold, color: colors.secondaryContainer, flex: 1 },
  featuredInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    rowGap: 4,
    marginTop: 4,
  },
  featuredPrecio: { ...typography.labelBold, color: colors.white, flexShrink: 1 },

  fila: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  miniatura: { width: 84, height: 84, borderRadius: radius.lg, backgroundColor: colors.surfaceLow },
  info: { flex: 1, gap: 6 },
  filaNombre: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nombre: { ...typography.titleMd, color: colors.textStrong, flexShrink: 1 },
  destacado: { ...typography.labelBold, color: colors.secondary },
  metadatos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm, rowGap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaTexto: { ...typography.labelMd, color: colors.textMuted, flexShrink: 1 },
  descripcion: { ...typography.bodyMd, color: colors.textMuted },
  porQueTexto: { ...typography.labelBold, color: colors.secondary, flex: 1 },
  nota: { ...typography.bodyMd, color: colors.textMuted },
});
