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
  errorBorder: 'rgba(186,26,26,0.2)',
  /** Fondo del círculo del estado de error (rojo de ocupación Alta, suave). */
  dangerSoft: 'rgba(217,48,37,0.12)',

  /** Estrellas de las reseñas. */
  estrella: '#f2a900',

  /** Fondos turquesa translúcidos (etiquetas y avisos). */
  turquoiseTint: 'rgba(179,235,255,0.45)',
  turquoiseTintSoft: 'rgba(179,235,255,0.4)',

  /** Velo navy al presionar una fila y pista de las barras de progreso. */
  pressedOverlay: 'rgba(0,20,48,0.04)',
  track: 'rgba(0,20,48,0.08)',
  textOnDarkStrong: 'rgba(255,255,255,0.9)',

  /** Superficies "liquid glass". */
  glass: 'rgba(255,255,255,0.62)',
  glassStrong: 'rgba(255,255,255,0.86)',
  glassDark: 'rgba(0,20,48,0.38)',
  glassBorder: 'rgba(255,255,255,0.55)',
  glassBorderDark: 'rgba(255,255,255,0.18)',
  /** Hoja de autenticación, barras de acciones flotantes y cabecera de Explorar. */
  glassSheet: 'rgba(255,255,255,0.94)',
  glassBar: 'rgba(255,255,255,0.9)',
  glassBarBorder: 'rgba(255,255,255,0.7)',
  glassHeader: 'rgba(243,246,248,0.85)',
  /** Respaldo de los controles glass con "Reducir transparencia" activo. */
  glassOpaque: 'rgba(255,255,255,0.97)',
  glassDarkOpaque: 'rgba(0,27,61,0.94)',

  /** Tintes ambientales del fondo (turquesa arriba, arena a la derecha). */
  ambientTurquoise: 'rgba(179,235,255,0.75)',
  ambientTurquoiseClear: 'rgba(179,235,255,0)',
  ambientSand: 'rgba(230,227,208,0.8)',
  ambientSandClear: 'rgba(230,227,208,0)',

  /** Degradado turquesa → arena del recuadro de ocupación en el detalle. */
  gradientOcupacion: ['rgba(179,235,255,0.35)', 'rgba(230,227,208,0.35)'] as const,

  /** Degradados de protección para texto sobre fotos. */
  scrimBottom: ['rgba(0,20,48,0)', 'rgba(0,20,48,0.5)', '#001430'] as const,
  scrimTop: ['rgba(0,20,48,0.5)', 'rgba(0,20,48,0)'] as const,
  scrimHero: ['rgba(0,20,48,0.35)', 'rgba(0,20,48,0)', 'rgba(0,20,48,0.2)', 'rgba(0,20,48,0.85)'] as const,
} as const;

/**
 * Degradados de los placeholders de imagen por categoría (cuando el destino no tiene
 * foto o no carga). Tonos de la paleta: mar, arena y verde manglar.
 */
export const placeholderColors = {
  playa: ['#50d9fe', '#00677d'],
  cayo: ['#00677d', '#001b3d'],
  gastronomia: ['#e6e3d0', '#9a7b4f'],
  actividad: ['#b3ebff', '#005c70'],
  naturaleza: ['#7cc8a4', '#1f5c45'],
  cultura: ['#e6e3d0', '#002855'],
  buceo_snorkel: ['#b3ebff', '#005c70'],
} as const;

/** Marcadores del mapa que no son un nivel de ocupación. */
export const mapColors = {
  /** Destino cerrado a esta hora (gris neutro, nunca un color de ocupación). */
  cerrado: palette.neutral500,
  /** Sin datos para predecir. */
  sinDatos: palette.navy800,
  borde: palette.white,
} as const;

/**
 * Espectro de ocupación: reservado para Bajo / Medio / Alto.
 * Nunca se usa para otros significados ni se muestra sin la palabra.
 */
export const occupancyColors = {
  Bajo: { main: '#1e8e3e', bg: '#e8f5e9', fg: '#2e7d32', border: '#c8e6c9' },
  // fg oscurecido para texto: 5.06:1 sobre bg (antes #ef6c00, 2.81:1).
  Medio: { main: '#f9ab00', bg: '#fff3e0', fg: '#a84f00', border: '#ffe0b2' },
  Alto: { main: '#d93025', bg: '#ffebee', fg: '#c62828', border: '#ffcdd2' },
} as const;
