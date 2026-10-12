import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClimaIsla } from '../components/ClimaIsla';
import { DestinoCard } from '../components/DestinoCard';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { SectionHeader } from '../components/ScreenHeader';
import { ScreenBackground } from '../components/ScreenBackground';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { listarDestinos } from '../services/destinos';
import { obtenerPerfil } from '../services/perfil';
import { obtenerRecomendaciones } from '../services/recomendaciones';
import type { Destino, NivelOcupacion } from '../services/tipos';
import { colors, occupancyColors, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { IMAGENES } from '../utils/imagenes';
import { ADJETIVO_NIVEL, NIVELES } from '../utils/ocupacion';
import { primerNombre } from '../utils/validacion';

const DESTACADOS = 3;

async function cargarInicio() {
  const [recomendaciones, destinos, perfil] = await Promise.all([
    obtenerRecomendaciones(),
    listarDestinos(),
    obtenerPerfil(),
  ]);
  return { recomendaciones, destinos, perfil };
}

function contarPorNivel(destinos: Destino[]): Record<NivelOcupacion, number> {
  const conteo: Record<NivelOcupacion, number> = { Bajo: 0, Medio: 0, Alto: 0 };
  for (const d of destinos) if (d.ocupacionActual?.nivel) conteo[d.ocupacionActual.nivel]++;
  return conteo;
}

export function InicioScreen({ navigation }: TabScreenProps<'Inicio'>) {
  useBarraEstado('light');
  const insets = useSafeAreaInsets();
  const espacioInferior = useEspacioTabBar();
  const { datos, error, cargando, refrescando, recargar } = useAsync(cargarInicio, [], { recargarAlEnfocar: true });

  const abrir = (id: number) => navigation.navigate('DetalleDestino', { id });
  const irAPreferencias = () => navigation.navigate('Preferencias');

  const accesos: { icono: NombreIcono; etiqueta: string; onPress: () => void }[] = [
    { icono: 'search', etiqueta: 'Explorar', onPress: () => navigation.navigate('Explorar') },
    { icono: 'map', etiqueta: 'Mapa', onPress: () => navigation.navigate('Mapa') },
    { icono: 'tune', etiqueta: 'Preferencias', onPress: irAPreferencias },
  ];

  const nombre = primerNombre(datos?.perfil.nombre);
  const resultado = datos?.recomendaciones;
  const lista = resultado?.recomendaciones ?? [];
  const conteo = datos ? contarPorNivel(datos.destinos) : null;

  const contenido = () => {
    if (cargando) return <EstadoCargando mensaje="Buscando tus recomendaciones…" />;
    if (error && !datos) return <EstadoError error={error} onReintentar={recargar} />;
    if (!resultado) return null;
    if (!resultado.tienePreferencias) {
      return (
        <EstadoMensaje
          icono="auto-awesome"
          titulo="Recomendaciones no disponibles"
          mensaje="Cuéntanos qué te gusta para recomendarte destinos. Completa tus preferencias."
          accion={{ texto: 'Editar preferencias', onPress: irAPreferencias }}
        />
      );
    }
    if (lista.length === 0) {
      return (
        <EstadoMensaje
          icono="travel-explore"
          titulo="Sin coincidencias por ahora"
          mensaje="Ningún destino abierto coincide con tus preferencias. Prueba con otras categorías."
          accion={{ texto: 'Editar preferencias', onPress: irAPreferencias }}
        />
      );
    }

    const destacados = lista.slice(0, DESTACADOS);
    const otros = lista.slice(DESTACADOS);
    return (
      <>
        <View style={styles.seccion}>
          <SectionHeader
            titulo="Destacados para ti"
            subtitulo={`Según tus preferencias y la ocupación prevista a las ${resultado.hora}`}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={272 + spacing.gutter}
          decelerationRate="fast"
          contentContainerStyle={styles.carrusel}
        >
          {destacados.map((r) => (
            <DestinoCard
              key={r.id}
              layout="featured"
              destino={r}
              destacado={`${r.puntaje}% compatible`}
              nota={r.razon}
              onPress={() => abrir(r.id)}
              style={styles.tarjetaDestacada}
            />
          ))}
        </ScrollView>

        {otros.length > 0 && (
          <View style={styles.seccion}>
            <SectionHeader titulo="También te pueden gustar" />
            <View style={styles.lista}>
              {otros.map((r) => (
                <DestinoCard key={r.id} destino={r} destacado={`${r.puntaje}%`} nota={r.razon} onPress={() => abrir(r.id)} />
              ))}
            </View>
          </View>
        )}
      </>
    );
  };

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: espacioInferior }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={colors.white} />}
      >
        <View style={styles.hero}>
          <Image source={IMAGENES.heroAerial} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={colors.scrimBottom} locations={[0, 0.5, 1]} style={[StyleSheet.absoluteFill, styles.scrim]} />
          <View style={[styles.heroArriba, { top: insets.top + spacing.sm }]}>
            <Text style={styles.marca}>MiSanAndrés</Text>
            <Pressable
              onPress={() => navigation.navigate('Perfil')}
              accessibilityRole="button"
              accessibilityLabel="Mi perfil"
              style={styles.avatar}
            >
              {nombre ? (
                <Text style={styles.avatarTexto}>{nombre.charAt(0).toUpperCase()}</Text>
              ) : (
                <Icon name="person" size={22} color={colors.white} />
              )}
            </Pressable>
          </View>
          <View style={styles.saludo}>
            <ClimaIsla style={styles.clima} />
            <Text style={styles.hola} accessibilityRole="header">
              {nombre ? `Hola, ${nombre}` : 'Hola'}
            </Text>
            <Text style={styles.holaSub}>Estas son tus recomendaciones personalizadas</Text>
          </View>
        </View>

        <View style={styles.resumen}>
          <GlassPanel tono="strong" radius={20}>
            <View style={styles.resumenCabecera}>
              <Text style={styles.overline}>Ocupación ahora</Text>
              {resultado && (
                <View style={styles.actualizado}>
                  <Icon name="schedule" size={14} color={colors.textSubtle} />
                  <Text style={styles.actualizadoTexto}>Previsión {resultado.hora}</Text>
                </View>
              )}
            </View>
            <View style={styles.niveles}>
              {NIVELES.map((nivel) => {
                const c = occupancyColors[nivel];
                return (
                  <View key={nivel} style={[styles.nivel, { backgroundColor: c.bg, borderColor: c.border }]}>
                    <Text style={[styles.nivelNumero, { color: c.fg }]}>{conteo ? conteo[nivel] : '–'}</Text>
                    <Text style={[styles.nivelEtiqueta, { color: c.fg }]}>Ocupación {ADJETIVO_NIVEL[nivel]}</Text>
                  </View>
                );
              })}
            </View>
          </GlassPanel>
        </View>

        <View style={styles.accesos}>
          {accesos.map((a) => (
            <PressableScale key={a.etiqueta} onPress={a.onPress} accessibilityRole="button" accessibilityLabel={a.etiqueta} style={styles.acceso}>
              <View style={styles.accesoIcono}>
                <Icon name={a.icono} size={20} />
              </View>
              <Text style={styles.accesoTexto}>{a.etiqueta}</Text>
            </PressableScale>
          ))}
        </View>

        {contenido()}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 320,
    borderBottomLeftRadius: radius.sheet,
    borderBottomRightRadius: radius.sheet,
    overflow: 'hidden',
    backgroundColor: colors.navy950,
  },
  scrim: { opacity: 0.9 },
  heroArriba: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marca: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.white },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.glassBarBorder,
    backgroundColor: colors.glassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { ...typography.titleMd, color: colors.white },
  saludo: { position: 'absolute', left: spacing.screen, right: spacing.screen, bottom: 64 },
  clima: { marginBottom: spacing.sm },
  hola: { ...typography.headlineMd, color: colors.white },
  holaSub: { ...typography.bodyMd, color: colors.textOnDarkMuted, marginTop: 2 },
  resumen: { marginTop: -44, marginHorizontal: spacing.screen },
  resumenCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.gutter },
  overline: { ...typography.overline, color: colors.textMuted },
  actualizado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actualizadoTexto: { ...typography.labelMd, color: colors.textSubtle },
  niveles: { flexDirection: 'row', gap: spacing.sm },
  nivel: { flex: 1, paddingVertical: 10, paddingHorizontal: spacing.gutter, borderRadius: radius.lg, borderWidth: 1 },
  nivelNumero: { ...typography.headlineMd, fontFamily: typography.display.fontFamily },
  nivelEtiqueta: typography.labelMd,
  accesos: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.screen, paddingTop: spacing.md },
  acceso: {
    flex: 1,
    height: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  accesoIcono: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accesoTexto: { ...typography.labelBold, fontSize: 13, color: colors.textStrong },
  seccion: { paddingHorizontal: spacing.screen, paddingTop: 28 },
  carrusel: { gap: spacing.gutter, paddingHorizontal: spacing.screen, paddingBottom: spacing.xs },
  tarjetaDestacada: { width: 272 },
  lista: { gap: spacing.gutter },
});
