import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { colors, motion, spacing } from '../theme';
import { pestanaDeInicio } from '../utils/navegacion';
import { GlassControl } from './GlassControl';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/** Diámetro del botón (área táctil mínima de 44 × 44). */
export const TAMANO_BOTON_VOLVER = 44;
/** Espacio que deja a su derecha un título que comparte la fila con el botón. */
export const SANGRIA_BOTON_VOLVER = TAMANO_BOTON_VOLVER + spacing.gutter;

interface Props {
  /**
   * imagen: sobre una foto (fondo oscuro translúcido, ícono blanco).
   * claro: sobre fondo claro (fondo blanco translúcido, ícono oscuro).
   */
  variante?: 'imagen' | 'claro';
  style?: StyleProp<ViewStyle>;
}

const VARIANTES = {
  imagen: { tono: 'oscuro' as const, icono: colors.white },
  claro: { tono: 'claro' as const, icono: colors.textStrong },
};

/**
 * Botón flotante de regresar de las pantallas secundarias: círculo esmerilado en la esquina
 * superior izquierda (respeta el área segura). Vuelve atrás y, si no hay historial, a la
 * pestaña de inicio del rol. El gesto nativo de deslizar desde el borde sigue funcionando.
 */
export function BotonVolver({ variante = 'claro', style }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const insets = useSafeAreaInsets();
  const { rol } = useAuth();
  const v = VARIANTES[variante];

  const volver = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs', { screen: pestanaDeInicio(rol) });
  };

  return (
    <View pointerEvents="box-none" style={[styles.posicion, { top: insets.top + spacing.sm, left: Math.max(insets.left, spacing.screen) }, style]}>
      <PressableScale
        onPress={volver}
        escala={motion.pressScale.icon}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}
      >
        {/* Liquid Glass en iOS 26+; desenfoque en iOS anterior; velo translúcido en Android. */}
        <GlassControl tono={v.tono} conSombra={false} style={styles.boton}>
          <Icon name="arrow-back" size={22} color={v.icono} />
        </GlassControl>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  posicion: { position: 'absolute', zIndex: 20 },
  boton: {
    width: TAMANO_BOTON_VOLVER,
    height: TAMANO_BOTON_VOLVER,
    borderRadius: TAMANO_BOTON_VOLVER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
