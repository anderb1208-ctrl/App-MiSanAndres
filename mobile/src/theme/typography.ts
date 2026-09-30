import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import type { TextStyle } from 'react-native';

/** Fuentes que se cargan al iniciar la app (useFonts). */
export const fontAssets = {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
};

/** Hanken Grotesk es la única familia. En RN cada peso es una fuente distinta. */
export const fonts = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
} as const;

/** Escala tipográfica de la referencia (tamaño / alto de línea). */
export const typography = {
  hero: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 48, letterSpacing: -1.3 },
  display: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headlineMd: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 32 },
  headlineSm: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 28 },
  titleMd: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  labelMd: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  labelBold: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  /** Etiqueta de sección en mayúsculas ("CATEGORÍAS DE INTERÉS"). */
  overline: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
} satisfies Record<string, TextStyle>;
