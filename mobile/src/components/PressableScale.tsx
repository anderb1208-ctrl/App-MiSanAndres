import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { brilloPresion, motion } from '../theme';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar (0.98 botones, 0.95 chips, 0.92 botones de icono). */
  escala?: number;
  /**
   * Brillo al presionar: capa blanca suave encima del contenido, con este radio de borde.
   * Va encima del vidrio como hermana, así nunca se baja la opacidad de la superficie de vidrio.
   */
  brillo?: number;
}

/** Pressable con la animación de presión de la referencia: escala suave (y brillo opcional), sin rebote. */
export function PressableScale({ children, style, escala = motion.pressScale.button, brillo, disabled, ...resto }: Props) {
  const valor = useRef(new Animated.Value(0)).current;
  const animar = (a: number) =>
    Animated.timing(valor, { toValue: a, duration: motion.duration.fast, useNativeDriver: true }).start();
  const scale = valor.interpolate({ inputRange: [0, 1], outputRange: [1, escala] });

  return (
    <Pressable
      {...resto}
      disabled={disabled}
      onPressIn={(e) => {
        animar(1);
        resto.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animar(0);
        resto.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
        {brillo !== undefined && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: brillo, backgroundColor: brilloPresion.color, opacity: Animated.multiply(valor, brilloPresion.opacidad) },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}
