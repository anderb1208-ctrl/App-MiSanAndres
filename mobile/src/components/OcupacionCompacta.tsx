import { StyleSheet, Text, View } from 'react-native';
import type { OcupacionResumida } from '../services/tipos';
import { colors, occupancyColors, radius, typography } from '../theme';
import { textoOcupacion } from '../utils/ocupacion';
import { Icon } from './Icon';
import { SuperficieVidrio } from './SuperficieVidrio';

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
    // Va dentro de tarjetas (listas, panel de Inicio): calidad ligera, nunca vidrio sobre vidrio.
    // El tinte es el del nivel, así el texto mantiene su contraste (≥ 4.5:1) en todos los modos.
    const tinte = c ? { fondo: c.bg, borde: c.border, fondoOpaco: c.bg } : TINTE_NEUTRO;
    return (
      <SuperficieVidrio variante="chip" calidad="ligera" tinte={tinte} accessible accessibilityLabel={t.accesible} style={styles.chip}>
        {c ? <View style={[styles.punto, { backgroundColor: c.main }]} /> : <Icon name={t.icono} size={12} color={colors.textMuted} />}
        <Text style={[styles.chipTexto, { color: c ? c.fg : colors.textMuted }]} numberOfLines={1}>
          {t.corto}
        </Text>
      </SuperficieVidrio>
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

const TINTE_NEUTRO = { fondo: colors.surfaceLow, borde: colors.borderCard, fondoOpaco: colors.surfaceLow };

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
    flexShrink: 0,
  },
  chipTexto: { ...typography.labelBold, fontSize: 12 },
});
