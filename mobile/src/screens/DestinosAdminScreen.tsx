import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { PantallaApilada } from '../components/PantallaApilada';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { Tag } from '../components/Tag';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { cambiarEstadoDestino, listarDestinosAdmin } from '../services/admin';
import { mensajeDeError } from '../services/api';
import type { Destino, EstadoDestino } from '../services/tipos';
import { colors, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { ESTADOS_DESTINO, ETIQUETA_ESTADO_DESTINO } from '../utils/tickets';

/** Destinos para el administrador: todos (también los ocultos), su estado y acceso a editar. */
export function DestinosAdminScreen({ navigation }: TabScreenProps<'Destinos'>) {
  const espacio = useEspacioTabBar();
  const [filtro, setFiltro] = useState<EstadoDestino>();
  const { datos, error, cargando, refrescando, recargar } = useAsync(listarDestinosAdmin, [], { recargarAlEnfocar: true });
  const lista = useMemo(() => (datos ?? []).filter((d) => !filtro || d.estado === filtro), [datos, filtro]);

  const opciones = (d: Destino) => {
    const cambiar = (estado: EstadoDestino) => async () => {
      try {
        await cambiarEstadoDestino(d.id, estado);
        recargar();
      } catch (e) {
        Alert.alert('No se pudo cambiar el estado', mensajeDeError(e));
      }
    };
    Alert.alert(d.nombre, `Estado actual: ${ETIQUETA_ESTADO_DESTINO[d.estado]}`, [
      { text: 'Editar datos', onPress: () => navigation.navigate('EditarDestino', { id: d.id }) },
      ...(d.estado !== 'abierto' ? [{ text: d.estado === 'inactivo' ? 'Mostrar (abierto)' : 'Reabrir', onPress: cambiar('abierto') }] : []),
      ...(d.estado !== 'inactivo' ? [{ text: 'Ocultar', style: 'destructive' as const, onPress: cambiar('inactivo') }] : []),
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
      ) : (
        lista.map((d) => (
          <GlassPanel key={d.id} tono="strong" radius={16} padding={14} onPress={() => opciones(d)} accessibilityLabel={`${d.nombre}, ${ETIQUETA_ESTADO_DESTINO[d.estado]}`}>
            <View style={styles.fila}>
              <Text style={styles.nombre} numberOfLines={1}>
                {d.nombre}
              </Text>
              <Tag tono={d.estado === 'abierto' ? 'turquoise' : 'neutral'}>{ETIQUETA_ESTADO_DESTINO[d.estado]}</Tag>
            </View>
            <Text style={styles.meta}>
              {CATEGORIAS[d.categoria].singular} · capacidad {d.capacidad}
              {d.horario ? ` · ${d.horario.apertura}–${d.horario.cierre}` : ''}
            </Text>
          </GlassPanel>
        ))
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  filtros: { gap: spacing.sm, paddingRight: spacing.screen },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nombre: { ...typography.titleMd, color: colors.textStrong, flex: 1 },
  meta: { ...typography.labelMd, color: colors.textMuted, marginTop: 4 },
});
