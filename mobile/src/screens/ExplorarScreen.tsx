import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

/** Orden: abiertos de menor a mayor ocupación, luego sin datos y al final los cerrados. */
const claveOrden = (d: Destino) => {
  const o = d.ocupacionActual;
  if (o?.estado === 'Cerrado') return 300;
  return o ? o.porcentaje : 200;
};

export function ExplorarScreen({ navigation }: TabScreenProps<'Explorar'>) {
  useBarraEstado('dark');
  const espacioInferior = useEspacioTabBar();
  const [categoria, setCategoria] = useState<CategoriaDestino>();
  const [soloBaja, setSoloBaja] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  // La API busca por nombre (q) y aplica los filtros; se espera a que el usuario deje de escribir.
  const q = useValorDiferido(busqueda.trim()).slice(0, 100);

  const { datos, error, cargando, refrescando, recargar } = useAsync(
    () => listarDestinos({ q: q || undefined, categoria, nivelOcupacion: soloBaja ? 'Bajo' : undefined }),
    [q, categoria, soloBaja],
    { recargarAlEnfocar: true },
  );

  const destinos = useMemo(() => [...(datos ?? [])].sort((a, b) => claveOrden(a) - claveOrden(b)), [datos]);

  const hayFiltros = Boolean(categoria || soloBaja || busqueda.trim());

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
                  setSoloBaja(false);
                  setBusqueda('');
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
          <FilterChip activo={!categoria} onPress={() => setCategoria(undefined)}>
            Todos
          </FilterChip>
          {LISTA_CATEGORIAS.map((c) => (
            <FilterChip key={c} icono={CATEGORIAS[c].icono} activo={categoria === c} onPress={() => setCategoria(c)}>
              {CATEGORIAS[c].plural}
            </FilterChip>
          ))}
        </ScrollView>
        <View style={styles.filtroSecundario}>
          <FilterChip acento="turquoise" compacto activo={soloBaja} onPress={() => setSoloBaja((v) => !v)}>
            Solo ocupación baja
          </FilterChip>
        </View>
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
                {categoria ? ` en ${CATEGORIAS[categoria].plural}` : ''}
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
  filtroSecundario: { flexDirection: 'row', marginTop: 10 },
  lista: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, flexGrow: 1 },
  separador: { height: spacing.gutter },
  resumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.gutter },
  resumenTexto: { ...typography.labelMd, color: colors.textMuted },
  orden: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
