import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, sizes } from '../theme';
import { Icon } from './Icon';

interface Props {
  /** Hay al menos un aviso (apertura o cierre) activo. */
  activo: boolean;
  /** Resumen que lee el lector de pantalla ("Te avisamos cuando abra"). */
  resumen: string;
  onPress: () => void;
}

/** Campana de alertas de un favorito: rellena y en turquesa si hay avisos activos. Área táctil de 44 × 44. */
export function BotonAlertas({ activo, resumen, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Alertas"
      accessibilityState={{ selected: activo }}
      accessibilityValue={{ text: resumen }}
      style={({ pressed }) => [styles.area, pressed && styles.presionado]}
    >
      <View style={[styles.circulo, activo && styles.circuloActivo]}>
        <Icon
          name={activo ? 'notifications-active' : 'notifications-none'}
          size={sizes.iconSm}
          color={activo ? colors.secondary : colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: { width: sizes.touch, height: sizes.touch, alignItems: 'center', justifyContent: 'center' },
  presionado: { transform: [{ scale: 0.92 }] },
  circulo: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  circuloActivo: { backgroundColor: colors.secondarySoft },
});
