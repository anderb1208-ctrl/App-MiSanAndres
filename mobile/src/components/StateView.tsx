import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ErrorApi, mensajeDeError } from '../services/api';
import { colors, occupancyColors, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Button } from './Button';
import { Icon } from './Icon';

interface Accion {
  texto: string;
  onPress: () => void;
}

interface PropsBase {
  style?: StyleProp<ViewStyle>;
}

/** Cargando: spinner turquesa y mensaje corto. */
export function EstadoCargando({ mensaje = 'Cargando…', style }: PropsBase & { mensaje?: string }) {
  return (
    <View style={[styles.contenedor, style]} accessibilityRole="progressbar" accessibilityLabel={mensaje}>
      <ActivityIndicator size="large" color={colors.secondary} />
      <Text style={styles.mensaje}>{mensaje}</Text>
    </View>
  );
}

interface PropsMensaje extends PropsBase {
  icono: NombreIcono;
  titulo: string;
  mensaje: string;
  accion?: Accion;
  tono?: 'turquoise' | 'danger';
}

/** Estado vacío o informativo: icono en círculo, título, texto y acción opcional. */
export function EstadoMensaje({ icono, titulo, mensaje, accion, tono = 'turquoise', style }: PropsMensaje) {
  const peligro = tono === 'danger';
  return (
    <View style={[styles.contenedor, style]}>
      <View style={[styles.circulo, { backgroundColor: peligro ? colors.dangerSoft : colors.secondarySoft }]}>
        <Icon name={icono} size={34} color={peligro ? occupancyColors.Alto.fg : colors.secondary} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.mensaje}>{mensaje}</Text>
      </View>
      {accion && (
        <Button tamano="lg" onPress={accion.onPress} style={styles.boton}>
          {accion.texto}
        </Button>
      )}
    </View>
  );
}

/** Error con reintento; distingue "sin conexión" y "no encontrado". */
export function EstadoError({ error, onReintentar, style }: PropsBase & { error: unknown; onReintentar?: () => void }) {
  const sinConexion = error instanceof ErrorApi && error.sinConexion;
  const noEncontrado = error instanceof ErrorApi && error.status === 404;
  return (
    <EstadoMensaje
      style={style}
      tono="danger"
      icono={sinConexion ? 'wifi-off' : noEncontrado ? 'location-off' : 'error-outline'}
      titulo={sinConexion ? 'Sin conexión' : noEncontrado ? 'No encontrado' : 'Algo salió mal'}
      mensaje={mensajeDeError(error)}
      accion={onReintentar ? { texto: 'Reintentar', onPress: onReintentar } : undefined}
    />
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: 28,
    paddingVertical: spacing.xl,
  },
  circulo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  textos: { alignItems: 'center', gap: 6 },
  titulo: { ...typography.headlineSm, color: colors.textStrong, textAlign: 'center' },
  mensaje: { ...typography.bodyMd, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  boton: { minWidth: 180 },
});
