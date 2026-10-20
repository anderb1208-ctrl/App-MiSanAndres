import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DestinoCard } from '../components/DestinoCard';
import { FilterChip } from '../components/FilterChip';
import { Icon } from '../components/Icon';
import { ScreenBackground } from '../components/ScreenBackground';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { useValorDiferido } from '../hooks/useValorDiferido';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { listarDestinos } from '../services/destinos';
import type { CategoriaDestino, Destino } from '../services/tipos';
import { colors, radius, spacing, typography } from '../theme';
import { CATEGORIAS, LISTA_CATEGORIAS } from '../utils/categorias';
import { grupoOcupacion, type GrupoOcupacion } from '../utils/resumenOcupacion';

/** Texto del filtro de ocupación que llega desde Inicio. */
const ETIQUETA_FILTRO_OCUPACION: Record<GrupoOcupacion, string> = {
  Bajo: 'Ocupación baja',
  Medio: 'Ocupación media',
  Alto: 'Ocupación alta',
  Cerrado: 'Cerrados ahora',
};

/** Orden: abiertos de menor a mayor ocupación, luego sin datos y al final los cerrados. */
const claveOrden = (d: Destino) => {
  const o = d.ocupacionActual;
  if (o?.estado === 'Cerrado') return 300;
  return o ? o.porcentaje : 200;
};

export function ExplorarScreen({ navigation, route }: TabScreenProps<'Explorar'>) {
  useBarraEstado('dark');
  const espacioInferior = useEspacioTabBar();
  const [categoria, setCategoria] = useState<CategoriaDestino>();
  // Filtro de ocupación: el chip "Solo ocupación baja" o el grupo elegido en Inicio.
  const [ocupacion, setOcupacion] = useState<GrupoOcupacion>();
  const [busqueda, setBusqueda] = useState('');
  // Desde una insignia del pasaporte: solo los destinos que faltan por explorar.
  const [pendientes, setPendientes] = useState<{ ids: number[]; motivo: string } | null>(null);
  const params = route.params;

  useEffect(() => {
    if (!params?.pendientes) return;
    setCategoria(params.categoria);
    setOcupacion(undefined);
    setBusqueda('');
    setPendientes({ ids: params.pendientes, motivo: params.motivo ?? 'Lo que te falta por explorar' });
    // Se consumen para que volver a tocar la misma insignia los aplique de nuevo.
    navigation.setParams({ categoria: undefined, pendientes: undefined, motivo: undefined });
  }, [params, navigation]);

  // Desde la barra de ocupación de Inicio: solo ese grupo, sin otros filtros.
  useEffect(() => {
    if (!params?.ocupacion) return;
    setOcupacion(params.ocupacion);
    setCategoria(undefined);
    setBusqueda('');
    setPendientes(null);
    navigation.setParams({ ocupacion: undefined });
  }, [params, navigation]);
  // La API busca por nombre (q) y aplica los filtros; se espera a que el usuario deje de escribir.
  const q = useValorDiferido(busqueda.trim()).slice(0, 100);

  const { datos, error, cargando, refrescando, recargar } = useAsync(
    // Baja, media y alta las filtra la API; los cerrados se filtran aquí.
    () => listarDestinos({ q: q || undefined, categoria, nivelOcupacion: ocupacion && ocupacion !== 'Cerrado' ? ocupacion : undefined }),
    [q, categoria, ocupacion],
    { recargarAlEnfocar: true },
  );

  const destinos = useMemo(() => {
    let lista = pendientes ? (datos ?? []).filter((d) => pendientes.ids.includes(d.id)) : (datos ?? []);
    if (ocupacion === 'Cerrado') lista = lista.filter((d) => grupoOcupacion(d) === 'Cerrado');
    return [...lista].sort((a, b) => claveOrden(a) - claveOrden(b));
  }, [datos, pendientes, ocupacion]);

  const hayFiltros = Boolean(categoria || ocupacion || busqueda.trim() || pendientes);

  const vacio = () => {
    if (cargando) return <EstadoCargando mensaje="Cargando destinos…" />;
    if (error) return <EstadoError error={error} onReintentar={recargar} />;
    return (
      <EstadoMensaje
        icono="travel-explore"
        titulo="Sin resultados"
        mensaje={
          busqueda.trim()
            ? `No hay destinos que coincidan con "${busqueda.trim()}".`
            : hayFiltros
              ? 'Prueba con otra categoría o quita los filtros.'
              : 'Aún no hay destinos disponibles.'
        }
        accion={
          hayFiltros
            ? {
                texto: 'Quitar filtros',
                onPress: () => {
                  setCategoria(undefined);
                  setOcupacion(undefined);
                  setBusqueda('');
                  setPendientes(null);
                },
              }
            : undefined
        }
      />
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.cabecera}>
        <Text style={styles.titulo} accessibilityRole="header">
          Explorar destinos
        </Text>
        <View style={styles.buscador}>
          <Icon name="search" size={20} color={colors.textSubtle} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre"
            placeholderTextColor={colors.textSubtle}
            style={styles.buscadorInput}
            accessibilityLabel="Buscar destinos"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <FilterChip
            activo={!categoria}
            onPress={() => {
              setCategoria(undefined);
              setPendientes(null);
            }}
          >
            Todos
          </FilterChip>
          {LISTA_CATEGORIAS.map((c) => (
            <FilterChip
              key={c}
              icono={CATEGORIAS[c].icono}
              activo={categoria === c}
              onPress={() => {
                setCategoria(c);
                setPendientes(null);
              }}
            >
              {CATEGORIAS[c].plural}
            </FilterChip>
          ))}
        </ScrollView>
        <View style={styles.filtroSecundario}>
          <FilterChip
            acento="turquoise"
            compacto
            activo={ocupacion === 'Bajo'}
            onPress={() => setOcupacion((o) => (o === 'Bajo' ? undefined : 'Bajo'))}
          >
            Solo ocupación baja
          </FilterChip>
          {ocupacion && ocupacion !== 'Bajo' && (
            <FilterChip acento="turquoise" compacto activo icono="close" onPress={() => setOcupacion(undefined)}>
              {`${ETIQUETA_FILTRO_OCUPACION[ocupacion]} · Quitar`}
            </FilterChip>
          )}
        </View>
        {pendientes && (
          <View style={styles.pendientes} accessibilityLiveRegion="polite">
            <Icon name="emoji-events" size={18} color={colors.secondary} />
            <Text style={styles.pendientesTexto}>{pendientes.motivo}</Text>
            <Pressable onPress={() => setPendientes(null)} accessibilityRole="button" accessibilityLabel="Ver todos los destinos" hitSlop={10} style={styles.pendientesBoton}>
              <Text style={styles.pendientesAccion}>Ver todos</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <FlatList
        data={cargando || (error && !datos) ? [] : destinos}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={[styles.lista, { paddingBottom: espacioInferior }]}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListHeaderComponent={
          datos && destinos.length > 0 ? (
            <View style={styles.resumen}>
              <Text style={styles.resumenTexto}>
                {destinos.length} {destinos.length === 1 ? 'destino' : 'destinos'}
                {pendientes ? ' por explorar' : ''}
                {categoria ? ` en ${CATEGORIAS[categoria].plural}` : ''}
                {ocupacion && ocupacion !== 'Bajo' ? ` · ${ETIQUETA_FILTRO_OCUPACION[ocupacion].toLowerCase()}` : ''}
              </Text>
              <View style={styles.orden}>
                <Icon name="swap-vert" size={16} color={colors.textSubtle} />
                <Text style={styles.resumenTexto}>Menor ocupación</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={vacio()}
        renderItem={({ item }) => (
          <DestinoCard
            destino={item}
            nota={item.ubicacion}
            onPress={() => navigation.navigate('DetalleDestino', { id: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={colors.secondary} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
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
  },
  titulo: {
    ...typography.headlineMd,
    fontFamily: typography.display.fontFamily,
    color: colors.textStrong,
    marginTop: spacing.sm,
    marginBottom: spacing.gutter,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buscadorInput: {
    flex: 1,
    alignSelf: 'stretch',
    fontFamily: typography.bodyLg.fontFamily,
    fontSize: typography.bodyLg.fontSize,
    color: colors.textBody,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  chips: { gap: spacing.sm, paddingTop: spacing.gutter, paddingRight: spacing.screen },
  filtroSecundario: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 10 },
  pendientes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 10,
    paddingLeft: spacing.gutter,
    borderRadius: radius.lg,
    backgroundColor: colors.turquoiseTint,
  },
  pendientesTexto: { ...typography.labelBold, color: colors.turq700, flex: 1, paddingVertical: spacing.sm },
  pendientesBoton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.gutter },
  pendientesAccion: { ...typography.labelBold, color: colors.textLink },
  lista: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, flexGrow: 1 },
  separador: { height: spacing.gutter },
  resumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.gutter },
  resumenTexto: { ...typography.labelMd, color: colors.textMuted },
  orden: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
