import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { CategoriaDestino } from '../services/tipos';
import { colors, mapColors, radius, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { DELTA_CERCANO, PROVEEDOR_MAPA } from '../utils/mapa';
import { Icon } from './Icon';

interface Props {
  nombre: string;
  categoria: CategoriaDestino;
  latitud: number;
  longitud: number;
  /** Al tocar el mapa (p. ej. abrir la pestaña Mapa con este destino). */
  onPress: () => void;
}

/**
 * Mapa pequeño y fijo con la ubicación del destino. En Android usa el modo "lite"
 * (una imagen estática, más liviana dentro de un scroll).
 */
export function MiniMapa({ nombre, categoria, latitud, longitud, onPress }: Props) {
  const [listo, setListo] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Mapa con la ubicación de ${nombre}. Toca para abrir el mapa de la isla.`}
      style={styles.contenedor}
    >
      <MapView
        provider={PROVEEDOR_MAPA}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: latitud, longitude: longitud, ...DELTA_CERCANO }}
        liteMode={Platform.OS === 'android'}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        onMapReady={() => setListo(true)}
        pointerEvents="none"
      >
        <Marker coordinate={{ latitude: latitud, longitude: longitud }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={!listo}>
          <View style={styles.marcador}>
            <Icon name={CATEGORIAS[categoria].icono} size={18} color={colors.white} />
          </View>
        </Marker>
      </MapView>
      <View style={styles.etiqueta}>
        <Icon name="open-in-full" size={14} color={colors.textStrong} />
        <Text style={styles.etiquetaTexto}>Ver en el mapa</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    height: 170,
    borderRadius: radius.panel,
    overflow: 'hidden',
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  marcador: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    borderWidth: 2.5,
    borderColor: mapColors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiqueta: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.glassStrong,
  },
  etiquetaTexto: { ...typography.labelBold, fontSize: 12, color: colors.textStrong },
});
