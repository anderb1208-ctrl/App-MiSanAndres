import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PronosticoClima } from '../services/tipos';
import { colors, radius, spacing, typography } from '../theme';
import {
  ATRIBUCION_CLIMA,
  estadoDelTiempo,
  formatearTemperatura,
  horaDe,
  textoSinClima,
} from '../utils/clima';
import { GlassPanel } from './GlassPanel';
import { Icon } from './Icon';
import { EstadoCargando } from './StateView';

interface Props {
  pronostico: PronosticoClima | undefined;
  cargando: boolean;
  error: unknown;
  onReintentar: () => void;
}

/** Atribución que exige la licencia CC BY 4.0 de Open-Meteo, con enlace. */
export function AtribucionClima({ url = 'https://open-meteo.com/' }: { url?: string }) {
  return (
    <Pressable onPress={() => void Linking.openURL(url)} accessibilityRole="link" hitSlop={8}>
      <Text style={styles.atribucion}>{ATRIBUCION_CLIMA}</Text>
    </Pressable>
  );
}

/** Aviso corto cuando no hay clima: la pantalla sigue funcionando. */
function Aviso({ texto, onReintentar }: { texto: string; onReintentar?: () => void }) {
  return (
    <View style={styles.aviso}>
      <Icon name="cloud" size={22} color={colors.textSubtle} />
      <Text style={styles.avisoTexto}>
        {texto} La predicción de ocupación usa solo el histórico y el calendario.
      </Text>
      {onReintentar && (
        <Pressable onPress={onReintentar} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.reintentar}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Clima del destino: ahora (ícono, temperatura, texto, lluvia, viento) y las próximas horas. */
export function TarjetaClima({ pronostico, cargando, error, onReintentar }: Props) {
  if (cargando) return <EstadoCargando mensaje="Consultando el clima…" style={styles.cargando} />;
  if (!pronostico) return <Aviso texto="No pudimos cargar el clima." onReintentar={onReintentar} />;
  if (!pronostico.disponible || !pronostico.actual) {
    return <Aviso texto={textoSinClima(pronostico.motivoSinClima ?? 'sin_datos')} onReintentar={error ? onReintentar : undefined} />;
  }

  const actual = pronostico.actual;
  const estado = estadoDelTiempo(actual.codigoClima);
  return (
    <GlassPanel tono="strong" radius={radius.xl} padding={spacing.gutter}>
      <View
        style={styles.ahora}
        accessible
        accessibilityLabel={`Ahora ${formatearTemperatura(actual.temperatura)}, ${estado.texto}, ${actual.probLluvia ?? 0} % de probabilidad de lluvia`}
      >
        <View style={styles.iconoGrande}>
          <Icon name={estado.icono} size={30} color={colors.secondary} />
        </View>
        <View style={styles.ahoraTextos}>
          <Text style={styles.temperatura}>{formatearTemperatura(actual.temperatura)}</Text>
          <Text style={styles.estado}>{estado.texto}</Text>
        </View>
        <View style={styles.datos}>
          <View style={styles.dato}>
            <Icon name="water-drop" size={16} color={colors.secondary} />
            <Text style={styles.datoTexto}>Lluvia {actual.probLluvia ?? '–'} %</Text>
          </View>
          {actual.viento !== null && (
            <View style={styles.dato}>
              <Icon name="air" size={16} color={colors.secondary} />
              <Text style={styles.datoTexto}>{Math.round(actual.viento)} km/h</Text>
            </View>
          )}
        </View>
      </View>

      {pronostico.proximasHoras.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horas}>
          {pronostico.proximasHoras.map((h) => {
            const e = estadoDelTiempo(h.codigoClima);
            return (
              <View
                key={h.fechaHora}
                style={styles.hora}
                accessible
                accessibilityLabel={`${horaDe(h)}: ${formatearTemperatura(h.temperatura)}, ${e.texto}, lluvia ${h.probLluvia ?? 0} %`}
              >
                <Text style={styles.horaTexto}>{horaDe(h)}</Text>
                <Icon name={e.icono} size={20} color={colors.textMuted} />
                <Text style={styles.horaTemp}>{formatearTemperatura(h.temperatura)}</Text>
                <Text style={styles.horaLluvia}>{h.probLluvia ?? '–'} %</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <AtribucionClima url={pronostico.atribucion.url} />
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  cargando: { paddingVertical: spacing.md },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.panel,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  avisoTexto: { ...typography.bodyMd, color: colors.textMuted, flex: 1 },
  reintentar: { ...typography.labelBold, color: colors.textLink },
  ahora: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter },
  iconoGrande: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ahoraTextos: { flex: 1 },
  temperatura: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  estado: { ...typography.bodyMd, color: colors.textMuted },
  datos: { gap: 4, alignItems: 'flex-start' },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  datoTexto: { ...typography.labelMd, color: colors.textMuted },
  horas: { gap: spacing.sm, paddingTop: spacing.gutter, paddingBottom: spacing.sm },
  hora: {
    alignItems: 'center',
    gap: 4,
    minWidth: 56,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
  },
  horaTexto: { ...typography.labelMd, color: colors.textSubtle },
  horaTemp: { ...typography.labelBold, color: colors.textStrong },
  horaLluvia: { ...typography.labelMd, fontSize: 11, color: colors.secondary },
  atribucion: { ...typography.labelMd, fontSize: 11, color: colors.textSubtle, marginTop: spacing.xs, textDecorationLine: 'underline' },
});
