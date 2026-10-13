import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { DestinoMapa } from '../services/tipos';
import { colors, mapColors, shadows } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { colorMarcador, ETIQUETA_MARCADOR, estadoMarcador } from '../utils/mapa';
import { Icon } from './Icon';

interface Props {
  destino: DestinoMapa;
  seleccionado: boolean;
  onPress: (id: number) => void;
}

/**
 * Marcador de un destino: el color es la ocupación predicha (Bajo, Medio, Alto, Cerrado)
 * y el ícono, la categoría. Lleva una vista propia en vez del pin por defecto.
 */
function MarcadorDestinoBase({ destino, seleccionado, onPress }: Props) {
  const estado = estadoMarcador(destino.ocupacion);
  const categoria = CATEGORIAS[destino.categoria];

  // En Android, una vista propia se dibuja como imagen: hay que seguir sus cambios hasta
  // que el ícono (fuente) se pinte y luego congelarla para no redibujar en cada frame.
  const [seguirCambios, setSeguirCambios] = useState(true);
  useEffect(() => {
    setSeguirCambios(true);
    const id = setTimeout(() => setSeguirCambios(false), 600);
    return () => clearTimeout(id);
  }, [estado, seleccionado]);

  return (
    <Marker
      identifier={String(destino.id)}
      coordinate={{ latitude: destino.latitud, longitude: destino.longitud }}
      onPress={() => onPress(destino.id)}
      tracksViewChanges={seguirCambios}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={seleccionado ? 10 : 1}
      accessibilityLabel={`${destino.nombre}, ${categoria.singular}, ocupación ${ETIQUETA_MARCADOR[estado]}`}
    >
      <View
        style={[
          styles.circulo,
          seleccionado && styles.seleccionado,
          { backgroundColor: colorMarcador(estado) },
        ]}
      >
        <Icon name={categoria.icono} size={seleccionado ? 22 : 18} color={colors.white} />
      </View>
    </Marker>
  );
}

export const MarcadorDestino = memo(MarcadorDestinoBase);

const styles = StyleSheet.create({
  circulo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: mapColors.borde,
    ...shadows.md,
  },
  seleccionado: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
});
