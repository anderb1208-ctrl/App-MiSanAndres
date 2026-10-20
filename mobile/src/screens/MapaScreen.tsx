import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { IndicadorOcupacion } from '../components/IndicadorOcupacion';
import { LeyendaMapa } from '../components/LeyendaMapa';
import { MarcadorDestino } from '../components/MarcadorDestino';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { ScreenBackground } from '../components/ScreenBackground';
import { TarjetaDestinoMapa } from '../components/TarjetaDestinoMapa';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { useUbicacion, type Ubicacion } from '../hooks/useUbicacion';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { obtenerMapa } from '../services/mapa';
import type { CategoriaDestino, DestinoMapa } from '../services/tipos';
import { colors, mapColors, radius, spacing, typography } from '../theme';
import { CATEGORIAS, LISTA_CATEGORIAS } from '../utils/categorias';
import { textoSinClima } from '../utils/clima';
import { formatearDistancia, ordenarPorDistancia } from '../utils/distancia';
import { colorMarcador, DELTA_CERCANO, estadoMarcador, PROVEEDOR_MAPA, REGION_SAN_ANDRES } from '../utils/mapa';

type Vista = 'mapa' | 'lista';

/** Si el mapa no termina de cargar en este tiempo (p. ej. Android sin clave), se ofrece la lista. */
const ESPERA_MAPA_MS = 10_000;

function textoUbicacion(u: Ubicacion): string | null {
  if (u.estado === 'denegada') {
    return u.puedePreguntar
      ? 'Sin permiso de ubicación: no podemos mostrarte en el mapa ni ordenar por cercanía.'
      : 'La ubicación está desactivada para MiSanAndrés. Puedes activarla en Ajustes.';
  }
  if (u.estado === 'error') return 'No pudimos obtener tu ubicación. Revisa que el GPS esté activo.';
  return null;
}

/** Conmutador Mapa / Lista. */
function SelectorVista({ vista, onCambiar }: { vista: Vista; onCambiar: (v: Vista) => void }) {
  const opciones: { valor: Vista; texto: string; icono: 'map' | 'list' }[] = [
    { valor: 'mapa', texto: 'Mapa', icono: 'map' },
    { valor: 'lista', texto: 'Lista', icono: 'list' },
  ];
  return (
    <View style={styles.selector} accessibilityRole="tablist">
      {opciones.map((o) => {
        const activo = vista === o.valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambiar(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            style={[styles.selectorOpcion, activo && styles.selectorActivo]}
          >
            <Icon name={o.icono} size={18} color={activo ? colors.white : colors.textMuted} />
            <Text style={[styles.selectorTexto, activo && styles.selectorTextoActivo]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Círculo con el color de ocupación y el ícono de categoría (igual al marcador). */
function Pin({ destino }: { destino: DestinoMapa }) {
  return (
    <View style={[styles.pin, { backgroundColor: colorMarcador(estadoMarcador(destino.ocupacion)) }]}>
      <Icon name={CATEGORIAS[destino.categoria].icono} size={20} color={colors.white} />
    </View>
  );
}

export function MapaScreen({ navigation, route }: TabScreenProps<'Mapa'>) {
  useBarraEstado('dark');
  const espacioInferior = useEspacioTabBar();
  const ubicacion = useUbicacion();
  const mapa = useRef<MapView>(null);
  const [vista, setVista] = useState<Vista>('mapa');
  const [categoria, setCategoria] = useState<CategoriaDestino>();
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [mapaLento, setMapaLento] = useState(false);

  const { datos, error, cargando, refrescando, recargar } = useAsync(obtenerMapa, [], { recargarAlEnfocar: true });

  const destinos = useMemo(
    () => (datos?.destinos ?? []).filter((d) => !categoria || d.categoria === categoria),
    [datos, categoria],
  );
  const ordenados = useMemo(() => ordenarPorDistancia(destinos, ubicacion.coords), [destinos, ubicacion.coords]);
  const elegido = ordenados.find((o) => o.lugar.id === seleccionado) ?? null;

  // Llegada desde "Ver en el mapa" del detalle: muestra el mapa con ese destino seleccionado.
  const destinoParam = route.params?.destinoId;
  useEffect(() => {
    if (destinoParam === undefined) return;
    setVista('mapa');
    setCategoria(undefined);
    setSeleccionado(destinoParam);
    navigation.setParams({ destinoId: undefined });
  }, [destinoParam, navigation]);

  // Centra el mapa en el destino elegido (un poco más arriba, para que no lo tape la tarjeta).
  const elegidoId = elegido?.lugar.id;
  useEffect(() => {
    if (!mapaListo || !elegido) return;
    mapa.current?.animateToRegion(
      {
        latitude: elegido.lugar.latitud - DELTA_CERCANO.latitudeDelta * 0.2,
        longitude: elegido.lugar.longitud,
        ...DELTA_CERCANO,
      },
      400,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaListo, elegidoId]);

  // Respaldo: si el mapa no carga, se avisa y se ofrece la lista.
  useEffect(() => {
    if (vista !== 'mapa' || mapaListo) return;
    const id = setTimeout(() => setMapaLento(true), ESPERA_MAPA_MS);
    return () => clearTimeout(id);
  }, [vista, mapaListo]);

  const centrarEnMi = () => {
    if (ubicacion.coords) {
      mapa.current?.animateToRegion(
        { latitude: ubicacion.coords.latitud, longitude: ubicacion.coords.longitud, ...DELTA_CERCANO },
        400,
      );
    } else if (ubicacion.estado === 'denegada' && !ubicacion.puedePreguntar) {
      void Linking.openSettings();
    } else {
      ubicacion.actualizar();
    }
  };

  const abrirDetalle = (id: number) => navigation.navigate('DetalleDestino', { id });
  const avisoUbicacion = textoUbicacion(ubicacion);

  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <FilterChip activo={!categoria} onPress={() => setCategoria(undefined)}>
        Todos
      </FilterChip>
      {LISTA_CATEGORIAS.map((c) => (
        <FilterChip
          key={c}
          icono={CATEGORIAS[c].icono}
          activo={categoria === c}
          onPress={() => {
            setCategoria(c);
            setSeleccionado(null);
          }}
        >
          {CATEGORIAS[c].plural}
        </FilterChip>
      ))}
    </ScrollView>
  );

  const vistaMapa = (
    <View style={styles.mapaContenedor}>
      <MapView
        ref={mapa}
        provider={PROVEEDOR_MAPA}
        style={StyleSheet.absoluteFill}
        initialRegion={REGION_SAN_ANDRES}
        showsUserLocation={ubicacion.estado === 'lista'}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: espacioInferior, left: 0 }}
        onMapReady={() => {
          setMapaListo(true);
          setMapaLento(false);
        }}
        onPress={(e) => {
          if (e.nativeEvent.action !== 'marker-press') setSeleccionado(null);
        }}
      >
        {destinos.map((d) => (
          <MarcadorDestino key={d.id} destino={d} seleccionado={d.id === seleccionado} onPress={setSeleccionado} />
        ))}
      </MapView>

      <LeyendaMapa style={styles.leyenda} />
      <IconButton
        icono={ubicacion.coords ? 'my-location' : 'location-searching'}
        etiqueta="Centrar el mapa en mi ubicación"
        tono="glass"
        flotante
        onPress={centrarEnMi}
        style={styles.centrar}
      />

      <View style={[styles.abajo, { bottom: espacioInferior + spacing.gutter }]} pointerEvents="box-none">
        {mapaLento && !mapaListo && (
          <GlassPanel tono="strong" radius={radius.lg} padding={12} style={styles.aviso}>
            <Text style={styles.avisoTexto}>El mapa está tardando en cargar. Puedes ver los destinos en la lista.</Text>
            <Button variante="glass" icono="list" onPress={() => setVista('lista')}>
              Ver lista
            </Button>
          </GlassPanel>
        )}
        {cargando && (
          <GlassPanel tono="strong" radius={radius.full} padding={10} style={styles.pildora}>
            <Text style={styles.avisoTexto}>Cargando destinos…</Text>
          </GlassPanel>
        )}
        {error && !datos ? (
          <GlassPanel tono="strong" radius={radius.xl} padding={0}>
            <EstadoError error={error} onReintentar={recargar} style={styles.errorMapa} />
          </GlassPanel>
        ) : null}
        {datos && destinos.length === 0 && (
          <GlassPanel tono="strong" radius={radius.full} padding={10} style={styles.pildora}>
            <Text style={styles.avisoTexto}>No hay destinos de esta categoría.</Text>
          </GlassPanel>
        )}
        {avisoUbicacion && !elegido && (
          <GlassPanel tono="strong" radius={radius.lg} padding={10} style={styles.aviso}>
            <Text style={styles.avisoTexto}>{avisoUbicacion}</Text>
          </GlassPanel>
        )}
        {elegido && (
          <TarjetaDestinoMapa
            destino={elegido.lugar}
            km={elegido.km}
            onVerDetalle={() => abrirDetalle(elegido.lugar.id)}
            onCerrar={() => setSeleccionado(null)}
          />
        )}
      </View>
    </View>
  );

  const vacioLista = () => {
    if (cargando) return <EstadoCargando mensaje="Cargando destinos…" />;
    if (error) return <EstadoError error={error} onReintentar={recargar} />;
    return (
      <EstadoMensaje
        icono="location-off"
        titulo="Sin destinos"
        mensaje={categoria ? 'No hay destinos de esta categoría.' : 'Aún no hay destinos para mostrar.'}
        accion={categoria ? { texto: 'Ver todos', onPress: () => setCategoria(undefined) } : undefined}
      />
    );
  };

  const vistaLista = (
    <FlatList
      data={cargando || (error && !datos) ? [] : ordenados}
      keyExtractor={(o) => String(o.lugar.id)}
      contentContainerStyle={[styles.lista, { paddingBottom: espacioInferior }]}
      ItemSeparatorComponent={() => <View style={styles.separador} />}
      ListEmptyComponent={vacioLista()}
      ListHeaderComponent={
        datos && ordenados.length > 0 ? (
          <View style={styles.resumen}>
            <View style={styles.resumenFila}>
              <Icon name={ubicacion.coords ? 'near-me' : 'sort-by-alpha'} size={16} color={colors.textSubtle} />
              <Text style={styles.resumenTexto}>
                {ubicacion.coords
                  ? 'Ordenados por distancia a ti (en línea recta)'
                  : ubicacion.estado === 'buscando'
                    ? 'Buscando tu ubicación… mientras tanto, por nombre'
                    : 'Ordenados por nombre'}
              </Text>
            </View>
            {avisoUbicacion && <Text style={styles.resumenNota}>{avisoUbicacion}</Text>}
            {datos.motivoSinClima && (
              <Text style={styles.resumenNota}>Predicción sin clima: {textoSinClima(datos.motivoSinClima)}</Text>
            )}
          </View>
        ) : null
      }
      renderItem={({ item: { lugar, km } }) => {
        const cat = CATEGORIAS[lugar.categoria];
        return (
          <GlassPanel
            tono="strong"
            radius={radius.xl}
            padding={14}
            onPress={() => abrirDetalle(lugar.id)}
            accessibilityLabel={`${lugar.nombre}, ${cat.singular}${km !== null ? `, a ${formatearDistancia(km)}` : ''}`}
          >
            <View style={styles.fila}>
              <Pin destino={lugar} />
              <View style={styles.info}>
                <Text style={styles.nombre}>{lugar.nombre}</Text>
                <Text style={styles.categoria}>
                  {cat.singular}
                  {km !== null ? ` · a ${formatearDistancia(km)}` : ''}
                </Text>
                <IndicadorOcupacion ocupacion={lugar.ocupacion} mostrarPorcentaje />
              </View>
              <Icon name="chevron-right" size={22} color={colors.textSubtle} />
            </View>
          </GlassPanel>
        );
      }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={colors.secondary} />}
    />
  );

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.cabecera}>
        <View style={styles.cabeceraFila}>
          <Text style={styles.titulo} accessibilityRole="header">
            Mapa de la isla
          </Text>
          <SelectorVista
            vista={vista}
            onCambiar={(v) => {
              setVista(v);
              setSeleccionado(null);
            }}
          />
        </View>
        {chips}
      </SafeAreaView>
      {vista === 'mapa' ? vistaMapa : vistaLista}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.gutter,
    backgroundColor: colors.glassHeader,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBarBorder,
    zIndex: 2,
  },
  cabeceraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  titulo: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong, flexShrink: 1 },
  selector: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.full,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  selectorOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.full,
  },
  selectorActivo: { backgroundColor: colors.primary },
  selectorTexto: { ...typography.labelBold, fontSize: 13, color: colors.textMuted },
  selectorTextoActivo: { color: colors.white },
  chips: { gap: spacing.sm, paddingTop: spacing.gutter, paddingRight: spacing.screen },

  mapaContenedor: { flex: 1, backgroundColor: colors.surfaceLow },
  leyenda: { position: 'absolute', top: spacing.gutter, left: spacing.screen },
  centrar: { position: 'absolute', top: spacing.gutter, right: spacing.screen },
  abajo: { position: 'absolute', left: spacing.screen, right: spacing.screen, gap: spacing.sm },
  aviso: { gap: spacing.sm },
  avisoTexto: { ...typography.bodyMd, color: colors.textBody },
  pildora: { alignSelf: 'center' },
  errorMapa: { paddingVertical: spacing.lg },

  lista: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, flexGrow: 1 },
  separador: { height: 10 },
  resumen: { gap: 4, marginBottom: spacing.gutter },
  resumenFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resumenTexto: { ...typography.labelMd, color: colors.textMuted },
  resumenNota: { ...typography.labelMd, color: colors.textMuted },
  fila: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: mapColors.borde,
  },
  info: { flex: 1, gap: 4 },
  nombre: { ...typography.titleMd, color: colors.textStrong },
  categoria: { ...typography.labelMd, color: colors.secondary },
});
