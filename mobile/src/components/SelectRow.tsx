import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, occupancyColors, radius, spacing, typography } from '../theme';
import type { NivelOcupacion } from '../services/tipos';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';

type Control = 'checkbox' | 'radio' | 'chevron' | 'none';
type TonoIcono = 'turquoise' | 'neutral' | 'danger' | NivelOcupacion;

interface Props {
  etiqueta: string;
  descripcion?: string;
  icono?: NombreIcono;
  tonoIcono?: TonoIcono;
  control?: Control;
  marcado?: boolean;
  onPress?: () => void;
  divisor?: boolean;
}

function coloresIcono(tono: TonoIcono): { fondo: string; icono: string } {
  if (tono === 'turquoise') return { fondo: colors.secondarySoft, icono: colors.secondary };
  if (tono === 'neutral') return { fondo: colors.surfaceLow, icono: colors.textMuted };
  if (tono === 'danger') return { fondo: colors.errorContainer, icono: colors.error };
  return { fondo: occupancyColors[tono].bg, icono: occupancyColors[tono].fg };
}

/** Fila de lista: opciones de preferencias (checkbox / radio) y menú del perfil (chevron). */
export function SelectRow({
  etiqueta,
  descripcion,
  icono,
  tonoIcono = 'turquoise',
  control = 'checkbox',
  marcado = false,
  onPress,
  divisor = true,
}: Props) {
  const c = coloresIcono(tonoIcono);
  const rol = control === 'checkbox' ? 'checkbox' : control === 'radio' ? 'radio' : 'button';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={rol}
      accessibilityState={control === 'checkbox' || control === 'radio' ? { checked: marcado } : undefined}
      accessibilityLabel={descripcion ? `${etiqueta}. ${descripcion}` : etiqueta}
      style={({ pressed }) => [styles.fila, pressed && styles.presionada, divisor && styles.divisor]}
    >
      {icono && (
        <View style={[styles.circulo, { backgroundColor: c.fondo }]}>
          <Icon name={icono} size={20} color={c.icono} />
        </View>
      )}
      <View style={styles.textos}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        {descripcion ? <Text style={styles.descripcion}>{descripcion}</Text> : null}
      </View>
      {control === 'checkbox' && (
        <View style={[styles.checkbox, marcado && styles.checkboxMarcado]}>
          {marcado && <Icon name="check" size={16} color={colors.white} />}
        </View>
      )}
      {control === 'radio' && (
        <View style={[styles.radio, marcado && styles.radioMarcado]}>{marcado && <View style={styles.radioPunto} />}</View>
      )}
      {control === 'chevron' && <Icon name="chevron-right" size={22} color={colors.textSubtle} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  presionada: { backgroundColor: colors.pressedOverlay },
  divisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  circulo: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: 2 },
  etiqueta: { ...typography.bodyLg, fontFamily: typography.titleMd.fontFamily, color: colors.textStrong },
  descripcion: { ...typography.bodyMd, color: colors.textMuted },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMarcado: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMarcado: { borderColor: colors.secondary },
  radioPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondary },
});
