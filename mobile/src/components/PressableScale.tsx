import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../theme';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar (0.98 botones, 0.95 chips, 0.92 botones de icono). */
  escala?: number;
}

/** Pressable con la animación de presión de la referencia: escala suave, sin rebote. */
export function PressableScale({ children, style, escala = motion.pressScale.button, disabled, ...resto }: Props) {
  const valor = useRef(new Animated.Value(1)).current;
  const animar = (a: number) =>
    Animated.timing(valor, { toValue: a, duration: motion.duration.fast, useNativeDriver: true }).start();

  return (
    <Pressable
      {...resto}
      disabled={disabled}
      onPressIn={(e) => {
        animar(escala);
        resto.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animar(1);
        resto.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale: valor }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
