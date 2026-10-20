import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChipEstadoDestino } from '../components/ChipsTicket';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { HojaCierreTemporal } from '../components/HojaCierreTemporal';
import { PantallaApilada } from '../components/PantallaApilada';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { cambiarEstadoDestino, listarDestinosAdmin } from '../services/admin';
import { mensajeDeError } from '../services/api';
import type { Destino, EstadoDestino, ResultadoAviso } from '../services/tipos';
import { colors, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { ESTADOS_DESTINO, ETIQUETA_ESTADO_DESTINO } from '../utils/tickets';

/** Destinos para el administrador: todos (también los ocultos), su estado y acceso a editar. */
export function DestinosAdminScreen({ navigation }: TabScreenProps<'Destinos'>) {
  const espacio = useEspacioTabBar();
  const [filtro, setFiltro] = useState<EstadoDestino>();
  const { datos, error, cargando, refrescando, recargar } = useAsync(listarDestinosAdmin, [], { recargarAlEnfocar: true });
  const [cerrando, setCerrando] = useState<Destino | null>(null);
  const lista = useMemo(() => (datos ?? []).filter((d) => !filtro || d.estado === filtro), [datos, filtro]);

  /** Resumen del push enviado (cierre o reapertura) para el administrador. */
  const informarAviso = (aviso: ResultadoAviso | null) => {
    if (!aviso) return;
    const accion = aviso.tipo === 'cierre' ? 'el cierre' : 'la reapertura';
    Alert.alert(
      'Aviso enviado',
      aviso.error
        ? `El estado cambió, pero no se pudo avisar: ${aviso.error}`
        : aviso.destinatarios === 0
          ? `Nadie tiene este destino en favoritos con el aviso de ${aviso.tipo} activo y un teléfono registrado.`
          : `Se avisó de ${accion} a ${aviso.enviados} de ${aviso.destinatarios} dispositivo(s).`,
    );
  };

  const cambiar = async (d: Destino, estado: EstadoDestino, cierre?: { motivo?: string; hasta?: string }) => {
    try {
      const { aviso } = await cambiarEstadoDestino(d.id, estado, cierre);
      recargar();
      informarAviso(aviso);
    } catch (e) {
      Alert.alert('No se pudo cambiar el estado', mensajeDeError(e));
      throw e;
    }
  };

  const opciones = (d: Destino) => {
    Alert.alert(d.nombre, `Estado actual: ${ETIQUETA_ESTADO_DESTINO[d.estado]}${d.cierre?.motivo ? ` (${d.cierre.motivo})` : ''}`, [
      { text: 'Editar datos', onPress: () => navigation.navigate('EditarDestino', { id: d.id }) },
      ...(d.estado === 'abierto' ? [{ text: 'Cerrar temporalmente', onPress: () => setCerrando(d) }] : []),
      ...(d.estado === 'cerrado_temporal' ? [{ text: 'Reabrir y avisar', onPress: () => void cambiar(d, 'abierto').catch(() => undefined) }] : []),
      ...(d.estado === 'inactivo' ? [{ text: 'Mostrar (abierto)', onPress: () => void cambiar(d, 'abierto').catch(() => undefined) }] : []),
      ...(d.estado !== 'inactivo' ? [{ text: 'Ocultar', style: 'destructive' as const, onPress: () => void cambiar(d, 'inactivo').catch(() => undefined) }] : []),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <PantallaApilada
      titulo="Destinos"
      subtitulo={`${datos?.length ?? 0} en total`}
      espacioInferior={espacio}
      refrescando={refrescando}
      onRefrescar={recargar}
      acciones={[{ icono: 'add', etiqueta: 'Nuevo destino', onPress: () => navigation.navigate('EditarDestino') }]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {ESTADOS_DESTINO.map((e) => (
          <FilterChip key={e} compacto activo={filtro === e} onPress={() => setFiltro(filtro === e ? undefined : e)}>
            {ETIQUETA_ESTADO_DESTINO[e]}
          </FilterChip>
        ))}
      </ScrollView>
      {cargando ? (
        <EstadoCargando mensaje="Cargando destinos…" />
      ) : error && !datos ? (
        <EstadoError error={error} onReintentar={recargar} />
      ) : lista.length === 0 ? (
        <GlassPanel tono="strong" radius={20}>
          <EstadoMensaje
            icono="place"
            titulo={filtro ? 'Ningún destino en ese estado' : 'Aún no hay destinos'}
            mensaje={filtro ? `No hay destinos "${ETIQUETA_ESTADO_DESTINO[filtro].toLowerCase()}".` : 'Crea el primero con el botón +.'}
            accion={filtro ? { texto: 'Ver todos', onPress: () => setFiltro(undefined) } : undefined}
          />
        </GlassPanel>
      ) : (
        lista.map((d) => (
          <GlassPanel key={d.id} tono="strong" calidad="ligera" radius={16} padding={14} onPress={() => opciones(d)} accessibilityLabel={`${d.nombre}, ${ETIQUETA_ESTADO_DESTINO[d.estado]}`}>
            <View style={styles.fila}>
              <Text style={styles.nombre} numberOfLines={1}>
                {d.nombre}
              </Text>
              <ChipEstadoDestino estado={d.estado} tamano="sm" />
            </View>
            {d.cierre?.motivo ? <Text style={styles.meta}>Motivo: {d.cierre.motivo}</Text> : null}
            <Text style={styles.meta}>
              {CATEGORIAS[d.categoria].singular} · capacidad {d.capacidad}
              {d.horario ? ` · ${d.horario.apertura}–${d.horario.cierre}` : ''}
            </Text>
          </GlassPanel>
        ))
      )}
      <HojaCierreTemporal
        destino={cerrando}
        onCerrar={() => setCerrando(null)}
        onConfirmar={async (motivo, hasta) => {
          if (!cerrando) return;
          await cambiar(cerrando, 'cerrado_temporal', { motivo, hasta });
          setCerrando(null);
        }}
      />
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  filtros: { gap: spacing.sm, paddingRight: spacing.screen },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nombre: { ...typography.titleMd, color: colors.textStrong, flex: 1 },
  meta: { ...typography.labelMd, color: colors.textMuted, marginTop: 4 },
});
