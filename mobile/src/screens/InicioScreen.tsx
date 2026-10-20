import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DestinoCard } from '../components/DestinoCard';
import { FilterChip } from '../components/FilterChip';
import { SuperficieVidrio } from '../components/SuperficieVidrio';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PanelOcupacion } from '../components/PanelOcupacion';
import { PressableScale } from '../components/PressableScale';
import { RangoPresupuesto } from '../components/RangoPresupuesto';
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
import type { Presupuesto } from '../services/tipos';
import { colors, motion, radius, sizes, spacing, typography } from '../theme';
import { IMAGENES } from '../utils/imagenes';
import { formatearPresupuesto, PRESUPUESTO_INICIAL } from '../utils/presupuesto';
import { primerNombre } from '../utils/validacion';

const DESTACADOS = 3;

async function cargarInicio() {
  const [destinos, perfil] = await Promise.all([listarDestinos(), obtenerPerfil()]);
  return { destinos, perfil };
}

export function InicioScreen({ navigation }: TabScreenProps<'Inicio'>) {
  useBarraEstado('light');
  const insets = useSafeAreaInsets();
  const espacioInferior = useEspacioTabBar();
  const inicio = useAsync(cargarInicio, [], { recargarAlEnfocar: true });
  // Filtro rápido de presupuesto: null = el de las preferencias (si lo hay).
  const [filtro, setFiltro] = useState<Presupuesto | null>(null);
  const [verFiltro, setVerFiltro] = useState(false);
  const recs = useAsync(() => obtenerRecomendaciones(filtro), [filtro?.minCop, filtro?.maxCop], { recargarAlEnfocar: true });
  const datos = inicio.datos;
  const error = recs.error ?? inicio.error;
  const cargando = recs.cargando || inicio.cargando;
  const refrescando = recs.refrescando || inicio.refrescando;
  const recargar = () => {
    inicio.recargar();
    recs.recargar();
  };

  const abrir = (id: number) => navigation.navigate('DetalleDestino', { id });
  const irAPreferencias = () => navigation.navigate('Preferencias');

  const nombre = primerNombre(datos?.perfil.nombre);
  const resultado = recs.datos;
  const lista = resultado?.recomendaciones ?? [];

  const contenido = () => {
    if (cargando) return <EstadoCargando mensaje="Buscando tus recomendaciones…" />;
    if (error && !resultado) return <EstadoError error={error} onReintentar={recargar} />;
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
      return filtro ? (
        <EstadoMensaje
          icono="payments"
          titulo="Nada en ese presupuesto"
          mensaje={`Ningún destino que te guste entra en ${formatearPresupuesto(filtro)}. Amplía el rango.`}
          accion={{ texto: 'Quitar el filtro', onPress: () => setFiltro(null) }}
        />
      ) : (
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
              conDescripcion
              porQueCorto={r.porQueCorto || undefined}
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
                <DestinoCard
                  key={r.id}
                  destino={r}
                  destacado={`${r.puntaje}%`}
                  conDescripcion
                  porQueCorto={r.porQueCorto || undefined}
                  onPress={() => abrir(r.id)}
                />
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
            <PressableScale
              onPress={() => navigation.navigate('Perfil')}
              escala={motion.pressScale.icon}
              accessibilityRole="button"
              accessibilityLabel="Mi perfil"
              hitSlop={4}
            >
              <SuperficieVidrio variante="chip" tono="oscuro" style={styles.avatar}>
                {nombre ? (
                  <Text style={styles.avatarTexto}>{nombre.charAt(0).toUpperCase()}</Text>
                ) : (
                  <Icon name="person" size={22} color={colors.white} />
                )}
              </SuperficieVidrio>
            </PressableScale>
          </View>
          <View style={styles.saludo}>
            <Text style={styles.hola} accessibilityRole="header">
              {nombre ? `Hola, ${nombre}` : 'Hola'}
            </Text>
            <Text style={styles.holaSub}>Estas son tus recomendaciones personalizadas</Text>
          </View>
        </View>

        <View style={styles.resumen}>
          <PanelOcupacion
            destinos={datos?.destinos ?? null}
            cargando={inicio.cargando}
            error={inicio.error}
            horaRespaldo={resultado?.hora}
            onReintentar={inicio.recargar}
            onElegirGrupo={(grupo) => navigation.navigate('Explorar', { ocupacion: grupo })}
            onAbrirDestino={abrir}
          />
        </View>
        {recs.datos?.tienePreferencias && (
          <View style={styles.filtro}>
            <View style={styles.filtroFila}>
              {/* Etiqueta tocable: lleva a Preferencias para cambiar el presupuesto guardado. */}
              <Pressable
                onPress={irAPreferencias}
                accessibilityRole="button"
                accessibilityLabel={
                  recs.datos.presupuesto
                    ? `Mi presupuesto: ${formatearPresupuesto(recs.datos.presupuesto)}. Editar en preferencias`
                    : 'Definir mi presupuesto en preferencias'
                }
                hitSlop={{ top: 8, bottom: 8 }}
                style={({ pressed }) => [styles.miPresupuesto, pressed && styles.miPresupuestoPresionado]}
              >
                <Icon name="payments" size={16} color={colors.secondary} />
                <Text style={styles.miPresupuestoTexto} numberOfLines={1}>
                  {recs.datos.presupuesto ? `Mi presupuesto: ${formatearPresupuesto(recs.datos.presupuesto)}` : 'Definir mi presupuesto'}
                </Text>
                <Icon name="edit" size={14} color={colors.textLink} />
              </Pressable>
              <FilterChip icono="tune" acento="turquoise" compacto activo={filtro !== null || verFiltro} onPress={() => setVerFiltro((v) => !v)}>
                {filtro ? formatearPresupuesto(filtro) : 'Filtrar por precio'}
              </FilterChip>
              {filtro && (
                <FilterChip icono="close" activo={false} compacto onPress={() => setFiltro(null)}>
                  Quitar
                </FilterChip>
              )}
            </View>
            {verFiltro && (
              <GlassPanel tono="strong" radius={radius.xl} padding={spacing.md}>
                <RangoPresupuesto
                  valor={filtro ?? recs.datos.presupuesto ?? PRESUPUESTO_INICIAL}
                  onCambioFinal={setFiltro}
                />
              </GlassPanel>
            )}
          </View>
        )}

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
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { ...typography.titleMd, color: colors.white },
  saludo: { position: 'absolute', left: spacing.screen, right: spacing.screen, bottom: 64 },
  hola: { ...typography.headlineMd, color: colors.white },
  holaSub: { ...typography.bodyMd, color: colors.textOnDarkMuted, marginTop: 2 },
  resumen: { marginTop: -44, marginHorizontal: spacing.screen },
  seccion: { paddingHorizontal: spacing.screen, paddingTop: 28 },
  filtro: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, gap: spacing.sm },
  filtroFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  miPresupuesto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    flexShrink: 1,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  miPresupuestoPresionado: { backgroundColor: colors.pressedOverlay },
  miPresupuestoTexto: { ...typography.labelBold, fontSize: 13, color: colors.textLink, flexShrink: 1 },
  carrusel: { gap: spacing.gutter, paddingHorizontal: spacing.screen, paddingBottom: spacing.xs },
  tarjetaDestacada: { width: 272 },
  lista: { gap: spacing.gutter },
});
