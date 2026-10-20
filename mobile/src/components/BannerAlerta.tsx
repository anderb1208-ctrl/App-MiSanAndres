import { StyleSheet, Text, View } from 'react-native';
import { alertColors, colors, motion, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { SuperficieVidrio } from './SuperficieVidrio';

interface Props {
  tono: keyof typeof alertColors;
  titulo: string;
  detalle?: string;
  icono?: NombreIcono;
  onPress?: () => void;
}

const ICONO: Record<keyof typeof alertColors, NombreIcono> = { alerta: 'error-outline', aviso: 'info-outline', ok: 'check-circle' };

/**
 * Banner de vidrio con un tinte sutil detrás del texto (contraste ≥ 4,5:1 en cualquier modo):
 * alerta (rojo), aviso (azul) u ok (verde, "Todo funcionando"). Tocable si lleva a una sección.
 */
export function BannerAlerta({ tono, titulo, detalle, icono, onPress }: Props) {
  const c = alertColors[tono];
  const contenido = (
    <SuperficieVidrio variante="tarjeta" tinte={{ fondo: c.fondo, borde: c.borde, fondoOpaco: c.fondoOpaco }} sombra={false} style={styles.banner}>
      <View style={styles.icono}>
        <Icon name={icono ?? ICONO[tono]} size={22} color={c.icono} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
      </View>
      {onPress && <Icon name="chevron-right" size={20} color={colors.textMuted} />}
    </SuperficieVidrio>
  );
  const accesible = `${tono === 'alerta' ? 'Alerta' : tono === 'aviso' ? 'Aviso' : 'Estado'}: ${titulo}. ${detalle ?? ''}`.trim();
  if (!onPress) {
    return (
      <View accessible accessibilityRole={tono === 'ok' ? 'text' : 'alert'} accessibilityLabel={accesible}>
        {contenido}
      </View>
    );
  }
  return (
    <PressableScale onPress={onPress} brillo={radius.xl} escala={motion.pressScale.button} accessibilityRole="button" accessibilityLabel={accesible}>
      {contenido}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 56, padding: spacing.gutter, borderRadius: radius.xl },
  icono: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glassStrong },
  textos: { flex: 1, gap: 2 },
  titulo: { ...typography.titleMd, fontSize: 15, lineHeight: 20, color: colors.textStrong },
  detalle: { ...typography.bodyMd, color: colors.textMuted },
});
