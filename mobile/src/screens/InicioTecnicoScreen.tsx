import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EsqueletoLista } from '../components/Esqueleto';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PantallaApilada } from '../components/PantallaApilada';
import { SectionHeader } from '../components/ScreenHeader';
import { EstadoError, EstadoMensaje } from '../components/StateView';
import { TarjetaResumen } from '../components/TarjetaResumen';
import { TarjetaTicket } from '../components/TarjetaTicket';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { obtenerPerfil } from '../services/perfil';
import { listarTickets } from '../services/tickets';
import { useAuth } from '../store/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { formatearFechaLarga } from '../utils/fecha';
import { actividadTecnico, destinosConMasReportes, formatearDuracion, requiereAtencion } from '../utils/panelTecnico';
import { resumenTecnico } from '../utils/resumenTickets';
import { primerNombre } from '../utils/validacion';

async function cargar() {
  const [tickets, perfil] = await Promise.all([listarTickets(), obtenerPerfil()]);
  return { tickets, perfil };
}

/**
 * Inicio del técnico: su trabajo de hoy (cifras que abren la lista filtrada), los tickets que
 * requieren atención, su actividad de la semana y los destinos con más reportes abiertos.
 */
export function InicioTecnicoScreen({ navigation }: TabScreenProps<'Inicio'>) {
  const espacio = useEspacioTabBar();
  const { sesion } = useAuth();
  const yo = sesion?.user.id ?? null;
  const { datos, error, cargando, refrescando, recargar } = useAsync(cargar, [], { recargarAlEnfocar: true });
  const tickets = datos?.tickets;
  const r = resumenTecnico(tickets, yo);
  const atencion = requiereAtencion(tickets, yo);
  const actividad = actividadTecnico(tickets, yo);
  const destinos = destinosConMasReportes(tickets);
  const verTickets = (filtro: { estado?: 'abierto' | 'en_revision'; mios?: boolean; sinAsignar?: boolean }) =>
    navigation.navigate('Tickets', filtro);

  return (
    <PantallaApilada
      titulo="Inicio"
      saludo={{ nombre: primerNombre(datos?.perfil.nombre), rol: 'tecnico' }}
      subtitulo={formatearFechaLarga()}
      espacioInferior={espacio}
      refrescando={refrescando}
      onRefrescar={recargar}
    >
      <TarjetaResumen
        titulo="Tu trabajo hoy"
        subtitulo="Toca una cifra para ver esos tickets"
        cargando={cargando}
        error={!datos ? error : undefined}
        onReintentar={recargar}
        cifras={[
          { clave: 'mios', valor: r.asignadosAMi, etiqueta: 'Asignados a mí', icono: 'person-pin', onPress: () => verTickets({ mios: true }),
            accesible: `${r.asignadosAMi} asignados a mí. Ver en Tickets` },
          { clave: 'abiertos', valor: r.abiertosSinAsignar, etiqueta: 'Abiertos sin asignar', icono: 'mark-email-unread',
            onPress: () => verTickets({ estado: 'abierto', sinAsignar: true }), accesible: `${r.abiertosSinAsignar} abiertos sin asignar. Ver en Tickets` },
          { clave: 'revision', valor: r.enRevision, etiqueta: 'En revisión', icono: 'manage-search', onPress: () => verTickets({ estado: 'en_revision' }),
            accesible: `${r.enRevision} en revisión. Ver en Tickets` },
        ]}
      />

      <SectionHeader titulo="Requiere atención" accion={{ texto: 'Ver todos', onPress: () => verTickets({}) }} />
      {cargando ? (
        <EsqueletoLista etiqueta="Cargando los tickets que requieren atención" />
      ) : !datos ? (
        <EstadoError error={error} onReintentar={recargar} />
      ) : atencion.length === 0 ? (
        <GlassPanel tono="strong" radius={20}>
          <EstadoMensaje icono="task-alt" titulo="Todo al día" mensaje="No hay tickets abiertos sin atender. ¡Buen trabajo!" />
        </GlassPanel>
      ) : (
        atencion.map((t) => <TarjetaTicket key={t.id} ticket={t} mostrarCreador onPress={() => navigation.navigate('TicketDetalle', { id: t.id })} />)
      )}

      {datos && (
        <>
          <SectionHeader titulo="Mi actividad" />
          <GlassPanel tono="strong" radius={20} style={styles.actividad}>
            <View style={styles.metricas}>
              <View style={styles.metrica} accessible accessibilityLabel={`${actividad.resueltosSemana} resueltos esta semana`}>
                <Text style={styles.metricaValor}>{actividad.resueltosSemana}</Text>
                <Text style={styles.metricaEtiqueta}>Resueltos esta semana</Text>
              </View>
              <View
                style={styles.metrica}
                accessible
                accessibilityLabel={
                  actividad.promedioHoras === null ? 'Tiempo promedio de resolución: aún sin datos' : `Tiempo promedio de resolución: ${formatearDuracion(actividad.promedioHoras)}`
                }
              >
                <Text style={styles.metricaValor}>{actividad.promedioHoras === null ? '—' : formatearDuracion(actividad.promedioHoras)}</Text>
                <Text style={styles.metricaEtiqueta}>Tiempo promedio de resolución</Text>
              </View>
            </View>
            {actividad.progreso === null ? (
              <Text style={styles.nota}>Cuando te asignes tickets, aquí verás cuántos llevas resueltos.</Text>
            ) : (
              <View
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Resueltos ${actividad.resueltos} de ${actividad.asignados} asignados`}
                accessibilityValue={{ min: 0, max: actividad.asignados, now: actividad.resueltos }}
                style={styles.progreso}
              >
                <View style={styles.progresoCabecera}>
                  <Text style={styles.nota}>Resueltos de tus asignados</Text>
                  <Text style={styles.progresoCifra}>
                    {actividad.resueltos} / {actividad.asignados}
                  </Text>
                </View>
                <View style={styles.pista}>
                  <View style={[styles.relleno, { width: `${Math.round(actividad.progreso * 100)}%` }]} />
                </View>
              </View>
            )}
          </GlassPanel>

          <SectionHeader titulo="Destinos con más reportes" />
          {destinos.length === 0 ? (
            <GlassPanel tono="strong" radius={20}>
              <EstadoMensaje icono="place" titulo="Sin reportes por destino" mensaje="Ningún destino tiene tickets abiertos ahora." />
            </GlassPanel>
          ) : (
            <GlassPanel tono="strong" padding={0} radius={20} style={styles.lista}>
              {destinos.map((d, i) => (
                <Pressable
                  key={d.id}
                  onPress={() => navigation.navigate('DetalleDestino', { id: d.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.nombre}: ${d.abiertos} ${d.abiertos === 1 ? 'ticket abierto' : 'tickets abiertos'}. Abre el destino`}
                  style={({ pressed }) => [styles.destino, i < destinos.length - 1 && styles.divisor, pressed && styles.presionada]}
                >
                  <View style={styles.posicion}>
                    <Text style={styles.posicionTexto}>{i + 1}</Text>
                  </View>
                  <Text style={styles.destinoNombre}>{d.nombre}</Text>
                  <Text style={styles.destinoCifra}>{d.abiertos}</Text>
                  <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>
              ))}
            </GlassPanel>
          )}
        </>
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  actividad: { gap: spacing.md },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metrica: { flexGrow: 1, flexBasis: '40%', gap: 2 },
  metricaValor: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  metricaEtiqueta: { ...typography.labelBold, fontSize: 13, color: colors.textMuted },
  nota: { ...typography.bodyMd, color: colors.textMuted },
  progreso: { gap: spacing.sm },
  progresoCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progresoCifra: { ...typography.labelBold, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  pista: { height: 10, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: radius.full, backgroundColor: colors.secondary },
  lista: { overflow: 'hidden' },
  destino: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 56, paddingHorizontal: spacing.md },
  divisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  presionada: { backgroundColor: colors.pressedOverlay },
  posicion: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondarySoft },
  posicionTexto: { ...typography.labelBold, color: colors.textStrong },
  destinoNombre: { ...typography.bodyLg, color: colors.textStrong, flex: 1 },
  destinoCifra: { ...typography.titleMd, fontFamily: typography.display.fontFamily, color: colors.textStrong, fontVariant: ['tabular-nums'] },
});
