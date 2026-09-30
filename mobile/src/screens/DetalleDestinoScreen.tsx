import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { IndicadorOcupacion } from '../components/IndicadorOcupacion';
import { OcupacionChart } from '../components/OcupacionChart';
import { Overline } from '../components/ScreenHeader';
import { ScreenBackground } from '../components/ScreenBackground';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { Tag } from '../components/Tag';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import type { AppScreenProps } from '../navigation/types';
import { ErrorApi } from '../services/api';
import { obtenerDestino } from '../services/destinos';
import { registrarInteraccion } from '../services/interacciones';
import { obtenerOcupacionDelDia, obtenerPrediccionDelDia } from '../services/ocupacion';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { CATEGORIAS, ICONOS_PREFERENCIA } from '../utils/categorias';
import { horaEnColombia, hoyEnColombia } from '../utils/fecha';
import { imagenDestino } from '../utils/imagenes';
import { NOTA_NIVEL } from '../utils/ocupacion';

/** Previsión del día y registros reales de hoy; los reales son opcionales. */
async function cargarCurva(id: number) {
  const fecha = hoyEnColombia();
  const [prevision, reales] = await Promise.all([
    obtenerPrediccionDelDia(id, fecha),
    obtenerOcupacionDelDia(id, fecha).catch(() => null),
  ]);
  return { prevision, registros: reales?.registros ?? [], horaActual: horaEnColombia() };
}

export function DetalleDestinoScreen({ navigation, route }: AppScreenProps<'DetalleDestino'>) {
  useBarraEstado('light');
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const registrada = useRef<number | null>(null);

  const destino = useAsync(() => obtenerDestino(id), [id]);
  const curva = useAsync(() => cargarCurva(id), [id]);

  // Registro automático de la vista (una vez por destino abierto; si falla, no molesta al usuario).
  useEffect(() => {
    if (registrada.current === id) return;
    registrada.current = id;
    registrarInteraccion(id, 'vista').catch(() => undefined);
  }, [id]);

  const volver = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs', { screen: 'Inicio' }));

  const botonVolver = (
    <IconButton
      icono="arrow-back"
      etiqueta="Volver"
      tono="glass-dark"
      onPress={volver}
      style={[styles.volver, { top: insets.top + spacing.sm }]}
    />
  );

  if (destino.cargando) {
    return (
      <ScreenBackground>
        <EstadoCargando style={styles.centro} mensaje="Cargando destino…" />
        {botonVolver}
      </ScreenBackground>
    );
  }

  const d = destino.datos;
  if (!d) {
    const noEncontrado = destino.error instanceof ErrorApi && destino.error.status === 404;
    return (
      <ScreenBackground>
        <EstadoError
          style={styles.centro}
          error={destino.error}
          onReintentar={noEncontrado ? undefined : destino.recargar}
        />
        {botonVolver}
      </ScreenBackground>
    );
  }

  const categoria = CATEGORIAS[d.categoria];
  const etiquetas = [...d.etiquetas.experiencias, ...d.etiquetas.grupos];
  const recargarTodo = () => {
    destino.recargar();
    curva.recargar();
  };

  return (
    <View style={styles.fondo}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={destino.refrescando} onRefresh={recargarTodo} tintColor={colors.white} />}
      >
        <View style={styles.hero}>
          <Image source={imagenDestino(d)} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={d.nombre} />
          <LinearGradient colors={colors.scrimTop} style={styles.scrimSuperior} />
        </View>

        <View style={styles.hoja}>
          <View style={styles.etiquetasFila}>
            <Tag tono="turquoise" icono={categoria.icono}>
              {categoria.singular}
            </Tag>
            {d.estado === 'cerrado_temporal' && (
              <Tag icono="block" style={styles.tagCerrado}>
                Cerrado temporalmente
              </Tag>
            )}
          </View>
          <Text style={styles.nombre} accessibilityRole="header">
            {d.nombre}
          </Text>
          <View style={styles.ubicacion}>
            <Icon name="location-on" size={18} />
            <Text style={styles.ubicacionTexto}>{d.ubicacion}</Text>
          </View>

          <LinearGradient
            colors={['rgba(179,235,255,0.35)', 'rgba(230,227,208,0.35)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ocupacion}
          >
            <View style={styles.ocupacionCabecera}>
              <Overline>Ocupación prevista ahora</Overline>
              {d.ocupacionActual && <Text style={styles.hora}>{d.ocupacionActual.hora}</Text>}
            </View>
            <IndicadorOcupacion ocupacion={d.ocupacionActual} variante="barra" capacidad={d.capacidad} />
            {d.ocupacionActual && <Text style={styles.nota}>{NOTA_NIVEL[d.ocupacionActual.nivel]}</Text>}
          </LinearGradient>

          {d.descripcion ? (
            <>
              <Text style={styles.subtitulo}>Descripción</Text>
              <Text style={styles.descripcion}>{d.descripcion}</Text>
            </>
          ) : null}

          {etiquetas.length > 0 && (
            <>
              <Text style={styles.subtitulo}>Ideal para</Text>
              <View style={styles.tags}>
                {etiquetas.map((e) => (
                  <Tag key={e.codigo} icono={ICONOS_PREFERENCIA[e.codigo]}>
                    {e.nombre}
                  </Tag>
                ))}
              </View>
            </>
          )}

          <Text style={styles.subtitulo}>Ocupación durante el día</Text>
          {curva.cargando ? (
            <EstadoCargando mensaje="Calculando la previsión…" />
          ) : curva.datos ? (
            <>
              <Text style={styles.leyendaGrafico}>
                Hoy ({curva.datos.prevision.tipoDia === 'fin_de_semana' ? 'fin de semana' : 'entre semana'}) · curva
                prevista según el histórico
                {curva.datos.registros.length > 0 ? ' con los registros reales de hoy' : ''}
              </Text>
              <GlassPanel tono="strong" radius={radius.xl} padding={spacing.gutter}>
                <OcupacionChart
                  prevision={curva.datos.prevision.horas}
                  registros={curva.datos.registros}
                  horaActual={curva.datos.horaActual}
                />
              </GlassPanel>
            </>
          ) : (
            <Text style={styles.descripcion}>
              {curva.error instanceof ErrorApi && curva.error.status === 404
                ? 'Aún no hay datos suficientes para prever la ocupación de este destino.'
                : 'No pudimos cargar la previsión del día. Desliza hacia abajo para reintentar.'}
            </Text>
          )}
        </View>
      </ScrollView>

      {botonVolver}

      <View style={[styles.barraAcciones, shadows.lg, { bottom: Math.max(insets.bottom, spacing.gutter) + 6 }]}>
        <Button
          tamano="lg"
          icono="map"
          style={styles.accion}
          onPress={() => navigation.navigate('Tabs', { screen: 'Mapa', params: { destinoId: d.id } })}
        >
          Ver ubicación
        </Button>
        <Button
          tamano="lg"
          variante="glass"
          icono="auto-awesome"
          style={styles.accion}
          onPress={() => navigation.navigate('Tabs', { screen: 'Inicio' })}
        >
          Para ti
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.white },
  centro: { flex: 1, justifyContent: 'center' },
  volver: { position: 'absolute', left: spacing.screen, zIndex: 5 },
  hero: { height: 360, backgroundColor: colors.navy950 },
  scrimSuperior: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  hoja: {
    marginTop: -32,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
  },
  etiquetasFila: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  tagCerrado: { backgroundColor: colors.errorContainer },
  nombre: { ...typography.display, color: colors.textStrong },
  ubicacion: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: spacing.sm },
  ubicacionTexto: { ...typography.bodyMd, color: colors.textMuted, flex: 1 },
  ocupacion: {
    marginTop: spacing.screen,
    padding: spacing.md,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: 10,
  },
  ocupacionCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hora: { ...typography.labelMd, color: colors.textSubtle },
  nota: { ...typography.bodyMd, color: colors.textMuted },
  subtitulo: { ...typography.headlineSm, color: colors.textStrong, marginTop: spacing.lg, marginBottom: spacing.sm },
  descripcion: { ...typography.bodyMd, lineHeight: 22, color: colors.textMuted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  leyendaGrafico: { ...typography.labelMd, color: colors.textSubtle, marginBottom: spacing.gutter },
  barraAcciones: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 10,
    borderRadius: radius.sheet,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  accion: { flex: 1, borderRadius: radius.panel },
});
