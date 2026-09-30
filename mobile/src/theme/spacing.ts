/** Espaciado con base de 4 px. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  gutter: 12,
  md: 16,
  /** Margen lateral de pantalla. */
  screen: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  /** Inputs. */
  md: 8,
  /** Botones. */
  lg: 12,
  /** Tarjetas. */
  xl: 16,
  /** Paneles glass. */
  panel: 20,
  xxl: 24,
  sheet: 28,
  /** Hoja de autenticación. */
  auth: 32,
  full: 999,
} as const;

export const sizes = {
  touch: 44,
  icon: 24,
  iconSm: 20,
  iconButton: 40,
  /** Alto de la barra de tabs flotante (sin el inset inferior). */
  tabBar: 64,
} as const;
