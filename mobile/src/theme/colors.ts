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
  /** Borde de botones destructivos sin relleno (3:1 sobre surfaceApp). */
  errorOutline: 'rgba(186,26,26,0.6)',
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
  /** Fondo del número dentro de un chip activo (sobre navy o turquesa). */
  chipCuentaActiva: 'rgba(255,255,255,0.22)',

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

/**
 * Panel "Ocupación ahora" (y paneles resumen de los demás roles): degradado azul claro,
 * textos azul marino y encabezados de sección en azul medio. Contrastes medidos sobre el
 * fondo más oscuro del panel (degradado al 94 % sobre la foto del hero, #c3d5ea):
 * encabezado 5,0:1, secundario 5,0:1, contorno de gráficos 3,4:1.
 */
export const panelColors = {
  /** Degradado del fondo (de arriba a la izquierda hacia abajo a la derecha). */
  degradado: ['rgba(207,225,246,0.94)', 'rgba(238,245,253,0.94)', 'rgba(213,230,248,0.94)'] as const,
  /** Encabezados de sección ("OCUPACIÓN AHORA") y texto de la píldora "Estimado". */
  encabezado: '#11559a',
  /** Texto secundario (categoría, "Lluvia 24 %", "Open-Meteo"). */
  secundario: '#43566d',
  /** Pista del anillo (los cerrados) y relleno del cuadrito "Cerrados". */
  pista: '#c9def4',
  /** Contorno de los elementos gráficos (anillo y cuadrito de cerrados): ≥ 3:1. */
  contorno: '#4a71a0',
  /** Separadores dentro del panel. */
  separador: 'rgba(17,85,154,0.18)',
  /** Filas de vidrio sobre el degradado (blanco translúcido + desenfoque). */
  vidrioFila: 'rgba(255,255,255,0.62)',
  vidrioFilaBorde: 'rgba(255,255,255,0.85)',
  /** Píldora blanca ("Estimado") y círculo del ícono del clima. */
  pildora: '#ffffff',
  pildoraBorde: 'rgba(17,85,154,0.16)',
} as const;

/**
 * Chips de estado y prioridad de los tickets (mismo estilo que las píldoras de ocupación).
 * No usan el espectro de ocupación (verde/ámbar/rojo), que está reservado para Bajo/Medio/Alto.
 * Texto sobre fondo ≥ 4,5:1; punto y borde distinguibles.
 */
export interface TonoChip {
  fondo: string;
  borde: string;
  texto: string;
  punto: string;
}

export const ticketColors = {
  estado: {
    abierto: { fondo: '#e3eefc', borde: '#bcd5f5', texto: '#11559a', punto: '#1f78d1' },
    en_revision: { fondo: '#efe9fb', borde: '#d5c8f2', texto: '#5b3fa8', punto: '#7c5cd6' },
    resuelto: { fondo: '#e0f4f1', borde: '#b5e3dc', texto: '#0f6b5f', punto: '#159a87' },
    cerrado: { fondo: '#eceef1', borde: '#d3d7de', texto: '#4a5160', punto: '#7a8291' },
  },
  prioridad: {
    baja: { fondo: '#eceef1', borde: '#d3d7de', texto: '#4a5160', punto: '#7a8291' },
    media: { fondo: '#e8eafc', borde: '#c9cdf5', texto: '#3c45a5', punto: '#5a64d6' },
    alta: { fondo: '#fde7ef', borde: '#f6c3d5', texto: '#a3123f', punto: '#d81b60' },
  },
} as const satisfies Record<string, Record<string, TonoChip>>;

/**
 * Banners del panel del administrador (vidrio con tinte sutil detrás del texto). Texto navy
 * (≥ 12:1) e íconos ≥ 4,5:1 sobre su fondo. "aviso" es azul para no confundirse con el ámbar
 * de la ocupación media.
 */
export const alertColors = {
  alerta: { fondo: 'rgba(255,218,214,0.9)', borde: 'rgba(186,26,26,0.35)', icono: '#ba1a1a', fondoOpaco: '#ffdad6' },
  aviso: { fondo: 'rgba(227,238,252,0.9)', borde: 'rgba(17,85,154,0.3)', icono: '#11559a', fondoOpaco: '#e3eefc' },
  ok: { fondo: 'rgba(224,244,241,0.9)', borde: 'rgba(15,107,95,0.3)', icono: '#0f6b5f', fondoOpaco: '#e0f4f1' },
} as const;

/** Brillo al presionar una tarjeta tocable (capa blanca encima, nunca opacidad en el vidrio). */
export const brilloPresion = { color: '#ffffff', opacidad: 0.22 } as const;
