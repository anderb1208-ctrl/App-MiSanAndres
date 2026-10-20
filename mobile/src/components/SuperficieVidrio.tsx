import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useReducirTransparencia } from '../hooks/useReducirTransparencia';
import { blur, colors, radius, shadows } from '../theme';
import {
  decidirModoVidrio,
  medicionVidrio,
  PRESUPUESTO_VIDRIO,
  registrarVidrio,
  type CalidadVidrio,
  type ModoVidrio,
} from '../utils/vidrio';

/** Liquid Glass existe solo en iOS 26+ y si el binario trae el módulo (no en algunas betas). */
function hayLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

/** Depende del sistema y del binario: no cambia mientras la app corre. */
const LIQUID_GLASS = hayLiquidGlass();

export type VarianteVidrio = 'panel' | 'tarjeta' | 'chip';
export type TonoVidrio = 'claro' | 'oscuro';

/** Colores propios para el respaldo (p. ej. el tinte de un nivel de ocupación). */
export interface TinteVidrio {
  fondo: string;
  borde: string;
  /** Fondo con "Reducir transparencia"; si falta se usa el opaco del tono. */
  fondoOpaco?: string;
}

const TINTES: Record<TonoVidrio, { desenfoque: string; color: string; opaco: string; borde: string }> = {
  claro: { desenfoque: colors.glass, color: colors.glassStrong, opaco: colors.glassOpaque, borde: colors.glassBorder },
  oscuro: { desenfoque: colors.glassDark, color: colors.glassDark, opaco: colors.glassDarkOpaque, borde: colors.glassBorderDark },
};

const RADIOS: Record<VarianteVidrio, number> = { panel: radius.panel, tarjeta: radius.xl, chip: radius.full };
const SOMBRAS = { md: shadows.md, lg: shadows.lg } as const;
const SOMBRA_POR_VARIANTE: Record<VarianteVidrio, keyof typeof SOMBRAS | false> = { panel: 'md', tarjeta: false, chip: false };

/** Modo efectivo para esta superficie según la plataforma, la accesibilidad y la calidad pedida. */
export function useModoVidrio(calidad: CalidadVidrio = 'nativa'): ModoVidrio {
  const reducirTransparencia = useReducirTransparencia();
  return decidirModoVidrio({ plataforma: Platform.OS, liquidGlass: LIQUID_GLASS, reducirTransparencia }, calidad);
}

// ---- Medición (solo informa en desarrollo) ----

let avisoProgramado: ReturnType<typeof setTimeout> | null = null;
function informarMedicion() {
  if (!__DEV__ || avisoProgramado) return;
  avisoProgramado = setTimeout(() => {
    avisoProgramado = null;
    const m = medicionVidrio();
    console.info(`[vidrio] activas ${m.total} (nativo ${m.nativo}, desenfoque ${m.desenfoque}) · máximo ${m.maximo} · presupuesto ${PRESUPUESTO_VIDRIO}`);
  }, 1000);
}
const avisarExceso = (total: number) => {
  if (__DEV__) console.warn(`[vidrio] ${total} superficies costosas a la vez: pasa del presupuesto de ${PRESUPUESTO_VIDRIO}.`);
};

/** Cuenta la superficie mientras está montada (nativo y desenfoque son los costosos). */
export function useMedicionVidrio(modo: ModoVidrio) {
  useEffect(() => {
    const quitar = registrarVidrio(modo, avisarExceso);
    informarMedicion();
    return () => {
      quitar();
      informarMedicion();
    };
  }, [modo]);
}

// ---- Capas del respaldo ----

interface FondoProps {
  modo: ModoVidrio;
  tono?: TonoVidrio;
  tinte?: TinteVidrio;
  radio?: number;
}

/**
 * Fondo de vidrio sin Liquid Glass: desenfoque + velo (iOS anterior), velo translúcido
 * (Android y listas) o superficie casi opaca (Reducir transparencia). Va como primer hijo,
 * en posición absoluta, de un contenedor con borde. En modo nativo no dibuja nada.
 */
export function FondoVidrio({ modo, tono = 'claro', tinte, radio = 0 }: FondoProps) {
  if (modo === 'nativo') return null;
  const t = TINTES[tono];
  const velo = modo === 'opaco' ? (tinte?.fondoOpaco ?? t.opaco) : (tinte?.fondo ?? (modo === 'desenfoque' ? t.desenfoque : t.color));
  const capa = [StyleSheet.absoluteFill, { borderRadius: radio, overflow: 'hidden' as const }];
  return (
    <>
      {modo === 'desenfoque' && <BlurView intensity={blur.panel} tint={tono === 'oscuro' ? 'dark' : 'light'} style={capa} />}
      <View pointerEvents="none" style={[capa, { backgroundColor: velo }]} />
    </>
  );
}

/** Color de borde del respaldo para un tono o tinte. */
export const bordeVidrio = (tono: TonoVidrio = 'claro', tinte?: TinteVidrio) => tinte?.borde ?? TINTES[tono].borde;

// ---- Superficie ----

interface Props extends Omit<ViewProps, 'style'> {
  /** panel: bloques grandes y barras. tarjeta: tarjetas y leyendas. chip: píldoras y botones redondos. */
  variante?: VarianteVidrio;
  /** claro: sobre fondos claros (texto oscuro). oscuro: sobre fotos (texto blanco). */
  tono?: TonoVidrio;
  /** nativa (por defecto): el mejor efecto disponible. ligera: solo color, para listas. */
  calidad?: CalidadVidrio;
  tinte?: TinteVidrio;
  /** Sombra del respaldo; con Liquid Glass la pone el sistema. Por defecto: md en panel. */
  sombra?: 'md' | 'lg' | false;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Superficie de vidrio única de la app (navegación, controles, panel de Inicio, carrusel y chips).
 * - iOS 26+ (calidad nativa): Liquid Glass con expo-glass-effect.
 * - iOS anterior: desenfoque de expo-blur + velo, como la referencia visual.
 * - Android o calidad ligera: velo translúcido con borde sutil.
 * - Reducir transparencia: casi opaca.
 * Reglas: nunca opacidad < 1 en ella ni en sus padres; no meter otra superficie de vidrio dentro.
 */
export function SuperficieVidrio({
  variante = 'panel',
  tono = 'claro',
  calidad = 'nativa',
  tinte,
  sombra,
  style,
  children,
  ...resto
}: Props) {
  const modo = useModoVidrio(calidad);
  useMedicionVidrio(modo);
  const radio = { borderRadius: RADIOS[variante] };

  if (modo === 'nativo') {
    return (
      <GlassView
        {...resto}
        glassEffectStyle="regular"
        colorScheme={tono === 'oscuro' ? 'dark' : 'light'}
        tintColor={tinte?.fondo}
        style={[radio, style]}
      >
        {children}
      </GlassView>
    );
  }

  const conSombra = sombra === undefined ? SOMBRA_POR_VARIANTE[variante] : sombra;
  const { borderRadius } = StyleSheet.flatten([radio, style]);
  return (
    <View
      {...resto}
      style={[radio, styles.borde, { borderColor: bordeVidrio(tono, tinte) }, conSombra ? SOMBRAS[conSombra] : null, style]}
    >
      <FondoVidrio modo={modo} tono={tono} tinte={tinte} radio={typeof borderRadius === 'number' ? borderRadius : 0} />
      {children}
    </View>
  );
}

/**
 * Agrupa superficies de vidrio cercanas (p. ej. "% compatible" y el corazón) para que en
 * iOS 26 se comporten como un conjunto (GlassContainer). Sin Liquid Glass es una View normal.
 */
export function GrupoVidrio({ espaciado = 8, style, children, ...resto }: ViewProps & { espaciado?: number }) {
  const reducirTransparencia = useReducirTransparencia();
  if (LIQUID_GLASS && !reducirTransparencia) {
    return (
      <GlassContainer {...resto} spacing={espaciado} style={style}>
        {children}
      </GlassContainer>
    );
  }
  return (
    <View {...resto} style={style}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  borde: { borderWidth: 1 },
});
