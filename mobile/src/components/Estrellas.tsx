import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Icon } from './Icon';

interface Props {
  valor: number;
  /** Si se pasa, las estrellas se pueden tocar (1 a 5). */
  onCambio?: (estrellas: number) => void;
  tamano?: number;
}

/** Estrellas de calificación: solo lectura (admite medias) o para elegir de 1 a 5. */
export function Estrellas({ valor, onCambio, tamano = 18 }: Props) {
  return (
    <View
      style={styles.fila}
      accessible={!onCambio}
      accessibilityLabel={!onCambio ? `${valor.toString().replace('.', ',')} de 5 estrellas` : undefined}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const nombre = valor >= n ? 'star' : valor >= n - 0.5 ? 'star-half' : 'star-border';
        const icono = <Icon name={nombre} size={tamano} color={colors.estrella} />;
        if (!onCambio) return <View key={n}>{icono}</View>;
        return (
          <Pressable
            key={n}
            onPress={() => onCambio(n)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            accessibilityState={{ selected: valor === n }}
          >
            {icono}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 2 },
});
