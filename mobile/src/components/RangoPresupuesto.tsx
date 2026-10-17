import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { Presupuesto } from '../services/tipos';
import { colors, radius, shadows, spacing, typography } from '../theme';
import {
  ajustarAlPaso,
  formatearCop,
  formatearPresupuesto,
  PRESUPUESTO_MAX,
  PRESUPUESTO_MIN,
  PRESUPUESTO_PASO,
} from '../utils/presupuesto';

interface Props {
  valor: Presupuesto;
  /** Mientras se arrastra (para mostrar el texto en vivo). */
  onCambio?: (valor: Presupuesto) => void;
  /** Al soltar una punta (para guardar o volver a consultar). */
  onCambioFinal: (valor: Presupuesto) => void;
  /** Texto claro sobre fondo oscuro. */
  oscuro?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PUNTA = 28;
const RANGO = PRESUPUESTO_MAX - PRESUPUESTO_MIN;
type Punta = 'min' | 'max';

/**
 * Barra de rango de dos puntas hecha solo con PanResponder (sin módulos nativos, funciona en
 * Expo Go). Pasos de $5.000 entre $0 y $500.000. Accesible: cada punta acepta
 * "aumentar" y "disminuir" del lector de pantalla.
 */
export function RangoPresupuesto({ valor, onCambio, onCambioFinal, oscuro = false, style }: Props) {
  const [ancho, setAncho] = useState(0);
  const [local, setLocal] = useState(valor);
  // Refs para que los manejadores del PanResponder (creados una vez) lean el estado actual.
  const estado = useRef({ ancho: 0, local: valor, inicio: 0, punta: 'min' as Punta });
  estado.current.ancho = ancho;
  estado.current.local = local;
  const callbacks = useRef({ onCambio, onCambioFinal });
  callbacks.current = { onCambio, onCambioFinal };

  useEffect(() => {
    setLocal(valor);
  }, [valor.minCop, valor.maxCop]); // eslint-disable-line react-hooks/exhaustive-deps

  const pista = Math.max(ancho - PUNTA, 1);
  const aX = (cop: number) => ((cop - PRESUPUESTO_MIN) / RANGO) * pista;

  const mover = (punta: Punta, cop: number): Presupuesto => {
    const actual = estado.current.local;
    const v = ajustarAlPaso(cop);
    return punta === 'min'
      ? { minCop: Math.min(v, actual.maxCop), maxCop: actual.maxCop }
      : { minCop: actual.minCop, maxCop: Math.max(v, actual.minCop) };
  };

  const crearResponder = (punta: Punta) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Que el ScrollView padre no robe el gesto horizontal.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const e = estado.current;
        e.punta = punta;
        e.inicio = punta === 'min' ? e.local.minCop : e.local.maxCop;
      },
      onPanResponderMove: (_evt, g) => {
        const e = estado.current;
        const pistaActual = Math.max(e.ancho - PUNTA, 1);
        const nuevo = mover(punta, e.inicio + (g.dx / pistaActual) * RANGO);
        if (nuevo.minCop !== e.local.minCop || nuevo.maxCop !== e.local.maxCop) {
          e.local = nuevo;
          setLocal(nuevo);
          callbacks.current.onCambio?.(nuevo);
        }
      },
      onPanResponderRelease: () => callbacks.current.onCambioFinal(estado.current.local),
      onPanResponderTerminate: () => callbacks.current.onCambioFinal(estado.current.local),
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const responders = useMemo(() => ({ min: crearResponder('min'), max: crearResponder('max') }), []);

  const accion = (punta: Punta) => (e: AccessibilityActionEvent) => {
    const actual = punta === 'min' ? local.minCop : local.maxCop;
    const delta = e.nativeEvent.actionName === 'increment' ? PRESUPUESTO_PASO * 2 : -PRESUPUESTO_PASO * 2;
    const nuevo = mover(punta, actual + delta);
    setLocal(nuevo);
    onCambioFinal(nuevo);
  };

  const alMedir = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);
  const colorTexto = oscuro ? colors.white : colors.textStrong;
  const xMin = aX(local.minCop);
  const xMax = aX(local.maxCop);

  const puntaVista = (punta: Punta, x: number, cop: number) => (
    <View
      {...responders[punta].panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={punta === 'min' ? 'Presupuesto mínimo' : 'Presupuesto máximo'}
      accessibilityValue={{ text: formatearCop(cop) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={accion(punta)}
      hitSlop={14}
      style={[styles.punta, shadows.md, { left: x }]}
    />
  );

  return (
    <View style={style}>
      <Text style={[styles.valor, { color: colorTexto }]} accessibilityLiveRegion="polite">
        {formatearPresupuesto(local)}
      </Text>
      <Text style={[styles.ayuda, oscuro && styles.ayudaOscura]}>Por persona por visita</Text>
      <View style={styles.contenedor} onLayout={alMedir}>
        <View style={styles.pista} />
        {ancho > 0 && (
          <>
            <View style={[styles.relleno, { left: xMin + PUNTA / 2, width: Math.max(xMax - xMin, 0) }]} />
            {puntaVista('min', xMin, local.minCop)}
            {puntaVista('max', xMax, local.maxCop)}
          </>
        )}
      </View>
      <View style={styles.extremos}>
        <Text style={[styles.extremo, oscuro && styles.ayudaOscura]}>{formatearCop(PRESUPUESTO_MIN)}</Text>
        <Text style={[styles.extremo, oscuro && styles.ayudaOscura]}>{formatearCop(PRESUPUESTO_MAX)}+</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valor: { ...typography.titleMd },
  ayuda: { ...typography.labelMd, color: colors.textSubtle, marginBottom: spacing.sm },
  ayudaOscura: { color: colors.textOnDarkMuted },
  contenedor: { height: PUNTA + 8, justifyContent: 'center' },
  pista: {
    position: 'absolute',
    left: PUNTA / 2,
    right: PUNTA / 2,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  relleno: { position: 'absolute', height: 6, borderRadius: radius.full, backgroundColor: colors.secondary },
  punta: {
    position: 'absolute',
    width: PUNTA,
    height: PUNTA,
    borderRadius: PUNTA / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  extremos: { flexDirection: 'row', justifyContent: 'space-between' },
  extremo: { ...typography.labelMd, color: colors.textSubtle },
});
