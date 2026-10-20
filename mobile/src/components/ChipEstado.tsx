import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, type TonoChip, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';
import { SuperficieVidrio } from './SuperficieVidrio';

interface Props {
  /** Texto visible ("52 %", "Abierto", "Prioridad alta"). */
  etiqueta: string;
  tono: TonoChip;
  /** Lo que lee el lector de pantalla (por defecto, la etiqueta). */
  accesible?: string;
  /** Ícono en lugar del punto de color. */
  icono?: NombreIcono;
  tamano?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/**
 * Píldora con punto de color: ocupación de los destinos y estado o prioridad de los tickets.
 * Va dentro de tarjetas y paneles: calidad ligera (nunca vidrio sobre vidrio). El texto usa el
 * tono oscuro de su color (≥ 4,5:1 sobre su fondo).
 */
export function ChipEstado({ etiqueta, tono, accesible, icono, tamano = 'md', style }: Props) {
  const chico = tamano === 'sm';
  return (
    <SuperficieVidrio
      variante="chip"
      calidad="ligera"
      tinte={{ fondo: tono.fondo, borde: tono.borde, fondoOpaco: tono.fondo }}
      accessible
      accessibilityLabel={accesible ?? etiqueta}
      style={[styles.chip, chico ? styles.chipSm : styles.chipMd, style]}
    >
      {icono ? (
        <Icon name={icono} size={chico ? 12 : 14} color={tono.texto} />
      ) : (
        <View style={[styles.punto, chico && styles.puntoSm, { backgroundColor: tono.punto }]} />
      )}
      <Text style={[chico ? styles.textoSm : styles.texto, { color: tono.texto }]} numberOfLines={1}>
        {etiqueta}
      </Text>
    </SuperficieVidrio>
  );
}

/** Tono de un nivel de ocupación para ChipEstado (fondo, borde, texto y punto del tema). */
export const tonoOcupacion = (c: { bg: string; border: string; fg: string; main: string }): TonoChip => ({
  fondo: c.bg,
  borde: c.border,
  texto: c.fg,
  punto: c.main,
});

/** Sin datos o cerrado: gris neutro. */
export const TONO_NEUTRO: TonoChip = {
  fondo: colors.surfaceLow,
  borde: colors.borderCard,
  texto: colors.textMuted,
  punto: colors.textMuted,
};

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: radius.full, flexShrink: 0 },
  chipMd: { gap: 6, paddingHorizontal: 10, paddingVertical: 4 },
  chipSm: { gap: 5, paddingHorizontal: 8, paddingVertical: 2 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  puntoSm: { width: 7, height: 7, borderRadius: 3.5 },
  texto: { ...typography.labelBold, fontSize: 13, lineHeight: 18 },
  textoSm: { ...typography.labelBold, fontSize: 12 },
});
