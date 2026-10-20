import { StyleSheet, Text, View } from 'react-native';
import { colors, motion, panelColors, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { GrupoVidrio, SuperficieVidrio } from './SuperficieVidrio';

export interface AccesoRapido {
  etiqueta: string;
  icono: NombreIcono;
  onPress: () => void;
}

/**
 * Botones de acceso rápido de vidrio en dos columnas, agrupados (GrupoVidrio) para que en iOS 26
 * se fusionen. Ícono y etiqueta completa; ≥ 72 px de alto; escala y brillo al presionar.
 */
export function AccesosRapidos({ accesos }: { accesos: AccesoRapido[] }) {
  return (
    <GrupoVidrio espaciado={spacing.sm} style={styles.grilla}>
      {accesos.map((a) => (
        <PressableScale
          key={a.etiqueta}
          onPress={a.onPress}
          brillo={radius.xl}
          escala={motion.pressScale.button}
          accessibilityRole="button"
          accessibilityLabel={a.etiqueta}
          style={styles.celda}
        >
          <SuperficieVidrio variante="tarjeta" tinte={{ fondo: colors.glassStrong, borde: colors.glassBorder }} style={styles.boton}>
            <View style={styles.icono}>
              <Icon name={a.icono} size={22} color={panelColors.encabezado} />
            </View>
            <Text style={styles.texto}>{a.etiqueta}</Text>
          </SuperficieVidrio>
        </PressableScale>
      ))}
    </GrupoVidrio>
  );
}

const styles = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  celda: { flexGrow: 1, flexBasis: '45%', minWidth: 0 },
  boton: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 72, padding: spacing.gutter, borderRadius: radius.xl },
  icono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: panelColors.pista },
  texto: { ...typography.labelBold, fontSize: 14, lineHeight: 18, color: colors.textStrong, flex: 1 },
});
