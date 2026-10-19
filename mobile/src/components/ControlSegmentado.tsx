import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme';

interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

interface Props<T extends string> {
  opciones: readonly Opcion<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
  etiquetaAccesible: string;
}

/** Pestañas pequeñas dentro de una pantalla ("Nuevo | Mis reportes"). */
export function ControlSegmentado<T extends string>({ opciones, valor, onCambiar, etiquetaAccesible }: Props<T>) {
  return (
    <View style={styles.contenedor} accessibilityRole="tablist" accessibilityLabel={etiquetaAccesible}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambiar(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={o.etiqueta}
            style={({ pressed }) => [styles.opcion, activo && styles.activa, pressed && !activo && styles.presionada]}
          >
            <Text style={[styles.texto, activo && styles.textoActivo]} numberOfLines={1}>
              {o.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  opcion: { flex: 1, minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  activa: { backgroundColor: colors.primary },
  presionada: { backgroundColor: colors.pressedOverlay },
  texto: { ...typography.labelBold, fontSize: 14, color: colors.textMuted },
  textoActivo: { color: colors.white },
});
