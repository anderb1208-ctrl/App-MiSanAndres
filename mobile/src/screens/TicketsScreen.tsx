import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EsqueletoLista } from '../components/Esqueleto';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PantallaApilada } from '../components/PantallaApilada';
import { EstadoError, EstadoMensaje } from '../components/StateView';
import { TarjetaTicket } from '../components/TarjetaTicket';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { listarTickets } from '../services/tickets';
import { useAuth } from '../store/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { conteosChips, filtrarTickets, ORDENES, ordenarTickets, type FiltrosTickets, type OrdenTickets } from '../utils/filtrosTickets';
import { ESTADOS_TICKET, ETIQUETA_ESTADO_TICKET, ETIQUETA_PRIORIDAD, PRIORIDADES_TICKET } from '../utils/tickets';

/**
 * Todos los tickets que el usuario puede ver (una sola consulta) y los filtros aplicados en la app:
 * así cada chip muestra su conteo y la búsqueda es instantánea.
 */
function useListaTickets(inicial: FiltrosTickets = {}) {
  const { rol, sesion } = useAuth();
  const esPersonal = rol === 'tecnico' || rol === 'administrador';
  const [filtros, setFiltros] = useState<FiltrosTickets>(inicial);
  const [orden, setOrden] = useState<OrdenTickets>('recientes');
  const consulta = useAsync(() => listarTickets(), [], { recargarAlEnfocar: true });
  const yo = sesion?.user.id ?? null;
  const visibles = useMemo(() => ordenarTickets(filtrarTickets(consulta.datos, filtros, yo), orden), [consulta.datos, filtros, yo, orden]);
  const conteos = useMemo(() => conteosChips(consulta.datos, filtros, yo), [consulta.datos, filtros, yo]);
  return { esPersonal, yo, filtros, setFiltros, orden, setOrden, visibles, conteos, ...consulta };
}

type ListaTicketsEstado = ReturnType<typeof useListaTickets>;

const hayFiltros = (f: FiltrosTickets) => Boolean(f.estado || f.prioridad || f.mios || f.sinAsignar || f.texto?.trim());

/** Búsqueda, chips de filtros (una fila con scroll), orden y tarjetas. Sin la pantalla alrededor. */
function ContenidoTickets({ lista, onAbrir, onNuevo }: { lista: ListaTicketsEstado; onAbrir: (id: number) => void; onNuevo?: () => void }) {
  const { esPersonal, filtros, setFiltros, orden, setOrden, visibles, conteos, datos, error, cargando, recargar } = lista;
  const cambiar = (parcial: Partial<FiltrosTickets>) => setFiltros((f) => ({ ...f, ...parcial }));
  const siguienteOrden = ORDENES[(ORDENES.findIndex((o) => o.valor === orden) + 1) % ORDENES.length]!;
  const etiquetaOrden = ORDENES.find((o) => o.valor === orden)!.etiqueta;

  return (
    <>
      <View style={styles.buscador}>
        <Icon name="search" size={20} color={colors.textMuted} />
        <TextInput
          value={filtros.texto ?? ''}
          onChangeText={(texto) => cambiar({ texto })}
          placeholder="Buscar por asunto, destino o número"
          placeholderTextColor={colors.textSubtle}
          style={styles.entrada}
          accessibilityLabel="Buscar tickets"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Estado, prioridad y asignación en una sola fila con scroll horizontal. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {ESTADOS_TICKET.map((e) => (
          <FilterChip key={e} compacto cuenta={conteos.estado[e]} activo={filtros.estado === e} onPress={() => cambiar({ estado: filtros.estado === e ? undefined : e })}>
            {ETIQUETA_ESTADO_TICKET[e]}
          </FilterChip>
        ))}
        <View style={styles.separadorChips} />
        {PRIORIDADES_TICKET.map((p) => (
          <FilterChip
            key={p}
            compacto
            acento="turquoise"
            cuenta={conteos.prioridad[p]}
            activo={filtros.prioridad === p}
            onPress={() => cambiar({ prioridad: filtros.prioridad === p ? undefined : p })}
          >
            {`Prioridad ${ETIQUETA_PRIORIDAD[p].toLowerCase()}`}
          </FilterChip>
        ))}
        {esPersonal && (
          <>
            <View style={styles.separadorChips} />
            <FilterChip compacto acento="turquoise" icono="person-pin" cuenta={conteos.mios} activo={Boolean(filtros.mios)} onPress={() => cambiar({ mios: !filtros.mios })}>
              Asignados a mí
            </FilterChip>
            <FilterChip
              compacto
              acento="turquoise"
              icono="assignment-late"
              cuenta={conteos.sinAsignar}
              activo={Boolean(filtros.sinAsignar)}
              onPress={() => cambiar({ sinAsignar: !filtros.sinAsignar })}
            >
              Sin asignar
            </FilterChip>
          </>
        )}
      </ScrollView>

      <View style={styles.barraResultados}>
        <Text style={styles.resultados} accessibilityLiveRegion="polite">
          {datos ? `${visibles.length} ${visibles.length === 1 ? 'ticket' : 'tickets'}` : ' '}
        </Text>
        <Pressable
          onPress={() => setOrden(siguienteOrden.valor)}
          accessibilityRole="button"
          accessibilityLabel={`Orden: ${etiquetaOrden}. Cambiar a ${siguienteOrden.etiqueta.toLowerCase()}`}
          hitSlop={{ top: 6, bottom: 6 }}
          style={({ pressed }) => [styles.orden, pressed && styles.ordenPresionado]}
        >
          <Icon name="swap-vert" size={18} color={colors.textLink} />
          <Text style={styles.ordenTexto}>{etiquetaOrden}</Text>
        </Pressable>
      </View>

      {cargando ? (
        <EsqueletoLista etiqueta="Cargando tickets" />
      ) : error && !datos ? (
        <EstadoError error={error} onReintentar={recargar} />
      ) : visibles.length === 0 ? (
        <GlassPanel tono="strong" radius={20}>
          {hayFiltros(filtros) ? (
            <EstadoMensaje
              icono="filter-alt-off"
              titulo="Sin tickets con esos filtros"
              mensaje="Prueba con otro estado o prioridad, o borra la búsqueda."
              accion={{ texto: 'Quitar filtros', onPress: () => setFiltros({}) }}
            />
          ) : (
            <EstadoMensaje
              icono="inbox"
              titulo={esPersonal ? 'No hay tickets' : 'Aún no has reportado nada'}
              mensaje={esPersonal ? 'Cuando alguien reporte un problema aparecerá aquí.' : 'Tus reportes y su estado aparecerán aquí.'}
              accion={onNuevo ? { texto: 'Reportar un problema', onPress: onNuevo } : undefined}
            />
          )}
        </GlassPanel>
      ) : (
        visibles.map((t) => <TarjetaTicket key={t.id} ticket={t} mostrarCreador={esPersonal} onPress={() => onAbrir(t.id)} />)
      )}
    </>
  );
}

/** Pestaña Tickets (técnico y administrador). Puede abrirse con un filtro desde los paneles. */
export function TicketsScreen({ navigation, route }: TabScreenProps<'Tickets'>) {
  const espacio = useEspacioTabBar();
  const lista = useListaTickets();
  const params = route.params;
  const { setFiltros } = lista;

  // El filtro que llega desde un panel reemplaza al actual y se consume (tocar la misma cifra lo vuelve a aplicar).
  useEffect(() => {
    if (!params) return;
    setFiltros({ estado: params.estado, prioridad: params.prioridad, mios: params.mios, sinAsignar: params.sinAsignar });
    navigation.setParams({ estado: undefined, prioridad: undefined, mios: undefined, sinAsignar: undefined });
  }, [params, navigation, setFiltros]);

  return (
    <PantallaApilada
      titulo="Tickets"
      subtitulo="Reportes de los usuarios"
      espacioInferior={espacio}
      refrescando={lista.refrescando}
      onRefrescar={lista.recargar}
    >
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
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.gutter,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassStrong,
  },
  entrada: { flex: 1, ...typography.bodyLg, color: colors.textStrong, paddingVertical: 10 },
  filtros: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.screen, alignItems: 'center' },
  separadorChips: { width: StyleSheet.hairlineWidth * 2, height: 24, backgroundColor: colors.border, marginHorizontal: 2 },
  barraResultados: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultados: { ...typography.labelBold, color: colors.textMuted },
  orden: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: spacing.sm, borderRadius: radius.md },
  ordenPresionado: { backgroundColor: colors.pressedOverlay },
  ordenTexto: { ...typography.labelBold, color: colors.textLink },
});
