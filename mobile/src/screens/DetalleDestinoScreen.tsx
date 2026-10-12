import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { ImagenDestino } from '../components/ImagenDestino';
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
import { obtenerOcupacionDelDia, obtenerOcupacionTipica } from '../services/ocupacion';
import type { OcupacionTipicaDelDia } from '../services/tipos';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { CATEGORIAS, ICONOS_PREFERENCIA, type NombreIcono } from '../utils/categorias';
import { creditoFoto, ETIQUETA_PRECIO, formatearHorario } from '../utils/contenido';
import { horaEnColombia, hoyEnColombia } from '../utils/fecha';
import { NOTA_NIVEL } from '../utils/ocupacion';

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
  const credito = creditoFoto(d.imagen);
  const fuenteFoto = d.imagen?.fuente;
  const cerradoAhora = d.ocupacionActual?.estado === 'Cerrado';
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
            {d.rangoPrecio && <Dato icono="payments">{ETIQUETA_PRECIO[d.rangoPrecio]}</Dato>}
          </View>

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
          </LinearGradient>

          {d.descripcion ? (
            <>
              <Text style={styles.subtitulo}>Descripción</Text>
              <Text style={styles.descripcion}>{d.descripcion}</Text>
            </>
          ) : null}

          {d.comoLlegar ? (
            <>
              <Text style={styles.subtitulo}>Cómo llegar</Text>
              <View style={styles.comoLlegar}>
                <Icon name="directions" size={22} color={colors.secondary} />
                <Text style={[styles.descripcion, styles.comoLlegarTexto]}>{d.comoLlegar}</Text>
              </View>
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
