import { StyleSheet, Text, View } from 'react-native';
import type { Razon } from '../services/tipos';
import { colors, occupancyColors, spacing, typography } from '../theme';
import { Icon } from './Icon';

const TONO = {
  positiva: { fondo: occupancyColors.Bajo.bg, texto: occupancyColors.Bajo.fg, borde: occupancyColors.Bajo.border, icono: 'check' as const },
  advertencia: { fondo: occupancyColors.Medio.bg, texto: occupancyColors.Medio.fg, borde: occupancyColors.Medio.border, icono: 'warning-amber' as const },
};

/** Lista completa para "Por qué es para ti" en el detalle. */
export function ListaRazones({ razones }: { razones: Razon[] }) {
  return (
    <View style={styles.lista}>
      {razones.map((r) => {
        const t = TONO[r.tipo];
        return (
          <View key={r.codigo} style={styles.fila} accessible accessibilityLabel={`${r.tipo === 'advertencia' ? 'Atención: ' : ''}${r.texto}`}>
            <View style={[styles.icono, { backgroundColor: t.fondo, borderColor: t.borde }]}>
              <Icon name={t.icono} size={16} color={t.texto} />
            </View>
            <Text style={styles.filaTexto}>{r.texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icono: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filaTexto: { ...typography.bodyMd, color: colors.textStrong, flex: 1 },
});
