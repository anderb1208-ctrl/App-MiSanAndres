import { StyleSheet, Text, View } from 'react-native';
import { GlassPanel } from '../components/GlassPanel';
import { PantallaApilada } from '../components/PantallaApilada';
import { SectionHeader } from '../components/ScreenHeader';
import { SelectRow } from '../components/SelectRow';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { obtenerMetricas } from '../services/admin';
import { colors, radius, spacing, typography } from '../theme';
import { ESTADOS_TICKET, ETIQUETA_ESTADO_TICKET, ETIQUETA_ROL } from '../utils/tickets';

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('es-CO');

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <GlassPanel padding={12} radius={radius.xl} style={styles.cifra}>
      <Text style={styles.valor}>{valor}</Text>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
    </GlassPanel>
  );
}

/** Panel del administrador: usuarios, interacciones, tickets por estado y destinos más vistos. */
export function PanelScreen({ navigation }: TabScreenProps<'Panel'>) {
  const espacio = useEspacioTabBar();
  const { datos: m, error, cargando, refrescando, recargar } = useAsync(obtenerMetricas, [], { recargarAlEnfocar: true });
  const maxVistas = Math.max(1, ...(m?.destinosMasVistos.map((d) => d.vistas) ?? [1]));

  return (
    <PantallaApilada titulo="Panel" subtitulo="Resumen de la app" espacioInferior={espacio} refrescando={refrescando} onRefrescar={recargar}>
      {cargando ? (
        <EstadoCargando mensaje="Cargando métricas…" />
      ) : !m ? (
        <EstadoError error={error} onReintentar={recargar} />
      ) : (
        <>
          <View style={styles.fila}>
            <Cifra valor={fmt(m.usuarios.total)} etiqueta="Usuarios" />
            <Cifra valor={fmt(m.usuarios.ultimos30Dias)} etiqueta="Nuevos (30 días)" />
            <Cifra valor={fmt(m.interacciones.ultimos7Dias)} etiqueta="Interacciones (7 días)" />
          </View>
          <Text style={styles.nota}>
            {(['turista', 'tecnico', 'administrador'] as const).map((r) => `${ETIQUETA_ROL[r]}: ${fmt(m.usuarios.porRol[r])}`).join(' · ')}
          </Text>

          <SectionHeader titulo="Tickets por estado" accion={{ texto: 'Ver tickets', onPress: () => navigation.navigate('Tickets') }} />
          <View style={styles.fila}>
            {ESTADOS_TICKET.map((e) => (
              <Cifra key={e} valor={fmt(m.ticketsPorEstado[e])} etiqueta={ETIQUETA_ESTADO_TICKET[e]} />
            ))}
          </View>

          <GlassPanel tono="strong" padding={0} radius={20} style={styles.menu}>
            <SelectRow
              icono="insights"
              etiqueta="Modelos de ML"
              descripcion="Comparativa de los tres modelos y el que está en uso"
              control="chevron"
              divisor={false}
              onPress={() => navigation.navigate('ModelosMl')}
            />
          </GlassPanel>

          <SectionHeader titulo="Destinos más vistos" />
          <GlassPanel tono="strong" radius={20}>
            {m.destinosMasVistos.length === 0 ? (
              <Text style={styles.nota}>Aún no hay vistas registradas.</Text>
            ) : (
              m.destinosMasVistos.map((d, i) => (
                <View key={d.idDestino} style={styles.barraFila} accessibilityLabel={`${d.nombre}: ${d.vistas} vistas`}>
                  <Text style={styles.barraNombre} numberOfLines={1}>
                    {i + 1}. {d.nombre}
                  </Text>
                  <View style={styles.barraFondo}>
                    <View style={[styles.barra, { width: `${(d.vistas / maxVistas) * 100}%` }]} />
                  </View>
                  <Text style={styles.barraValor}>{fmt(d.vistas)}</Text>
                </View>
              ))
            )}
          </GlassPanel>
        </>
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  menu: { overflow: 'hidden' },
  cifra: { flexGrow: 1, flexBasis: '28%', alignItems: 'center' },
  valor: { ...typography.headlineSm, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  etiqueta: { ...typography.labelMd, color: colors.textMuted, textAlign: 'center' },
  nota: { ...typography.labelMd, color: colors.textMuted },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  barraNombre: { ...typography.bodyMd, color: colors.textStrong, width: '42%' },
  barraFondo: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  barra: { height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  barraValor: { ...typography.labelBold, color: colors.textMuted, minWidth: 28, textAlign: 'right' },
});
