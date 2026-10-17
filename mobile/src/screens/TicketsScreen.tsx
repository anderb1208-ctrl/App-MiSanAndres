import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PantallaApilada } from '../components/PantallaApilada';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { Tag } from '../components/Tag';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { AppScreenProps, TabScreenProps } from '../navigation/types';
import { listarTickets } from '../services/tickets';
import type { EstadoTicket, PrioridadTicket, Ticket } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, typography } from '../theme';
import { formatearFechaHora } from '../utils/fecha';
import {
  ESTADOS_TICKET,
  ETIQUETA_CATEGORIA_TICKET,
  ETIQUETA_ESTADO_TICKET,
  ETIQUETA_PRIORIDAD,
  ICONO_ESTADO_TICKET,
  PRIORIDADES_TICKET,
} from '../utils/tickets';

interface Props {
  titulo: string;
  subtitulo: string;
  onAbrir: (id: number) => void;
  onVolver?: () => void;
  onNuevo?: () => void;
  espacioInferior?: number;
}

function TarjetaTicket({ ticket, onPress, mostrarCreador }: { ticket: Ticket; onPress: () => void; mostrarCreador: boolean }) {
  return (
    <GlassPanel tono="strong" radius={16} padding={14} onPress={onPress} accessibilityLabel={`Ticket ${ticket.asunto}, ${ETIQUETA_ESTADO_TICKET[ticket.estado]}`}>
      <View style={styles.filaSuperior}>
        <Icon name={ICONO_ESTADO_TICKET[ticket.estado]} size={18} color={colors.secondary} />
        <Text style={styles.asunto} numberOfLines={1}>
          {ticket.asunto}
        </Text>
        <Text style={styles.numero}>#{ticket.id}</Text>
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {ETIQUETA_CATEGORIA_TICKET[ticket.categoria]}
        {ticket.destino ? ` · ${ticket.destino.nombre}` : ''}
      </Text>
      <View style={styles.etiquetas}>
        <Tag tono="turquoise">{ETIQUETA_ESTADO_TICKET[ticket.estado]}</Tag>
        <Tag icono={ticket.prioridad === 'alta' ? 'priority-high' : undefined}>{`Prioridad ${ETIQUETA_PRIORIDAD[ticket.prioridad].toLowerCase()}`}</Tag>
      </View>
      <Text style={styles.fecha}>
        {formatearFechaHora(ticket.fechaCreacion)}
        {mostrarCreador && ticket.creador.nombre ? ` · ${ticket.creador.nombre}` : ''}
        {ticket.tecnico ? ` · Asignado a ${ticket.tecnico.nombre ?? 'un técnico'}` : ''}
      </Text>
    </GlassPanel>
  );
}

/** Lista de tickets con filtros por estado y prioridad. */
function ListaTickets({ titulo, subtitulo, onAbrir, onVolver, onNuevo, espacioInferior }: Props) {
  const { rol, sesion } = useAuth();
  const esPersonal = rol === 'tecnico' || rol === 'administrador';
  const [estado, setEstado] = useState<EstadoTicket>();
  const [prioridad, setPrioridad] = useState<PrioridadTicket>();
  const [mios, setMios] = useState(false);
  const { datos, error, cargando, refrescando, recargar } = useAsync(
    () => listarTickets({ estado, prioridad, asignadosAMi: mios }),
    [estado, prioridad, mios],
    { recargarAlEnfocar: true },
  );

  return (
    <PantallaApilada
      titulo={titulo}
      subtitulo={subtitulo}
      onVolver={onVolver}
      acciones={onNuevo ? [{ icono: 'add', etiqueta: 'Nuevo reporte', onPress: onNuevo }] : undefined}
      refrescando={refrescando}
      onRefrescar={recargar}
      espacioInferior={espacioInferior}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {ESTADOS_TICKET.map((e) => (
          <FilterChip key={e} compacto activo={estado === e} onPress={() => setEstado(estado === e ? undefined : e)}>
            {ETIQUETA_ESTADO_TICKET[e]}
          </FilterChip>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {PRIORIDADES_TICKET.map((p) => (
          <FilterChip key={p} compacto acento="turquoise" activo={prioridad === p} onPress={() => setPrioridad(prioridad === p ? undefined : p)}>
            {`Prioridad ${ETIQUETA_PRIORIDAD[p].toLowerCase()}`}
          </FilterChip>
        ))}
        {esPersonal && sesion && (
          <FilterChip compacto acento="turquoise" icono="person-pin" activo={mios} onPress={() => setMios(!mios)}>
            Asignados a mí
          </FilterChip>
        )}
      </ScrollView>

      {cargando ? (
        <EstadoCargando mensaje="Cargando tickets…" />
      ) : error && !datos ? (
        <EstadoError error={error} onReintentar={recargar} />
      ) : !datos || datos.length === 0 ? (
        <GlassPanel tono="strong" radius={20}>
          <EstadoMensaje
            icono="inbox"
            titulo={estado || prioridad || mios ? 'Sin tickets con esos filtros' : 'No hay tickets'}
            mensaje={esPersonal ? 'Cuando alguien reporte un problema aparecerá aquí.' : 'Tus reportes aparecerán aquí.'}
            accion={onNuevo ? { texto: 'Reportar un problema', onPress: onNuevo } : undefined}
          />
        </GlassPanel>
      ) : (
        datos.map((t) => <TarjetaTicket key={t.id} ticket={t} mostrarCreador={esPersonal} onPress={() => onAbrir(t.id)} />)
      )}
    </PantallaApilada>
  );
}

/** Pestaña Tickets (técnico y administrador). */
export function TicketsScreen({ navigation }: TabScreenProps<'Tickets'>) {
  const espacio = useEspacioTabBar();
  return (
    <ListaTickets
      titulo="Tickets"
      subtitulo="Reportes de los usuarios"
      espacioInferior={espacio}
      onAbrir={(id) => navigation.navigate('TicketDetalle', { id })}
    />
  );
}

/** "Mis reportes" del turista (desde Perfil). */
export function MisReportesScreen({ navigation }: AppScreenProps<'MisReportes'>) {
  return (
    <ListaTickets
      titulo="Mis reportes"
      subtitulo="Problemas que reportaste y su estado"
      onVolver={navigation.goBack}
      onNuevo={() => navigation.navigate('NuevoTicket')}
      onAbrir={(id) => navigation.navigate('TicketDetalle', { id })}
    />
  );
}

const styles = StyleSheet.create({
  filtros: { gap: spacing.sm, paddingRight: spacing.screen },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  asunto: { ...typography.titleMd, color: colors.textStrong, flex: 1 },
  numero: { ...typography.labelMd, color: colors.textSubtle },
  meta: { ...typography.bodyMd, color: colors.textMuted, marginTop: 4 },
  etiquetas: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  fecha: { ...typography.labelMd, color: colors.textSubtle, marginTop: spacing.sm },
});
