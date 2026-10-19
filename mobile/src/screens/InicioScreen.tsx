import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClimaIsla } from '../components/ClimaIsla';
import { DestinoCard } from '../components/DestinoCard';
import { FilterChip } from '../components/FilterChip';
import { GlassControl } from '../components/GlassControl';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
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
import type { Destino, NivelOcupacion, Presupuesto } from '../services/tipos';
import { colors, motion, occupancyColors, radius, sizes, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { IMAGENES } from '../utils/imagenes';
import { ADJETIVO_NIVEL, NIVELES } from '../utils/ocupacion';
import { formatearPresupuesto, PRESUPUESTO_INICIAL } from '../utils/presupuesto';
import { primerNombre } from '../utils/validacion';

const DESTACADOS = 3;

async function cargarInicio() {
  const [destinos, perfil] = await Promise.all([listarDestinos(), obtenerPerfil()]);
  return { destinos, perfil };
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

  const accesos: { icono: NombreIcono; etiqueta: string; onPress: () => void }[] = [
    { icono: 'search', etiqueta: 'Explorar', onPress: () => navigation.navigate('Explorar') },
    { icono: 'map', etiqueta: 'Mapa', onPress: () => navigation.navigate('Mapa') },
    { icono: 'tune', etiqueta: 'Preferencias', onPress: irAPreferencias },
  ];

  const nombre = primerNombre(datos?.perfil.nombre);
  const resultado = recs.datos;
  const lista = resultado?.recomendaciones ?? [];
  const conteo = datos ? contarPorNivel(datos.destinos) : null;

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
              <GlassControl tono="oscuro" conSombra={false} style={styles.avatar}>
                {nombre ? (
                  <Text style={styles.avatarTexto}>{nombre.charAt(0).toUpperCase()}</Text>
                ) : (
                  <Icon name="person" size={22} color={colors.white} />
                )}
              </GlassControl>
            </PressableScale>
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

        {/* Accesos rápidos: solo el ícono circular y su texto, sin tarjeta. */}
        <View style={styles.accesos}>
          {accesos.map((a) => (
            <PressableScale
              key={a.etiqueta}
              onPress={a.onPress}
              escala={motion.pressScale.icon}
              accessibilityRole="button"
              accessibilityLabel={a.etiqueta}
              hitSlop={4}
              style={styles.acceso}
            >
              <View style={styles.accesoIcono}>
                <Icon name={a.icono} size={24} color={colors.secondary} />
              </View>
              <Text style={styles.accesoTexto} numberOfLines={1}>
                {a.etiqueta}
              </Text>
            </PressableScale>
          ))}
        </View>

        {recs.datos?.tienePreferencias && (
          <View style={styles.filtro}>
            <View style={styles.filtroFila}>
              <FilterChip
                icono="payments"
                acento="turquoise"
                activo={filtro !== null || verFiltro}
                onPress={() => setVerFiltro((v) => !v)}
              >
                {filtro
                  ? formatearPresupuesto(filtro)
                  : recs.datos.presupuesto
                    ? `Mi presupuesto: ${formatearPresupuesto(recs.datos.presupuesto)}`
                    : 'Filtrar por presupuesto'}
              </FilterChip>
              {filtro && <FilterChip icono="close" activo={false} compacto onPress={() => setFiltro(null)}>Quitar</FilterChip>}
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
  accesos: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.screen, paddingTop: spacing.lg },
  // Área táctil de al menos 44 × 44 (todo el bloque ícono + texto es tocable).
  acceso: { minWidth: 76, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  accesoIcono: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accesoTexto: { ...typography.labelBold, fontSize: 13, color: colors.textStrong },
  seccion: { paddingHorizontal: spacing.screen, paddingTop: 28 },
  filtro: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, gap: spacing.sm },
  filtroFila: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  carrusel: { gap: spacing.gutter, paddingHorizontal: spacing.screen, paddingBottom: spacing.xs },
  tarjetaDestacada: { width: 272 },
  lista: { gap: spacing.gutter },
});
