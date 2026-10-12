import { Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAsync } from '../hooks/useAsync';
import { obtenerClimaIsla } from '../services/clima';
import { colors, radius, typography } from '../theme';
import { estadoDelTiempo, formatearTemperatura } from '../utils/clima';
import { Icon } from './Icon';

/**
 * Resumen pequeño del clima de la isla para Inicio. Si no hay clima muestra un aviso
 * discreto; nunca bloquea la pantalla. Toca para abrir Open-Meteo (atribución).
 */
export function ClimaIsla({ style }: { style?: StyleProp<ViewStyle> }) {
  const { datos, cargando } = useAsync(() => obtenerClimaIsla(1), [], { recargarAlEnfocar: true });
  const actual = datos?.disponible ? datos.actual : null;

  let contenido;
  if (cargando) {
    contenido = <Text style={styles.texto}>Consultando el clima…</Text>;
  } else if (!actual) {
    contenido = (
      <>
        <Icon name="cloud" size={16} color={colors.textOnDarkMuted} />
        <Text style={styles.texto}>Clima no disponible</Text>
      </>
    );
  } else {
    const estado = estadoDelTiempo(actual.codigoClima);
    contenido = (
      <>
        <Icon name={estado.icono} size={18} color={colors.white} />
        <View>
          <Text style={styles.principal}>
            {formatearTemperatura(actual.temperatura)} · {estado.texto}
          </Text>
          <Text style={styles.texto}>
            Lluvia {actual.probLluvia ?? '–'} % · Open-Meteo
          </Text>
        </View>
      </>
    );
  }

  return (
    <Pressable
      onPress={() => void Linking.openURL(datos?.atribucion.url ?? 'https://open-meteo.com/')}
      accessibilityRole="link"
      accessibilityLabel={
        actual
          ? `Clima en San Andrés: ${formatearTemperatura(actual.temperatura)}, ${estadoDelTiempo(actual.codigoClima).texto}, lluvia ${actual.probLluvia ?? 0} %. Datos de Open-Meteo.com`
          : 'Clima de San Andrés no disponible'
      }
      style={[styles.pildora, style]}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.glassDark,
    borderWidth: 1,
    borderColor: colors.glassBorderDark,
  },
  principal: { ...typography.labelBold, color: colors.white },
  texto: { ...typography.labelMd, fontSize: 11, color: colors.textOnDarkMuted },
});
