import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAsync } from '../hooks/useAsync';
import { useReducirMovimiento } from '../hooks/useReducirMovimiento';
import { mensajeDeError } from '../services/api';
import { obtenerClimaIsla } from '../services/clima';
import type { Destino } from '../services/tipos';
import { colors, mapColors, motion, occupancyColors, radius, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { estadoDelTiempo, formatearTemperatura } from '../utils/clima';
import { textoOcupacion } from '../utils/ocupacion';
import {
  distribuirPorNivel,
  GRUPOS_OCUPACION,
  horaPrevision,
  masTranquilos,
  segmentosDistribucion,
  type GrupoOcupacion,
} from '../utils/resumenOcupacion';
import { Button } from './Button';
import { Icon } from './Icon';
import { ImagenDestino } from './ImagenDestino';
import { OcupacionCompacta } from './OcupacionCompacta';
import { PressableScale } from './PressableScale';
import { SuperficieVidrio } from './SuperficieVidrio';

/** Etiqueta y color de cada grupo; el color nunca va sin la palabra. */
const GRUPO: Record<GrupoOcupacion, { etiqueta: string; accesible: string; color: string }> = {
  Bajo: { etiqueta: 'Baja', accesible: 'Ocupación baja', color: occupancyColors.Bajo.main },
  Medio: { etiqueta: 'Media', accesible: 'Ocupación media', color: occupancyColors.Medio.main },
  Alto: { etiqueta: 'Alta', accesible: 'Ocupación alta', color: occupancyColors.Alto.main },
  Cerrado: { etiqueta: 'Cerrados', accesible: 'Cerrados ahora', color: mapColors.cerrado },
};

const ALTO_BARRA = 12;
/** Alto del área táctil de cada segmento (la barra mide 12; se amplía con hitSlop). */
const AMPLIAR_SEGMENTO = (44 - ALTO_BARRA) / 2;

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

interface Props {
  destinos: Destino[] | null;
  cargando: boolean;
  error: unknown;
  /** Hora de respaldo si ningún destino trae la suya (la de las recomendaciones). */
  horaRespaldo?: string | null;
  onReintentar: () => void;
  onElegirGrupo: (grupo: GrupoOcupacion) => void;
  onAbrirDestino: (id: number) => void;
}

/**
 * Panel "Ocupación ahora" de Inicio (vidrio real en iOS 26+): distribución por nivel tocable,
 * los 3 lugares más tranquilos y el clima actual de la caché del backend.
 * Dentro no hay otras superficies de vidrio (nada de vidrio sobre vidrio).
 */
export function PanelOcupacion({ destinos, cargando, error, horaRespaldo, onReintentar, onElegirGrupo, onAbrirDestino }: Props) {
  const [verNota, setVerNota] = useState(false);
  const hora = horaPrevision(destinos) ?? horaRespaldo ?? null;

  return (
    <SuperficieVidrio
      variante="panel"
      // Velo blanco fuerte: parte del panel queda sobre la foto y el texto debe leerse (≥ 4.5:1).
      tinte={{ fondo: colors.glassStrong, borde: colors.glassBorder }}
      style={styles.panel}
    >
      <View style={styles.cabecera}>
        <View style={styles.cabeceraTextos}>
          <Text style={styles.titulo} accessibilityRole="header">
            Ocupación ahora
          </Text>
          {hora ? <Text style={styles.hora}>Previsión para las {hora}</Text> : null}
        </View>
        <Pressable
          onPress={() => setVerNota((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Estimado"
          accessibilityHint="Explica de dónde salen estas cifras"
          accessibilityState={{ expanded: verNota }}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          style={({ pressed }) => [styles.estimado, pressed && styles.estimadoPresionado]}
        >
          <Icon name="info-outline" size={14} color={colors.textMuted} />
          <Text style={styles.estimadoTexto}>Estimado</Text>
        </Pressable>
      </View>

      {verNota && (
        <View style={styles.nota} accessibilityLiveRegion="polite">
          <Text style={styles.notaTexto}>
            Estas cifras son una estimación calculada con datos simulados de afluencia, no conteos en tiempo real. Úsalas
            como guía para elegir a dónde ir.
          </Text>
        </View>
      )}

      <Contenido
        destinos={destinos}
        cargando={cargando}
        error={error}
        onReintentar={onReintentar}
        onElegirGrupo={onElegirGrupo}
        onAbrirDestino={onAbrirDestino}
      />

      <LineaClima />
    </SuperficieVidrio>
  );
}

function Contenido({ destinos, cargando, error, onReintentar, onElegirGrupo, onAbrirDestino }: Omit<Props, 'horaRespaldo'>) {
  if (!destinos) {
    if (cargando) return <Esqueleto />;
    return (
      <View style={styles.estado} accessibilityRole="alert">
        <Icon name="cloud-off" size={22} color={colors.error} />
        <View style={styles.estadoTextos}>
          <Text style={styles.estadoTitulo}>No pudimos cargar la ocupación</Text>
          <Text style={styles.estadoTexto}>{error ? mensajeDeError(error) : 'Revisa tu conexión e inténtalo de nuevo.'}</Text>
          <Button variante="secondary" icono="refresh" onPress={onReintentar} style={styles.estadoBoton}>
            Reintentar
          </Button>
        </View>
      </View>
    );
  }

  const distribucion = distribuirPorNivel(destinos);
  const tranquilos = masTranquilos(destinos);

  if (distribucion.total === 0) {
    return (
      <View style={styles.estado}>
        <Icon name="travel-explore" size={22} color={colors.secondary} />
        <View style={styles.estadoTextos}>
          <Text style={styles.estadoTitulo}>Aún no hay previsión</Text>
          <Text style={styles.estadoTexto}>
            {distribucion.sinDatos > 0
              ? 'Los destinos todavía no tienen una estimación para esta hora. Desliza hacia abajo para actualizar.'
              : 'Todavía no hay destinos disponibles.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <BarraDistribucion distribucion={distribucion} onElegir={onElegirGrupo} />

      <View style={styles.leyenda}>
        {GRUPOS_OCUPACION.map((g) => {
          const cantidad = distribucion.conteo[g];
          return (
            <PressableScale
              key={g}
              onPress={() => onElegirGrupo(g)}
              disabled={cantidad === 0}
              escala={motion.pressScale.chip}
              accessibilityRole="button"
              accessibilityLabel={`${GRUPO[g].accesible}: ${plural(cantidad, 'destino', 'destinos')}`}
              accessibilityHint={cantidad > 0 ? 'Abre Explorar con este filtro' : undefined}
              accessibilityState={{ disabled: cantidad === 0 }}
              style={styles.leyendaItem}
            >
              <Text style={styles.leyendaCifra}>{cantidad}</Text>
              <View style={styles.leyendaEtiqueta}>
                <View style={[styles.punto, { backgroundColor: GRUPO[g].color }]} />
                <Text style={styles.leyendaTexto} numberOfLines={1}>
                  {GRUPO[g].etiqueta}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>
      {distribucion.sinDatos > 0 && (
        <Text style={styles.sinDatos}>{plural(distribucion.sinDatos, 'destino sin previsión', 'destinos sin previsión')}</Text>
      )}

      <View style={styles.separador} />
      <Text style={styles.overline}>Lo más tranquilo ahora</Text>
      {tranquilos.length === 0 ? (
        <Text style={styles.estadoTexto}>Ningún destino está abierto en este momento.</Text>
      ) : (
        <View style={styles.tranquilos}>
          {tranquilos.map((d) => (
            <PressableScale
              key={d.id}
              onPress={() => onAbrirDestino(d.id)}
              accessibilityRole="button"
              accessibilityLabel={`${d.nombre}, ${CATEGORIAS[d.categoria].singular}. ${textoOcupacion(d.ocupacionActual).accesible}`}
              accessibilityHint="Abre el detalle"
              style={styles.tranquilo}
            >
              <ImagenDestino destino={d} style={styles.miniatura} tamanoIcono={20} />
              <View style={styles.tranquiloTextos}>
                <Text style={styles.tranquiloNombre} numberOfLines={1}>
                  {d.nombre}
                </Text>
                <Text style={styles.tranquiloCategoria} numberOfLines={1}>
                  {CATEGORIAS[d.categoria].singular}
                </Text>
              </View>
              <OcupacionCompacta ocupacion={d.ocupacionActual} variante="chip" />
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </PressableScale>
          ))}
        </View>
      )}
    </>
  );
}

/** Barra apilada por nivel; se llena de izquierda a derecha al aparecer. */
function BarraDistribucion({
  distribucion,
  onElegir,
}: {
  distribucion: ReturnType<typeof distribuirPorNivel>;
  onElegir: (g: GrupoOcupacion) => void;
}) {
  const reducirMovimiento = useReducirMovimiento();
  const progreso = useRef(new Animated.Value(reducirMovimiento ? 1 : 0)).current;
  const segmentos = segmentosDistribucion(distribucion);

  useEffect(() => {
    if (reducirMovimiento) {
      progreso.setValue(1);
      return;
    }
    progreso.setValue(0);
    Animated.timing(progreso, {
      toValue: 1,
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Se vuelve a llenar solo cuando cambia la distribución, no en cada render.
  }, [distribucion.total, distribucion.conteo.Bajo, distribucion.conteo.Medio, distribucion.conteo.Alto, reducirMovimiento, progreso]);

  return (
    // La leyenda de abajo es la versión accesible; la barra es su representación visual.
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.barraMarco}>
      <Animated.View style={[styles.barra, { transform: [{ scaleX: progreso }] }]}>
        {segmentos.map((s) => (
          <Pressable
            key={s.grupo}
            onPress={() => onElegir(s.grupo)}
            hitSlop={{ top: AMPLIAR_SEGMENTO, bottom: AMPLIAR_SEGMENTO }}
            style={[styles.segmento, { flexGrow: s.cantidad, backgroundColor: GRUPO[s.grupo].color }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

/** Esqueleto con la misma forma del contenido (no salta el diseño al cargar). */
function Esqueleto() {
  const reducirMovimiento = useReducirMovimiento();
  const pulso = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducirMovimiento) return;
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(pulso, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [reducirMovimiento, pulso]);

  // La opacidad va en los bloques (hijos), nunca en la superficie de vidrio.
  const bloque = (estilo: object) => <Animated.View style={[styles.bloque, estilo, { opacity: pulso }]} />;
  return (
    <View accessible accessibilityLabel="Cargando la ocupación" accessibilityState={{ busy: true }} style={styles.esqueleto}>
      {bloque({ height: ALTO_BARRA, borderRadius: radius.full })}
      <View style={styles.leyenda}>
        {GRUPOS_OCUPACION.map((g) => (
          <View key={g} style={styles.leyendaItem}>
            {bloque({ width: 28, height: 24 })}
            {bloque({ width: 52, height: 12, marginTop: 6 })}
          </View>
        ))}
      </View>
      <View style={styles.separador} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.tranquilo}>
          {bloque({ width: 44, height: 44, borderRadius: radius.md })}
          <View style={styles.tranquiloTextos}>
            {bloque({ width: '70%', height: 14 })}
            {bloque({ width: '40%', height: 12, marginTop: 6 })}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Clima actual de la isla (caché del backend: GET /v1/clima). Si no hay, no ocupa espacio. */
function LineaClima() {
  const { datos } = useAsync(() => obtenerClimaIsla(1), [], { recargarAlEnfocar: true });
  const actual = datos?.disponible ? datos.actual : null;
  if (!actual || actual.temperatura === null) return null;

  const estado = estadoDelTiempo(actual.codigoClima);
  const lluvia = actual.probLluvia === null ? null : `Lluvia ${actual.probLluvia} %`;
  const texto = [formatearTemperatura(actual.temperatura), estado.texto, lluvia].filter(Boolean).join(' · ');
  return (
    <>
      <View style={styles.separador} />
      <Pressable
        onPress={() => void Linking.openURL(datos?.atribucion.url ?? 'https://open-meteo.com/')}
        accessibilityRole="link"
        accessibilityLabel={`Clima ahora en San Andrés: ${texto.replace('°', ' grados')}. Datos de Open-Meteo.com`}
        style={styles.clima}
      >
        <Icon name={estado.icono} size={20} color={colors.secondary} />
        <Text style={styles.climaTexto} numberOfLines={1}>
          {texto}
        </Text>
        <Text style={styles.climaFuente}>Open-Meteo</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, gap: spacing.gutter },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cabeceraTextos: { flex: 1 },
  titulo: { ...typography.titleMd, color: colors.textStrong },
  hora: { ...typography.bodyMd, color: colors.textMuted },
  estimado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  estimadoPresionado: { backgroundColor: colors.pressedOverlay },
  estimadoTexto: { ...typography.labelBold, color: colors.textMuted },
  nota: { padding: spacing.gutter, borderRadius: radius.lg, backgroundColor: colors.turquoiseTint },
  notaTexto: { ...typography.bodyMd, color: colors.textStrong },

  barraMarco: { height: ALTO_BARRA, marginTop: spacing.xs },
  barra: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
    transformOrigin: 'left',
  },
  segmento: { flexBasis: 0, minWidth: 6, height: '100%' },

  leyenda: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs },
  // En pantallas angostas pasa a 2 × 2 en lugar de cortar las etiquetas.
  leyendaItem: { flexGrow: 1, flexBasis: 72, minHeight: 52, justifyContent: 'center', paddingVertical: spacing.xs },
  leyendaCifra: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  leyendaEtiqueta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { ...typography.labelBold, color: colors.textMuted, flexShrink: 1 },
  sinDatos: { ...typography.labelMd, color: colors.textMuted },

  separador: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  overline: { ...typography.overline, color: colors.textMuted },
  tranquilos: { gap: spacing.xs },
  tranquilo: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 56 },
  miniatura: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surfaceLow },
  tranquiloTextos: { flex: 1 },
  tranquiloNombre: { ...typography.titleMd, fontSize: 16, color: colors.textStrong },
  tranquiloCategoria: { ...typography.labelMd, color: colors.textMuted },

  clima: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  climaTexto: { ...typography.bodyMd, fontFamily: typography.titleMd.fontFamily, color: colors.textStrong, flex: 1 },
  climaFuente: { ...typography.labelMd, color: colors.textLink, textDecorationLine: 'underline' },

  estado: { flexDirection: 'row', gap: spacing.gutter, paddingVertical: spacing.xs },
  estadoTextos: { flex: 1, gap: 4 },
  estadoTitulo: { ...typography.titleMd, fontSize: 16, color: colors.textStrong },
  estadoTexto: { ...typography.bodyMd, color: colors.textMuted },
  estadoBoton: { alignSelf: 'flex-start', marginTop: spacing.sm },
  esqueleto: { gap: spacing.gutter },
  bloque: { backgroundColor: colors.track, borderRadius: radius.sm },
});
