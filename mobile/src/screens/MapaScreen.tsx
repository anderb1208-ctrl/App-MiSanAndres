import { useEffect, useMemo, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { IndicadorOcupacion } from '../components/IndicadorOcupacion';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenBackground } from '../components/ScreenBackground';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { listarDestinos } from '../services/destinos';
import type { Destino } from '../services/tipos';
import { colors, occupancyColors, radius, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { ETIQUETA_NIVEL, NIVELES } from '../utils/ocupacion';

/**
 * MVP: el mapa interactivo (Google Maps) llega después. Por ahora se listan los
 * destinos de norte a sur con su ubicación en texto y sus coordenadas.
 */
export function MapaScreen({ navigation, route }: TabScreenProps<'Mapa'>) {
  useBarraEstado('dark');
  const espacioInferior = useEspacioTabBar();
  const lista = useRef<FlatList<Destino>>(null);
  const resaltado = route.params?.destinoId;
  const { datos, error, cargando, refrescando, recargar } = useAsync(() => listarDestinos(), [], {
    recargarAlEnfocar: true,
  });

  const destinos = useMemo(() => [...(datos ?? [])].sort((a, b) => b.latitud - a.latitud), [datos]);

  // Al llegar desde "Ver ubicación" del detalle, lleva la lista hasta ese destino (una sola vez,
  // no en cada recarga al volver a la pestaña).
  const desplazadoA = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (resaltado === undefined || desplazadoA.current === resaltado) return;
    const indice = destinos.findIndex((d) => d.id === resaltado);
    if (indice < 0) return;
    desplazadoA.current = resaltado;
    requestAnimationFrame(() => lista.current?.scrollToIndex({ index: indice, viewPosition: 0.3, animated: true }));
  }, [destinos, resaltado]);

  const vacio = () => {
    if (cargando) return <EstadoCargando mensaje="Cargando ubicaciones…" />;
    if (error) return <EstadoError error={error} onReintentar={recargar} />;
    return <EstadoMensaje icono="location-off" titulo="Sin destinos" mensaje="Aún no hay destinos para mostrar." />;
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']}>
        <ScreenHeader titulo="Mapa de destinos" subtitulo="Ubicación de cada lugar, de norte a sur de la isla" />
        <View style={styles.leyenda}>
          {NIVELES.map((n) => (
            <View key={n} style={styles.leyendaItem}>
              <View style={[styles.punto, { backgroundColor: occupancyColors[n].main }]} />
              <Text style={styles.leyendaTexto}>{ETIQUETA_NIVEL[n]}</Text>
            </View>
          ))}
          <Text style={[styles.leyendaTexto, styles.leyendaNota]}>Ocupación prevista ahora</Text>
        </View>
      </SafeAreaView>

      <FlatList
        ref={lista}
        data={cargando || (error && !datos) ? [] : destinos}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={[styles.lista, { paddingBottom: espacioInferior }]}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListEmptyComponent={vacio()}
        onScrollToIndexFailed={({ index }) =>
          setTimeout(() => lista.current?.scrollToIndex({ index, viewPosition: 0.3 }), 300)
        }
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={colors.secondary} />}
        renderItem={({ item }) => {
          const activo = item.id === resaltado;
          return (
            <GlassPanel
              tono="strong"
              radius={radius.xl}
              padding={14}
              onPress={() => navigation.navigate('DetalleDestino', { id: item.id })}
              accessibilityLabel={`${item.nombre}. ${item.ubicacion}`}
              style={activo && styles.activo}
            >
              <View style={styles.fila}>
                <View style={[styles.pin, activo && styles.pinActivo]}>
                  <Icon name="location-on" size={22} color={activo ? colors.white : colors.secondary} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  <Text style={styles.categoria}>{CATEGORIAS[item.categoria].singular}</Text>
                  <Text style={styles.ubicacion}>{item.ubicacion}</Text>
                  <Text style={styles.coordenadas}>
                    {item.latitud.toFixed(4)}, {item.longitud.toFixed(4)}
                  </Text>
                  <IndicadorOcupacion ocupacion={item.ocupacionActual} />
                </View>
                <Icon name="chevron-right" size={22} color={colors.textSubtle} />
              </View>
            </GlassPanel>
          );
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  leyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.gutter,
  },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { ...typography.labelMd, color: colors.textMuted },
  leyendaNota: { marginLeft: 'auto', color: colors.textSubtle },
  lista: { paddingHorizontal: spacing.screen, paddingTop: spacing.xs, flexGrow: 1 },
  separador: { height: 10 },
  activo: { borderColor: colors.secondary, borderWidth: 2 },
  fila: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinActivo: { backgroundColor: colors.secondary },
  info: { flex: 1, gap: 3 },
  nombre: { ...typography.titleMd, color: colors.textStrong },
  categoria: { ...typography.labelMd, color: colors.secondary },
  ubicacion: { ...typography.bodyMd, color: colors.textMuted },
  coordenadas: { ...typography.labelMd, color: colors.textSubtle, marginBottom: 4 },
});
