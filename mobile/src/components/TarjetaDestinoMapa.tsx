import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { DestinoMapa } from '../services/tipos';
import { colors, radius, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { formatearDistancia } from '../utils/distancia';
import { Button } from './Button';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { ImagenDestino } from './ImagenDestino';
import { IndicadorOcupacion } from './IndicadorOcupacion';
import { SuperficieVidrio } from './SuperficieVidrio';

interface Props {
  destino: DestinoMapa;
  /** Distancia al usuario, km (null sin ubicación). */
  km: number | null;
  onVerDetalle: () => void;
  onCerrar: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Tarjeta del destino seleccionado en el mapa: foto, nombre, categoría, ocupación y "Ver detalle". */
export function TarjetaDestinoMapa({ destino, km, onVerDetalle, onCerrar, style }: Props) {
  const categoria = CATEGORIAS[destino.categoria];
  return (
    // Flota sobre el mapa: vidrio real en iOS 26+. Velo blanco fuerte para que el texto se lea
    // sobre cualquier zona del mapa. La ocupación de adentro no es vidrio (nada de vidrio sobre vidrio).
    <SuperficieVidrio
      variante="tarjeta"
      sombra="lg"
      tinte={{ fondo: colors.glassStrong, borde: colors.glassBorder }}
      style={[styles.tarjeta, style]}
    >
      <View style={styles.fila}>
        <ImagenDestino destino={destino} style={styles.foto} tamanoIcono={26} />
        <View style={styles.info}>
          <Text style={styles.nombre} numberOfLines={2}>
            {destino.nombre}
          </Text>
          <View style={styles.meta}>
            <Icon name={categoria.icono} size={14} color={colors.secondary} />
            <Text style={styles.metaTexto} numberOfLines={1}>
              {categoria.singular}
              {km !== null ? ` · a ${formatearDistancia(km)}` : ''}
            </Text>
          </View>
          <IndicadorOcupacion ocupacion={destino.ocupacion} mostrarPorcentaje />
        </View>
        <IconButton icono="close" etiqueta="Cerrar" tono="glass" onPress={onCerrar} style={styles.cerrar} />
      </View>
      <Button iconoDerecha="arrow-forward" onPress={onVerDetalle} style={styles.boton}>
        Ver detalle
      </Button>
    </SuperficieVidrio>
  );
}

const styles = StyleSheet.create({
  tarjeta: { padding: 12, borderRadius: radius.xl },
  fila: { flexDirection: 'row', gap: spacing.gutter, alignItems: 'flex-start' },
  foto: { width: 84, height: 84, borderRadius: radius.lg },
  info: { flex: 1, gap: 6 },
  nombre: { ...typography.titleMd, color: colors.textStrong },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTexto: { ...typography.labelMd, color: colors.textMuted, flexShrink: 1 },
  cerrar: { marginTop: -4, marginRight: -4 },
  boton: { marginTop: spacing.gutter },
});
