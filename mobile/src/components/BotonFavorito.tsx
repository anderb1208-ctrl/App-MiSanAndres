import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Destino } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { useFavoritos } from '../store/FavoritosContext';
import { colors, motion, sizes } from '../theme';
import { SuperficieVidrio } from './SuperficieVidrio';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

interface Props {
  destino: Pick<Destino, 'id' | 'nombre'>;
  /** glass: sobre una foto; claro: sobre fondo claro. */
  tono?: 'glass' | 'claro';
  tamano?: number;
  style?: StyleProp<ViewStyle>;
}

/** Corazón para marcar o quitar un favorito (solo turistas: el resto no tiene favoritos). */
export function BotonFavorito({ destino, tono = 'claro', tamano = 22, style }: Props) {
  const { rol } = useAuth();
  const { esFavorito, alternar } = useFavoritos();
  const [ocupado, setOcupado] = useState(false);
  if (rol !== 'turista') return null;
  const marcado = esFavorito(destino.id);

  const alPresionar = async () => {
    setOcupado(true);
    try {
      await alternar(destino);
    } catch (e) {
      Alert.alert('No se pudo actualizar tus favoritos', (e as Error).message);
    } finally {
      setOcupado(false);
    }
  };

  const accesibilidad = {
    accessibilityRole: 'button' as const,
    accessibilityState: { selected: marcado, busy: ocupado },
    accessibilityLabel: marcado ? `Quitar ${destino.nombre} de favoritos` : `Agregar ${destino.nombre} a favoritos`,
  };
  const icono = (
    <View style={{ width: tamano, height: tamano, alignItems: 'center', justifyContent: 'center' }}>
      {ocupado ? (
        <ActivityIndicator size="small" color={tono === 'glass' ? colors.white : colors.secondary} />
      ) : (
        <Icon
          name={marcado ? 'favorite' : 'favorite-border'}
          size={tamano}
          color={marcado ? colors.error : tono === 'glass' ? colors.white : colors.textMuted}
        />
      )}
    </View>
  );

  // Botón flotante sobre una foto: vidrio oscuro. Al presionar escala (la opacidad rompe Liquid Glass).
  if (tono === 'glass') {
    const lado = Math.max(sizes.touch, tamano + 16);
    return (
      <View pointerEvents="box-none" style={style}>
        <PressableScale onPress={() => void alPresionar()} disabled={ocupado} hitSlop={8} escala={motion.pressScale.icon} {...accesibilidad}>
          <SuperficieVidrio variante="chip" tono="oscuro" style={[styles.glass, { width: lado, height: lado }]}>
            {icono}
          </SuperficieVidrio>
        </PressableScale>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => void alPresionar()}
      disabled={ocupado}
      hitSlop={10}
      {...accesibilidad}
      style={({ pressed }) => [styles.boton, pressed && styles.presionado, style]}
    >
      {icono}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { padding: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  glass: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  presionado: { opacity: 0.7 },
});
