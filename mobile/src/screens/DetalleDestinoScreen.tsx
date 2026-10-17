import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonFavorito } from '../components/BotonFavorito';
import { Button } from '../components/Button';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { ImagenDestino } from '../components/ImagenDestino';
import { MiniMapa } from '../components/MiniMapa';
import { IndicadorOcupacion } from '../components/IndicadorOcupacion';
import { OcupacionChart } from '../components/OcupacionChart';
import { ListaRazones } from '../components/Razones';
import { SeccionResenas } from '../components/SeccionResenas';
import { Estrellas } from '../components/Estrellas';
import { Overline } from '../components/ScreenHeader';
import { ScreenBackground } from '../components/ScreenBackground';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { FactoresPrediccion } from '../components/FactoresPrediccion';
import { Tag } from '../components/Tag';
import { TarjetaClima } from '../components/TarjetaClima';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import type { AppScreenProps } from '../navigation/types';
import { ErrorApi } from '../services/api';
import { obtenerDestino } from '../services/destinos';
import { registrarInteraccion } from '../services/interacciones';
import { obtenerClimaDestino } from '../services/clima';
import { obtenerOcupacionDelDia, obtenerOcupacionTipica, obtenerPrediccion } from '../services/ocupacion';
import { obtenerRecomendaciones } from '../services/recomendaciones';
import type { OcupacionTipicaDelDia } from '../services/tipos';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { CATEGORIAS, ICONOS_PREFERENCIA, type NombreIcono } from '../utils/categorias';
import { creditoFoto, ETIQUETA_PRECIO, formatearHorario } from '../utils/contenido';
import { horaEnColombia, horaMinutoEnColombia, hoyEnColombia } from '../utils/fecha';
import { abrirUbicacion } from '../utils/mapa';
import { NOTA_NIVEL } from '../utils/ocupacion';
import { formatearPrecio } from '../utils/presupuesto';
import { useAuth } from '../store/AuthContext';

/** Ocupación típica de hoy (según el día de la semana) y registros reales de hoy, que son opcionales. */
async function cargarCurva(id: number) {
  const fecha = hoyEnColombia();
  const [tipica, reales] = await Promise.all([
    obtenerOcupacionTipica(id, fecha),
    obtenerOcupacionDelDia(id, fecha).catch(() => null),
  ]);
  return { tipica, registros: reales?.registros ?? [], horaActual: horaEnColombia() };
}

/** "los martes", "los sábados" (lunes a viernes no cambian en plural). */
const pluralDia = (dia: string) => (dia.endsWith('s') ? dia : `${dia}s`);

/** Explica de dónde sale la curva y qué se ve encima. */
function leyendaCurva(tipica: OcupacionTipicaDelDia, hayReales: boolean): string {
  const dias = pluralDia(tipica.nombreDia);
  const respaldo = tipica.base === 'fin_de_semana' ? 'de fin de semana' : 'entre semana';
  const base =
    tipica.base === 'dia_semana'
      ? `Promedio histórico de cada hora de los ${dias}`
      : `Aún no hay historial de los ${dias}; se usa el de los días ${respaldo}`;
  const cerradas = tipica.horas.some((h) => !h.abierto) ? ' Las franjas grises son horas en que está cerrado.' : '';
  return `${base}.${hayReales ? ' La línea oscura es lo registrado hoy.' : ''} Resaltada, la hora actual.${cerradas}`;
}

/** Dato con ícono bajo el nombre (ubicación, horario, precio), como en la referencia. */
function Dato({ icono, children }: { icono: NombreIcono; children: string }) {
  return (
    <View style={styles.dato}>
      <Icon name={icono} size={18} color={colors.secondary} />
      <Text style={styles.datoTexto}>{children}</Text>
    </View>
  );
}

export function DetalleDestinoScreen({ navigation, route }: AppScreenProps<'DetalleDestino'>) {
  useBarraEstado('light');
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const registrada = useRef<number | null>(null);
  const { rol } = useAuth();

  const destino = useAsync(() => obtenerDestino(id), [id]);
  const curva = useAsync(() => cargarCurva(id), [id]);
  // Clima y factores son opcionales: si fallan, el resto del detalle funciona igual.
  const clima = useAsync(() => obtenerClimaDestino(id), [id]);
  const prediccion = useAsync(() => obtenerPrediccion(id, hoyEnColombia(), horaMinutoEnColombia()), [id]);
  // "Por qué es para ti": las razones de la recomendación (solo turistas; si el destino no está entre sus recomendaciones, se omite).
  const porQue = useAsync(
    () => (rol === 'turista' ? obtenerRecomendaciones().then((r) => r.recomendaciones.find((x) => x.id === id) ?? null) : Promise.resolve(null)),
    [id, rol],
  );

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
  const credito = creditoFoto(d.imagen);
  const fuenteFoto = d.imagen?.fuente;
  const cerradoAhora = d.ocupacionActual?.estado === 'Cerrado';
  const verEnMapa = () => navigation.navigate('Tabs', { screen: 'Mapa', params: { destinoId: d.id } });
  const recargarTodo = () => {
    destino.recargar();
    curva.recargar();
    clima.recargar();
    prediccion.recargar();
    porQue.recargar();
  };

  return (
    <View style={styles.fondo}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={destino.refrescando} onRefresh={recargarTodo} tintColor={colors.white} />}
      >
        <View style={styles.hero}>
          <ImagenDestino destino={d} style={StyleSheet.absoluteFill} tamanoIcono={72} />
          <LinearGradient colors={colors.scrimTop} style={styles.scrimSuperior} />
          {credito && (
            <Pressable
              onPress={fuenteFoto ? () => void Linking.openURL(fuenteFoto) : undefined}
              disabled={!fuenteFoto}
              accessibilityRole={fuenteFoto ? 'link' : 'text'}
              accessibilityLabel={`${credito}${fuenteFoto ? '. Abrir la página de la foto' : ''}`}
              hitSlop={8}
              style={styles.credito}
            >
              <Text style={styles.creditoTexto} numberOfLines={1}>
                {credito}
              </Text>
            </Pressable>
          )}
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
          <View style={styles.datos}>
            <Dato icono="location-on">{d.ubicacion}</Dato>
            {d.horario && (
              <Dato icono="schedule">
                {`${formatearHorario(d.horario)}${d.ocupacionActual ? (cerradoAhora ? ' · Cerrado ahora' : ' · Abierto ahora') : ''}`}
              </Dato>
            )}
            {d.precio ? (
              <Dato icono="payments">{`${formatearPrecio(d.precio)} por persona`}</Dato>
            ) : (
              d.rangoPrecio && <Dato icono="payments">{ETIQUETA_PRECIO[d.rangoPrecio]}</Dato>
            )}
            {d.precio?.estimado && (
              <Tag icono="info-outline" style={styles.tagEstimado}>
                Estimado
              </Tag>
            )}
            {d.calificacion && (
              <View style={styles.dato}>
                <Estrellas valor={d.calificacion.promedio} tamano={16} />
                <Text style={styles.datoTexto}>{`${d.calificacion.promedio.toFixed(1).replace('.', ',')} (${d.calificacion.cantidad})`}</Text>
              </View>
            )}
          </View>

          {d.cierre && (
            <View style={styles.cierre} accessibilityRole="alert">
              <Icon name="block" size={20} color={colors.error} />
              <View style={styles.cierreTextos}>
                <Text style={styles.cierreTitulo}>Cerrado temporalmente</Text>
                {d.cierre.motivo ? <Text style={styles.cierreTexto}>Motivo: {d.cierre.motivo}</Text> : null}
                {d.cierre.hasta ? (
                  <Text style={styles.cierreTexto}>
                    Reabre previsiblemente el{' '}
                    {new Date(d.cierre.hasta).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {porQue.datos && porQue.datos.razones.length > 0 && (
            <GlassPanel tono="strong" radius={radius.panel} padding={spacing.md} style={styles.porQue}>
              <Overline>Por qué es para ti</Overline>
              {porQue.datos.porQue ? <Text style={styles.porQueFrase}>{porQue.datos.porQue}</Text> : null}
              <ListaRazones razones={porQue.datos.razones} />
            </GlassPanel>
          )}

          <LinearGradient
            colors={colors.gradientOcupacion}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ocupacion}
          >
            <View style={styles.ocupacionCabecera}>
              <Overline>Ocupación prevista ahora</Overline>
              {d.ocupacionActual && <Text style={styles.hora}>{d.ocupacionActual.hora}</Text>}
            </View>
            <IndicadorOcupacion ocupacion={d.ocupacionActual} variante="barra" capacidad={d.capacidad} />
            {d.ocupacionActual?.nivel && <Text style={styles.nota}>{NOTA_NIVEL[d.ocupacionActual.nivel]}</Text>}
            <FactoresPrediccion prediccion={prediccion.datos} cargando={prediccion.cargando} error={prediccion.error} />
          </LinearGradient>

          <Text style={styles.subtitulo}>Clima</Text>
          <TarjetaClima
            pronostico={clima.datos}
            cargando={clima.cargando}
            error={clima.error}
            onReintentar={clima.recargar}
          />

          {d.descripcion ? (
            <>
              <Text style={styles.subtitulo}>Descripción</Text>
              <Text style={styles.descripcion}>{d.descripcion}</Text>
            </>
          ) : null}

          <Text style={styles.subtitulo}>Ubicación y cómo llegar</Text>
          <MiniMapa
            nombre={d.nombre}
            categoria={d.categoria}
            latitud={d.latitud}
            longitud={d.longitud}
            onPress={verEnMapa}
          />
          {d.comoLlegar ? (
            <View style={[styles.comoLlegar, styles.comoLlegarSeparado]}>
              <Icon name="directions" size={22} color={colors.secondary} />
              <Text style={[styles.descripcion, styles.comoLlegarTexto]}>{d.comoLlegar}</Text>
            </View>
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

          <Text style={styles.subtitulo}>
            {curva.datos ? `Ocupación típica de un ${curva.datos.tipica.nombreDia}` : 'Ocupación durante el día'}
          </Text>
          {curva.cargando ? (
            <EstadoCargando mensaje="Calculando la ocupación típica…" />
          ) : curva.datos ? (
            <>
              <Text style={styles.leyendaGrafico}>
                {leyendaCurva(curva.datos.tipica, curva.datos.registros.length > 0)}
              </Text>
              <GlassPanel tono="strong" radius={radius.xl} padding={spacing.gutter}>
                <OcupacionChart
                  tipica={curva.datos.tipica.horas}
                  registros={curva.datos.registros}
                  horaActual={curva.datos.horaActual}
                />
              </GlassPanel>
            </>
          ) : (
            <Text style={styles.descripcion}>
              {curva.error instanceof ErrorApi && curva.error.status === 404
                ? 'Aún no hay datos suficientes para calcular la ocupación típica de este destino.'
                : 'No pudimos cargar la ocupación típica. Desliza hacia abajo para reintentar.'}
            </Text>
          )}

          <Text style={styles.subtitulo}>Reseñas</Text>
          <SeccionResenas idDestino={d.id} onCambio={destino.recargar} />

          <Pressable
            onPress={() => navigation.navigate('NuevoTicket', { idDestino: d.id, nombreDestino: d.nombre })}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.reportar}
          >
            <Icon name="report-problem" size={18} color={colors.textLink} />
            <Text style={styles.reportarTexto}>¿Algo está mal? Reportar un problema con este destino</Text>
          </Pressable>
        </View>
      </ScrollView>

      {botonVolver}
      <BotonFavorito destino={d} tono="glass" tamano={24} style={[styles.favorito, { top: insets.top + spacing.sm }]} />

      <View style={[styles.barraAcciones, shadows.lg, { bottom: Math.max(insets.bottom, spacing.gutter) + 6 }]}>
        <Button
          tamano="lg"
          icono="directions"
          style={styles.accion}
          onPress={() => abrirUbicacion(d.nombre, d.latitud, d.longitud)}
        >
          Cómo llegar
        </Button>
        <Button tamano="lg" variante="glass" icono="map" style={styles.accion} onPress={verEnMapa}>
          Ver en el mapa
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reportar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  reportarTexto: { ...typography.labelBold, color: colors.textLink, flex: 1 },
  fondo: { flex: 1, backgroundColor: colors.white },
  centro: { flex: 1, justifyContent: 'center' },
  volver: { position: 'absolute', left: spacing.screen, zIndex: 5 },
  favorito: { position: 'absolute', right: spacing.screen, zIndex: 5 },
  cierre: { flexDirection: 'row', gap: spacing.sm, padding: spacing.gutter, borderRadius: radius.lg, backgroundColor: colors.errorContainer, borderWidth: 1, borderColor: colors.errorBorder },
  cierreTextos: { flex: 1, gap: 2 },
  cierreTitulo: { ...typography.labelBold, color: colors.error },
  cierreTexto: { ...typography.bodyMd, color: colors.textStrong },
  hero: { height: 360, backgroundColor: colors.navy950 },
  scrimSuperior: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  credito: { position: 'absolute', left: spacing.screen, right: spacing.screen, bottom: 44, alignItems: 'flex-start' },
  creditoTexto: {
    ...typography.labelMd,
    fontSize: 11,
    color: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.glassDark,
  },
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
  tagEstimado: { paddingVertical: 1 },
  porQue: { marginTop: spacing.screen, gap: spacing.sm },
  porQueFrase: { ...typography.bodyMd, color: colors.textStrong },
  nombre: { ...typography.display, color: colors.textStrong },
  datos: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: 4, marginTop: spacing.sm },
  dato: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, maxWidth: '100%' },
  datoTexto: { ...typography.bodyMd, color: colors.textMuted, flexShrink: 1 },
  comoLlegar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.panel,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  comoLlegarTexto: { flex: 1 },
  comoLlegarSeparado: { marginTop: spacing.sm },
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
    backgroundColor: colors.glassBar,
    borderWidth: 1,
    borderColor: colors.glassBarBorder,
  },
  accion: { flex: 1, borderRadius: radius.panel },
});
