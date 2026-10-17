import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Destino } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { useFavoritos } from '../store/FavoritosContext';
import { colors } from '../theme';
import { Icon } from './Icon';

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

  return (
    <Pressable
      onPress={() => void alPresionar()}
      disabled={ocupado}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: marcado, busy: ocupado }}
      accessibilityLabel={marcado ? `Quitar ${destino.nombre} de favoritos` : `Agregar ${destino.nombre} a favoritos`}
      style={({ pressed }) => [styles.boton, tono === 'glass' ? styles.glass : styles.claro, pressed && styles.presionado, style]}
    >
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { padding: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  glass: { backgroundColor: colors.glassDark, borderWidth: 1, borderColor: colors.glassBorderDark },
  claro: { backgroundColor: 'transparent' },
  presionado: { opacity: 0.7 },
});
