import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChipEstadoTicket } from '../components/ChipsTicket';
import { GlassPanel } from '../components/GlassPanel';
import { PantallaApilada } from '../components/PantallaApilada';
import { SectionHeader } from '../components/ScreenHeader';
import { SelectRow } from '../components/SelectRow';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { TarjetaResumen } from '../components/TarjetaResumen';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { listarDestinosAdmin, obtenerMetricas } from '../services/admin';
import { obtenerPerfil } from '../services/perfil';
import { listarTickets } from '../services/tickets';
import { colors, radius, spacing, typography } from '../theme';
import { resumenAdmin } from '../utils/resumenTickets';
import { ESTADOS_TICKET, ETIQUETA_ESTADO_TICKET, ETIQUETA_ROL } from '../utils/tickets';
import { primerNombre } from '../utils/validacion';

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('es-CO');

/** Métricas, tickets y destinos a la vez (todos son del administrador). */
async function cargarPanel() {
  const [metricas, tickets, destinos, perfil] = await Promise.all([
    obtenerMetricas(),
    listarTickets(),
    listarDestinosAdmin(),
    obtenerPerfil(),
  ]);
  return { metricas, tickets, destinos, perfil };
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <GlassPanel padding={12} radius={radius.xl} style={styles.cifra}>
      <Text style={styles.valor}>{valor}</Text>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
    </GlassPanel>
  );
}

/**
 * Inicio del administrador: saludo con su rol, resumen (tickets abiertos y sin asignar, usuarios
 * y destinos cerrados temporalmente) en el estilo del panel de Inicio, actividad, tickets por
 * estado, modelos de ML y destinos más vistos.
 */
export function PanelScreen({ navigation }: TabScreenProps<'Panel'>) {
  const espacio = useEspacioTabBar();
  const { datos, error, cargando, refrescando, recargar } = useAsync(cargarPanel, [], { recargarAlEnfocar: true });
  const m = datos?.metricas;
  const r = resumenAdmin(m, datos?.tickets, datos?.destinos);
  const maxVistas = Math.max(1, ...(m?.destinosMasVistos.map((d) => d.vistas) ?? [1]));

  return (
    <PantallaApilada
      titulo="Panel"
      saludo={{ nombre: primerNombre(datos?.perfil.nombre), rol: 'administrador' }}
      espacioInferior={espacio}
      refrescando={refrescando}
      onRefrescar={recargar}
    >
      <TarjetaResumen
        titulo="Resumen"
        subtitulo="Lo que necesita atención hoy"
        cargando={cargando}
        error={!datos ? error : undefined}
        onReintentar={recargar}
        cifras={[
          { clave: 'abiertos', valor: fmt(r.ticketsAbiertos), etiqueta: 'Tickets abiertos', icono: 'mark-email-unread',
            onPress: () => navigation.navigate('Tickets'), accesible: `${r.ticketsAbiertos} tickets abiertos. Ver tickets` },
          { clave: 'sin-asignar', valor: fmt(r.sinAsignar), etiqueta: 'Tickets sin asignar', icono: 'assignment-late',
            onPress: () => navigation.navigate('Tickets'), accesible: `${r.sinAsignar} tickets sin asignar. Ver tickets` },
          { clave: 'usuarios', valor: fmt(r.usuarios), etiqueta: 'Usuarios', icono: 'group',
            onPress: () => navigation.navigate('Usuarios'), accesible: `${r.usuarios} usuarios. Ver usuarios` },
          { clave: 'cerrados', valor: fmt(r.destinosCerrados), etiqueta: 'Destinos cerrados temporalmente', icono: 'block',
            onPress: () => navigation.navigate('Destinos'), accesible: `${r.destinosCerrados} destinos cerrados temporalmente. Ver destinos` },
        ]}
      />

      {cargando ? (
        <EstadoCargando mensaje="Cargando métricas…" />
      ) : !m ? (
        error ? <EstadoError error={error} onReintentar={recargar} /> : null
      ) : (
        <>
          <SectionHeader titulo="Actividad" />
          <View style={styles.fila}>
            <Cifra valor={fmt(m.usuarios.ultimos30Dias)} etiqueta="Usuarios nuevos (30 días)" />
            <Cifra valor={fmt(m.interacciones.ultimos7Dias)} etiqueta="Interacciones (7 días)" />
          </View>
          <Text style={styles.nota}>
            {(['turista', 'tecnico', 'administrador'] as const).map((rol) => `${ETIQUETA_ROL[rol]}: ${fmt(m.usuarios.porRol[rol])}`).join(' · ')}
          </Text>

          <SectionHeader titulo="Tickets por estado" accion={{ texto: 'Ver tickets', onPress: () => navigation.navigate('Tickets') }} />
          <GlassPanel tono="strong" padding={0} radius={20} style={styles.menu}>
            {ESTADOS_TICKET.map((e, i) => (
              <Pressable
                key={e}
                onPress={() => navigation.navigate('Tickets')}
                accessibilityRole="button"
                accessibilityLabel={`${ETIQUETA_ESTADO_TICKET[e]}: ${fmt(m.ticketsPorEstado[e])} tickets`}
                style={({ pressed }) => [styles.estadoFila, i < ESTADOS_TICKET.length - 1 && styles.divisor, pressed && styles.presionada]}
              >
                <ChipEstadoTicket estado={e} />
                <Text style={styles.estadoCifra}>{fmt(m.ticketsPorEstado[e])}</Text>
              </Pressable>
            ))}
          </GlassPanel>

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
                <View key={d.idDestino} style={styles.barraFila} accessible accessibilityLabel={`${d.nombre}: ${d.vistas} vistas`}>
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
  cifra: { flexGrow: 1, flexBasis: '40%', alignItems: 'center' },
  valor: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  etiqueta: { ...typography.labelMd, color: colors.textMuted, textAlign: 'center' },
  nota: { ...typography.labelMd, color: colors.textMuted },
  estadoFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md },
  divisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  presionada: { backgroundColor: colors.pressedOverlay },
  estadoCifra: { ...typography.titleMd, fontFamily: typography.display.fontFamily, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  barraNombre: { ...typography.bodyMd, color: colors.textStrong, width: 130 },
  barraFondo: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: radius.full, backgroundColor: colors.secondary },
  barraValor: { ...typography.labelBold, color: colors.textMuted, minWidth: 28, textAlign: 'right' },
});
