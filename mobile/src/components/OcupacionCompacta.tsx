import { StyleSheet, Text, View } from 'react-native';
import type { OcupacionResumida } from '../services/tipos';
import { colors, occupancyColors, typography } from '../theme';
import { textoOcupacion } from '../utils/ocupacion';
import { ChipEstado, TONO_NEUTRO, tonoOcupacion } from './ChipEstado';
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
    // Misma píldora que los estados de los tickets (ChipEstado); el texto dice el nivel con palabras.
    return (
      <ChipEstado
        etiqueta={t.corto}
        accesible={t.accesible}
        tono={c ? tonoOcupacion(c) : TONO_NEUTRO}
        icono={c ? undefined : t.icono}
        tamano="sm"
      />
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
});
