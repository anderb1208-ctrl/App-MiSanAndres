import { StyleSheet, Text, View } from 'react-native';
import type { OcupacionResumida } from '../services/tipos';
import { colors, occupancyColors, radius, typography } from '../theme';
import { textoOcupacion } from '../utils/ocupacion';
import { Icon } from './Icon';

interface Props {
  ocupacion: OcupacionResumida | null | undefined;
  /**
   * indicador: punto de color y "Ocupación baja · 31 %" (fila de información del carrusel).
   * chip: píldora compacta "Baja · 31 %" para la fila de metadatos de las listas.
   */
  variante?: 'indicador' | 'chip';
  /** Sobre la leyenda oscura de una foto: texto claro. */
  sobreOscuro?: boolean;
}

/**
 * Ocupación compartida por Inicio, Explorar y Favoritos. Siempre dice el nivel con palabras
 * (nunca solo el color) y no se corta: el texto es corto y el contenedor puede pasar a otra línea.
 */
export function OcupacionCompacta({ ocupacion, variante = 'indicador', sobreOscuro = false }: Props) {
  const t = textoOcupacion(ocupacion);
  const c = ocupacion?.nivel && ocupacion.estado !== 'Cerrado' ? occupancyColors[ocupacion.nivel] : null;

  if (variante === 'chip') {
    return (
      <View
        accessible
        accessibilityLabel={t.accesible}
        style={[styles.chip, c ? { backgroundColor: c.bg, borderColor: c.border } : styles.chipNeutro]}
      >
        {c ? <View style={[styles.punto, { backgroundColor: c.main }]} /> : <Icon name={t.icono} size={12} color={colors.textMuted} />}
        <Text style={[styles.chipTexto, { color: c ? c.fg : colors.textMuted }]} numberOfLines={1}>
          {t.corto}
        </Text>
      </View>
    );
  }

  const colorTexto = sobreOscuro ? colors.textOnDarkStrong : c ? c.fg : colors.textMuted;
  return (
    <View accessible accessibilityLabel={t.accesible} style={styles.indicador}>
      {c ? (
        <View style={[styles.punto, sobreOscuro && styles.puntoBorde, { backgroundColor: c.main }]} />
      ) : (
        <Icon name={t.icono} size={14} color={colorTexto} />
      )}
      <Text style={[styles.indicadorTexto, { color: colorTexto }]} numberOfLines={1}>
        {t.largo}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  indicador: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  indicadorTexto: { ...typography.labelBold },
  punto: { width: 8, height: 8, borderRadius: 4 },
  puntoBorde: { borderWidth: 1, borderColor: colors.white, width: 10, height: 10, borderRadius: 5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  chipNeutro: { backgroundColor: colors.surfaceLow, borderColor: colors.borderCard },
  chipTexto: { ...typography.labelBold, fontSize: 12 },
});
