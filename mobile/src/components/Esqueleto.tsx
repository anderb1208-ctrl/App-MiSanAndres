import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { useReducirMovimiento } from '../hooks/useReducirMovimiento';
import { colors, radius, spacing } from '../theme';

const Pulso = createContext<Animated.Value | null>(null);

/**
 * Contenedor de un esqueleto de carga: un solo pulso compartido por todos sus bloques (se detiene
 * con "Reducir movimiento"). Anuncia "cargando" al lector de pantalla.
 */
export function Esqueleto({ etiqueta, children, style }: { etiqueta: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reducir = useReducirMovimiento();
  const pulso = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducir) return;
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [reducir, pulso]);
  return (
    <Pulso.Provider value={pulso}>
      <View accessible accessibilityLabel={etiqueta} accessibilityState={{ busy: true }} style={style}>
        {children}
      </View>
    </Pulso.Provider>
  );
}

/** Bloque gris que palpita (la opacidad va en el bloque, nunca en una superficie de vidrio). */
export function Bloque({ ancho = '100%', alto = 14, radio = radius.sm, style }: { ancho?: DimensionValue; alto?: number; radio?: number; style?: StyleProp<ViewStyle> }) {
  const pulso = useContext(Pulso);
  return <Animated.View style={[styles.bloque, { width: ancho, height: alto, borderRadius: radio, opacity: pulso ?? 1 }, style]} />;
}

/** Esqueleto de una lista de tarjetas (filas con título y dos líneas). */
export function EsqueletoLista({ filas = 3, etiqueta = 'Cargando…' }: { filas?: number; etiqueta?: string }) {
  return (
    <Esqueleto etiqueta={etiqueta} style={styles.lista}>
      {Array.from({ length: filas }, (_, i) => (
        <View key={i} style={styles.fila}>
          <Bloque ancho="60%" alto={16} />
          <Bloque ancho="85%" alto={12} />
          <Bloque ancho="40%" alto={12} />
        </View>
      ))}
    </Esqueleto>
  );
}

const styles = StyleSheet.create({
  bloque: { backgroundColor: colors.track },
  lista: { gap: spacing.sm },
  fila: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.xl, backgroundColor: colors.glass },
});
