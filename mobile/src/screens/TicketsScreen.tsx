import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChipEstadoTicket, ChipPrioridad } from '../components/ChipsTicket';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PantallaApilada } from '../components/PantallaApilada';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { TarjetaResumen } from '../components/TarjetaResumen';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { obtenerPerfil } from '../services/perfil';
import { listarTickets } from '../services/tickets';
import type { EstadoTicket, PrioridadTicket, Ticket } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, typography } from '../theme';
import { formatearFechaHora } from '../utils/fecha';
import { resumenTecnico } from '../utils/resumenTickets';
import { primerNombre } from '../utils/validacion';
import {
  ESTADOS_TICKET,
  ETIQUETA_CATEGORIA_TICKET,
  ETIQUETA_ESTADO_TICKET,
  ETIQUETA_PRIORIDAD,
  ICONO_ESTADO_TICKET,
  PRIORIDADES_TICKET,
} from '../utils/tickets';

function TarjetaTicket({ ticket, onPress, mostrarCreador }: { ticket: Ticket; onPress: () => void; mostrarCreador: boolean }) {
  return (
    <GlassPanel
      tono="strong"
      calidad="ligera"
      radius={16}
      padding={14}
      onPress={onPress}
      accessibilityLabel={`Ticket ${ticket.id}: ${ticket.asunto}. ${ETIQUETA_ESTADO_TICKET[ticket.estado]}, prioridad ${ETIQUETA_PRIORIDAD[ticket.prioridad].toLowerCase()}. ${ETIQUETA_CATEGORIA_TICKET[ticket.categoria]}${ticket.destino ? `, ${ticket.destino.nombre}` : ''}`}
    >
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
        <ChipEstadoTicket estado={ticket.estado} tamano="sm" />
        <ChipPrioridad prioridad={ticket.prioridad} tamano="sm" />
      </View>
      <Text style={styles.fecha}>
        {formatearFechaHora(ticket.fechaCreacion)}
        {mostrarCreador && ticket.creador.nombre ? ` · ${ticket.creador.nombre}` : ''}
        {ticket.tecnico ? ` · Asignado a ${ticket.tecnico.nombre ?? 'un técnico'}` : ''}
      </Text>
    </GlassPanel>
  );
}

/** Filtros y resultado de la lista de tickets. */
function useListaTickets() {
  const { rol, sesion } = useAuth();
  const esPersonal = rol === 'tecnico' || rol === 'administrador';
  const [estado, setEstado] = useState<EstadoTicket>();
  const [prioridad, setPrioridad] = useState<PrioridadTicket>();
  const [mios, setMios] = useState(false);
  const consulta = useAsync(
    () => listarTickets({ estado, prioridad, asignadosAMi: mios }),
    [estado, prioridad, mios],
    { recargarAlEnfocar: true },
  );
  return { esPersonal, puedeFiltrarMios: esPersonal && Boolean(sesion), estado, setEstado, prioridad, setPrioridad, mios, setMios, ...consulta };
}

type ListaTicketsEstado = ReturnType<typeof useListaTickets>;

/** Chips de filtros y tarjetas (sin la pantalla alrededor, para poder incrustarlo). */
function ContenidoTickets({ lista, onAbrir, onNuevo }: { lista: ListaTicketsEstado; onAbrir: (id: number) => void; onNuevo?: () => void }) {
  const { esPersonal, estado, setEstado, prioridad, setPrioridad, mios, setMios, datos, error, cargando, recargar } = lista;
  return (
    <>
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
        {lista.puedeFiltrarMios && (
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
            titulo={estado || prioridad || mios ? 'Sin tickets con esos filtros' : esPersonal ? 'No hay tickets' : 'Aún no has reportado nada'}
            mensaje={esPersonal ? 'Cuando alguien reporte un problema aparecerá aquí.' : 'Tus reportes y su estado aparecerán aquí.'}
            accion={onNuevo ? { texto: 'Reportar un problema', onPress: onNuevo } : undefined}
          />
        </GlassPanel>
      ) : (
        datos.map((t) => <TarjetaTicket key={t.id} ticket={t} mostrarCreador={esPersonal} onPress={() => onAbrir(t.id)} />)
      )}
    </>
  );
}

/**
 * Pestaña Tickets. Para el técnico es su inicio: saludo con su rol y un resumen tocable
 * (asignados a mí, abiertos, en revisión) que aplica el filtro de la lista. El administrador
 * ve el título y la lista (su resumen está en el Panel).
 */
export function TicketsScreen({ navigation }: TabScreenProps<'Tickets'>) {
  const espacio = useEspacioTabBar();
  const { rol, sesion } = useAuth();
  const esTecnico = rol === 'tecnico';
  const lista = useListaTickets();
  const perfil = useAsync(() => (esTecnico ? obtenerPerfil() : Promise.resolve(null)), [esTecnico]);
  const todos = useAsync(() => (esTecnico ? listarTickets() : Promise.resolve(null)), [esTecnico], { recargarAlEnfocar: true });
  const r = resumenTecnico(todos.datos, sesion?.user.id);

  const filtrar = (estado: EstadoTicket | undefined, mios: boolean) => {
    lista.setEstado(estado);
    lista.setPrioridad(undefined);
    lista.setMios(mios);
  };
  const recargar = () => {
    lista.recargar();
    if (esTecnico) todos.recargar();
  };

  return (
    <PantallaApilada
      titulo="Tickets"
      saludo={esTecnico ? { nombre: primerNombre(perfil.datos?.nombre), rol: 'tecnico' } : undefined}
      subtitulo={esTecnico ? undefined : 'Reportes de los usuarios'}
      refrescando={lista.refrescando}
      onRefrescar={recargar}
      espacioInferior={espacio}
    >
      {esTecnico && (
        <TarjetaResumen
          titulo="Tus tickets"
          subtitulo="Toca una cifra para filtrar la lista"
          cargando={todos.cargando}
          error={!todos.datos ? todos.error : undefined}
          onReintentar={todos.recargar}
          cifras={[
            { clave: 'mios', valor: r.asignadosAMi, etiqueta: 'Asignados a mí', icono: 'person-pin', onPress: () => filtrar(undefined, true),
              accesible: `${r.asignadosAMi} asignados a mí. Filtrar la lista` },
            { clave: 'abiertos', valor: r.abiertos, etiqueta: 'Abiertos', icono: 'mark-email-unread', onPress: () => filtrar('abierto', false),
              accesible: `${r.abiertos} abiertos. Filtrar la lista` },
            { clave: 'revision', valor: r.enRevision, etiqueta: 'En revisión', icono: 'manage-search', onPress: () => filtrar('en_revision', false),
              accesible: `${r.enRevision} en revisión. Filtrar la lista` },
          ]}
        />
      )}
      <ContenidoTickets lista={lista} onAbrir={(id) => navigation.navigate('TicketDetalle', { id })} />
    </PantallaApilada>
  );
}

/** "Mis reportes" del turista: pestaña dentro de "Reportar un problema". */
export function MisReportes({ onAbrir, onNuevo }: { onAbrir: (id: number) => void; onNuevo?: () => void }) {
  const lista = useListaTickets();
  return <ContenidoTickets lista={lista} onAbrir={onAbrir} onNuevo={onNuevo} />;
}

const styles = StyleSheet.create({
  filtros: { gap: spacing.sm, paddingRight: spacing.screen },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  asunto: { ...typography.titleMd, color: colors.textStrong, flex: 1 },
  numero: { ...typography.labelMd, color: colors.textMuted },
  meta: { ...typography.bodyMd, color: colors.textMuted, marginTop: 4 },
  etiquetas: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  fecha: { ...typography.labelMd, color: colors.textMuted, marginTop: spacing.sm },
});
