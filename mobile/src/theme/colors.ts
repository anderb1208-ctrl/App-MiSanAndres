/**
 * Paleta "Caribbean Horizon" (Sea of Seven Colors), extraída de la referencia visual.
 * Navy para marca y acciones principales, turquesa para estados interactivos,
 * arena como complemento cálido y neutros fríos para el texto.
 */
const palette = {
  navy950: '#001430',
  navy900: '#001b3d',
  navy800: '#002855',
  navy100: '#d6e3ff',

  turq800: '#004e5f',
  turq700: '#005c70',
  turq600: '#00677d',
  turq300: '#50d9fe',
  turq100: '#b3ebff',

  sand300: '#c9c7b5',
  sand200: '#e6e3d0',
  sand50: '#f7f5ec',

  white: '#ffffff',
  neutral50: '#f8f9fa',
  neutral100: '#f3f4f5',
  neutral150: '#edeeef',
  neutral200: '#e7e8e9',
  neutral400: '#c4c6d0',
  neutral500: '#747780',
  neutral700: '#43474f',
  neutral900: '#191c1d',
  slate200: '#e2e8f0',

  red600: '#ba1a1a',
  red100: '#ffdad6',
} as const;

export const colors = {
  ...palette,

  primary: palette.navy950,
  primaryPressed: palette.navy800,
  onPrimary: palette.white,
  secondary: palette.turq600,
  secondaryContainer: palette.turq300,
  secondarySoft: 'rgba(80,217,254,0.25)',
  tertiary: palette.sand200,

  /** Fondo general de la app (se combina con los tintes ambientales). */
  surfaceApp: '#f3f6f8',
  surfaceCard: palette.white,
  surfaceLow: palette.neutral100,

  textStrong: palette.navy950,
  textBody: palette.neutral900,
  textMuted: palette.neutral700,
  textSubtle: palette.neutral500,
  textOnDark: palette.white,
  textOnDarkMuted: 'rgba(255,255,255,0.85)',
  textLink: palette.turq600,

  border: palette.neutral400,
  borderSoft: 'rgba(196,198,208,0.35)',
  borderCard: palette.slate200,
  borderFocus: palette.turq600,

  error: palette.red600,
  errorContainer: palette.red100,

  /** Superficies "liquid glass". */
  glass: 'rgba(255,255,255,0.62)',
  glassStrong: 'rgba(255,255,255,0.86)',
  glassDark: 'rgba(0,20,48,0.38)',
  glassBorder: 'rgba(255,255,255,0.55)',
  glassBorderDark: 'rgba(255,255,255,0.18)',

  /** Tintes ambientales del fondo (turquesa arriba, arena a la derecha). */
  ambientTurquoise: 'rgba(179,235,255,0.75)',
  ambientSand: 'rgba(230,227,208,0.8)',

  /** Degradados de protección para texto sobre fotos. */
  scrimBottom: ['rgba(0,20,48,0)', 'rgba(0,20,48,0.5)', '#001430'] as const,
  scrimTop: ['rgba(0,20,48,0.5)', 'rgba(0,20,48,0)'] as const,
} as const;

/**
 * Espectro de ocupación: reservado para Bajo / Medio / Alto.
 * Nunca se usa para otros significados ni se muestra sin la palabra.
 */
export const occupancyColors = {
  Bajo: { main: '#1e8e3e', bg: '#e8f5e9', fg: '#2e7d32', border: '#c8e6c9' },
  Medio: { main: '#f9ab00', bg: '#fff3e0', fg: '#ef6c00', border: '#ffe0b2' },
  Alto: { main: '#d93025', bg: '#ffebee', fg: '#c62828', border: '#ffcdd2' },
} as const;
