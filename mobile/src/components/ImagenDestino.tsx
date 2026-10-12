import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Destino } from '../services/tipos';
import { colors, placeholderColors } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { fuenteImagenRemota } from '../utils/imagenes';
import { Icon } from './Icon';

interface Props {
  destino: Pick<Destino, 'nombre' | 'categoria' | 'imagenUrl'>;
  style?: StyleProp<ViewStyle>;
  /** Tamaño del ícono del placeholder. */
  tamanoIcono?: number;
}

/**
 * Foto del destino. Si no tiene imagen o no carga, muestra un placeholder con el
 * degradado y el ícono de su categoría.
 */
export function ImagenDestino({ destino, style, tamanoIcono = 40 }: Props) {
  const url = destino.imagenUrl;
  // Se guarda la URL que falló: si el destino cambia de foto, se vuelve a intentar.
  const [urlFallida, setUrlFallida] = useState<string | null>(null);

  if (url && url !== urlFallida) {
    return (
      <View style={[styles.contenedor, style]}>
        <Image
          source={fuenteImagenRemota(url)}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel={destino.nombre}
          onError={() => setUrlFallida(url)}
        />
      </View>
    );
  }

  const categoria = CATEGORIAS[destino.categoria];
  return (
    <View style={[styles.contenedor, style]} accessible accessibilityLabel={`${destino.nombre}, sin foto`}>
      <LinearGradient
        colors={placeholderColors[destino.categoria]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.circulo}>
        <Icon name={categoria.icono} size={tamanoIcono} color={colors.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { overflow: 'hidden', backgroundColor: colors.navy950, alignItems: 'center', justifyContent: 'center' },
  circulo: {
    padding: '12%',
    borderRadius: 999,
    backgroundColor: colors.glassDark,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
  },
});
