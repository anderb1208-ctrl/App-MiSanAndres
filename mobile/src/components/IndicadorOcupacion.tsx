import { StyleSheet, Text, View } from 'react-native';
import type { OcupacionResumida } from '../services/tipos';
import { colors, occupancyColors, radius, spacing, typography } from '../theme';
import { ADJETIVO_NIVEL, ETIQUETA_NIVEL, formatearPorcentaje } from '../utils/ocupacion';
import { Icon } from './Icon';

interface Props {
  /** La ocupación completa (OcupacionActual) o la resumida del mapa. */
  ocupacion: (OcupacionResumida & { personasEstimadas?: number }) | null;
  /** badge: píldora compacta; barra: detalle con porcentaje y aforo estimado. */
  variante?: 'badge' | 'barra';
  mostrarPorcentaje?: boolean;
  capacidad?: number;
}

const ICONO_NIVEL = {
  Bajo: 'signal-cellular-alt-1-bar',
  Medio: 'signal-cellular-alt-2-bar',
  Alto: 'signal-cellular-alt',
} as const;

/** IndicadorOcupacion: siempre muestra la palabra del nivel, nunca solo el color. */
export function IndicadorOcupacion({ ocupacion, variante = 'badge', mostrarPorcentaje = false, capacidad }: Props) {
  if (!ocupacion) {
    return variante === 'badge' ? (
      <View style={[styles.badge, styles.sinDatos]}>
        <Text style={[styles.badgeTexto, { color: colors.textMuted }]}>Sin datos de ocupación</Text>
      </View>
    ) : (
      <Text style={styles.sinDatosBarra}>Aún no hay datos suficientes para estimar la ocupación.</Text>
    );
  }

  // Cerrado: sin color de ocupación (ese espectro es solo para Bajo / Medio / Alto).
  if (ocupacion.estado === 'Cerrado' || !ocupacion.nivel) {
    return variante === 'badge' ? (
      <View accessible accessibilityLabel="Cerrado ahora" style={[styles.badge, styles.sinDatos]}>
        <Icon name="schedule" size={14} color={colors.textMuted} />
        <Text style={[styles.badgeTexto, { color: colors.textMuted }]}>Cerrado ahora</Text>
      </View>
    ) : (
      <View accessible accessibilityLabel="Cerrado ahora" style={styles.barraContenedor}>
        <View style={styles.barraTitulo}>
          <Icon name="schedule" size={22} color={colors.textMuted} />
          <Text style={[styles.nivel, { color: colors.textMuted }]}>Cerrado ahora</Text>
        </View>
        <Text style={styles.aforo}>Fuera del horario de atención: no hay ocupación prevista.</Text>
      </View>
    );
  }

  const nivel = ocupacion.nivel;
  const c = occupancyColors[nivel];
  const etiqueta = ETIQUETA_NIVEL[nivel];
  const accesible = `Ocupación ${ADJETIVO_NIVEL[nivel]}, ${formatearPorcentaje(ocupacion.porcentaje)}`;

  if (variante === 'badge') {
    return (
      <View
        accessible
        accessibilityLabel={accesible}
        style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}
      >
        <View style={[styles.punto, { backgroundColor: c.main }]} />
        <Text style={[styles.badgeTexto, { color: c.fg }]}>
          {mostrarPorcentaje ? `${etiqueta} · ${formatearPorcentaje(ocupacion.porcentaje)}` : etiqueta}
        </Text>
      </View>
    );
  }

  const ancho = `${Math.min(100, Math.max(2, ocupacion.porcentaje))}%` as const;
  return (
    <View accessible accessibilityLabel={accesible} style={styles.barraContenedor}>
      <View style={styles.barraCabecera}>
        <View style={styles.barraTitulo}>
          <Icon name={ICONO_NIVEL[nivel]} size={22} color={c.fg} />
          <Text style={[styles.nivel, { color: c.fg }]}>Ocupación {ADJETIVO_NIVEL[nivel]}</Text>
        </View>
        <Text style={[styles.porcentaje, { color: c.fg }]}>{formatearPorcentaje(ocupacion.porcentaje)}</Text>
      </View>
      <View style={styles.pista}>
        <View style={[styles.relleno, { width: ancho, backgroundColor: c.main }]} />
      </View>
      {capacidad !== undefined && ocupacion.personasEstimadas !== undefined && (
        <Text style={styles.aforo}>
          Aforo estimado: {ocupacion.personasEstimadas} de {capacidad} personas
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  sinDatos: { backgroundColor: colors.surfaceLow, borderColor: colors.borderCard },
  punto: { width: 8, height: 8, borderRadius: 4 },
  badgeTexto: typography.labelBold,
  sinDatosBarra: { ...typography.bodyMd, color: colors.textMuted },
  barraContenedor: { gap: spacing.sm },
  barraCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barraTitulo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nivel: typography.headlineSm,
  porcentaje: { ...typography.headlineSm, fontFamily: typography.display.fontFamily },
  pista: { height: 10, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: radius.full },
  aforo: { ...typography.bodyMd, color: colors.textMuted },
});
