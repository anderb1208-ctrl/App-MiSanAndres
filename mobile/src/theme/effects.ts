import type { ViewStyle } from 'react-native';

/**
 * Sombras difusas con tinte navy. En Android se aproxima con `elevation`.
 */
const sombra = (y: number, blur: number, opacidad: number, elevation: number): ViewStyle => ({
  shadowColor: '#001430',
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacidad,
  shadowRadius: blur / 2,
  elevation,
});

export const shadows = {
  /** Reposo. */
  sm: sombra(4, 20, 0.06, 2),
  /** Tarjetas y paneles glass. */
  md: sombra(8, 32, 0.12, 4),
  /** Overlays y barras flotantes. */
  lg: sombra(10, 30, 0.16, 8),
} as const;

export const motion = {
  /** Escala al presionar. */
  pressScale: { button: 0.98, chip: 0.95, icon: 0.92 },
  duration: { fast: 150, base: 220, slow: 500 },
} as const;

/** Intensidad de desenfoque de las superficies glass (iOS). */
export const blur = { panel: 40, bar: 50 } as const;
