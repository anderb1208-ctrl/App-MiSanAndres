import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { colors, motion, spacing } from '../theme';
import { pestanaDeInicio } from '../utils/navegacion';
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
  imagen: { velo: colors.glassDark, icono: colors.white, tinte: 'dark' as const },
  claro: { velo: colors.glass, icono: colors.textStrong, tinte: 'light' as const },
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
        style={styles.boton}
      >
        {/* El desenfoque real va en iOS; en Android basta el velo translúcido (sin BlurTargetView). */}
        {Platform.OS === 'ios' && <BlurView intensity={30} tint={v.tinte} style={StyleSheet.absoluteFill} />}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: v.velo }]} />
        <Icon name="arrow-back" size={22} color={v.icono} />
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
