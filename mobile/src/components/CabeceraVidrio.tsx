import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducirMovimiento } from '../hooks/useReducirMovimiento';
import { colors, motion, spacing, typography } from '../theme';
import { SANGRIA_BOTON_VOLVER, TAMANO_BOTON_VOLVER } from './BotonVolver';
import { SuperficieVidrio } from './SuperficieVidrio';

/** Alto total de la cabecera (incluye el área segura superior). */
export const altoCabeceraVidrio = (insetSuperior: number) => insetSuperior + spacing.sm + TAMANO_BOTON_VOLVER + spacing.sm;

interface Props {
  titulo: string;
  visible: boolean;
}

/**
 * Cabecera de vidrio que entra desde arriba cuando la foto del detalle sale de pantalla.
 * Liquid Glass en iOS 26+; desenfoque en iOS anterior; velo translúcido en Android (SuperficieVidrio).
 * Se anima con translateY y nunca con opacidad (la opacidad rompe Liquid Glass).
 * Los botones flotantes (volver, favorito) quedan encima. El título repite el nombre que ya
 * está en el contenido, así que se oculta a los lectores de pantalla.
 */
export function CabeceraVidrio({ titulo, visible }: Props) {
  const insets = useSafeAreaInsets();
  const reducirMovimiento = useReducirMovimiento();
  const alto = altoCabeceraVidrio(insets.top);
  const progreso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: visible ? 1 : 0,
      duration: reducirMovimiento ? 0 : visible ? motion.duration.base : motion.duration.fast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, reducirMovimiento, progreso]);

  const translateY = progreso.interpolate({ inputRange: [0, 1], outputRange: [-alto - 1, 0] });
  const margen = Math.max(insets.left, spacing.screen) + SANGRIA_BOTON_VOLVER;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.posicion, { height: alto, transform: [{ translateY }] }]}
    >
      <SuperficieVidrio variante="panel" sombra={false} style={[styles.vidrio, { paddingTop: insets.top + spacing.sm }]}>
        <View style={[styles.fila, { paddingHorizontal: margen }]}>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
        </View>
      </SuperficieVidrio>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  posicion: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4 },
  vidrio: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fila: { height: TAMANO_BOTON_VOLVER, justifyContent: 'center' },
  titulo: { ...typography.titleMd, color: colors.textStrong, textAlign: 'center' },
});
