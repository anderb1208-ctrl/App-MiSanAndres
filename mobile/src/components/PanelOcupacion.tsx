import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAsync } from '../hooks/useAsync';
import { useReducirMovimiento } from '../hooks/useReducirMovimiento';
import { mensajeDeError } from '../services/api';
import { obtenerClimaIsla } from '../services/clima';
import type { Destino } from '../services/tipos';
import { colors, motion, occupancyColors, panelColors, radius, spacing, typography } from '../theme';
import { filasLeyenda } from '../utils/anillo';
import { CATEGORIAS } from '../utils/categorias';
import { estadoDelTiempo, formatearTemperatura } from '../utils/clima';
import { textoOcupacion } from '../utils/ocupacion';
import { distribuirPorNivel, horaPrevision, masTranquilos, type DistribucionOcupacion, type GrupoOcupacion } from '../utils/resumenOcupacion';
import { AnilloOcupacion } from './AnilloOcupacion';
import { Button } from './Button';
import { ChipEstado, tonoOcupacion } from './ChipEstado';
import { Icon } from './Icon';
import { ImagenDestino } from './ImagenDestino';
import { PressableScale } from './PressableScale';
import { SuperficieVidrio } from './SuperficieVidrio';

/** Cuadrito de la leyenda: relleno del color del segmento y borde oscuro (≥ 3:1 sobre el panel). */
const CUADRITO: Record<GrupoOcupacion, { relleno: string; borde: string }> = {
  Bajo: { relleno: occupancyColors.Bajo.main, borde: occupancyColors.Bajo.fg },
  Medio: { relleno: occupancyColors.Medio.main, borde: occupancyColors.Medio.fg },
  Alto: { relleno: occupancyColors.Alto.main, borde: occupancyColors.Alto.fg },
  Cerrado: { relleno: panelColors.pista, borde: panelColors.contorno },
};
const ACCESIBLE: Record<GrupoOcupacion, string> = {
  Bajo: 'Ocupación baja',
  Medio: 'Ocupación media',
  Alto: 'Ocupación alta',
  Cerrado: 'Cerrados ahora',
};

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
 * Panel "Ocupación ahora" de Inicio: degradado azul claro sobre una superficie de vidrio, anillo
 * de los abiertos por nivel con su leyenda, los 3 lugares más tranquilos en filas de vidrio y el
 * clima actual de la caché del backend. Las filas usan desenfoque con velo blanco (no Liquid
 * Glass), así no hay vidrio nativo sobre vidrio nativo.
 */
export function PanelOcupacion({ destinos, cargando, error, horaRespaldo, onReintentar, onElegirGrupo, onAbrirDestino }: Props) {
  const [verNota, setVerNota] = useState(false);
  const hora = horaPrevision(destinos) ?? horaRespaldo ?? null;

  return (
    <SuperficieVidrio variante="panel" style={styles.panel}>
      <LinearGradient
        colors={panelColors.degradado}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, styles.degradado]}
        pointerEvents="none"
      />

      <View style={styles.cabecera}>
        <View style={styles.cabeceraTextos}>
          <Text style={styles.overline} accessibilityRole="header">
            Ocupación ahora
          </Text>
          {hora ? (
            <Text style={styles.hora}>
              Previsión para las <Text style={styles.horaNegrita}>{hora}</Text>
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setVerNota((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Estimado"
          accessibilityHint="Explica de dónde salen estas cifras"
          accessibilityState={{ expanded: verNota }}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          style={({ pressed }) => [styles.estimado, pressed && styles.estimadoPresionado]}
        >
          <View style={styles.estimadoPunto} />
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
  if (distribucion.total === 0) {
    return (
      <View style={styles.estado}>
        <Icon name="travel-explore" size={22} color={panelColors.encabezado} />
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

  const tranquilos = masTranquilos(destinos);
  return (
    <>
      <View style={styles.resumen}>
        <AnilloOcupacion distribucion={distribucion} onElegir={onElegirGrupo} />
        <Leyenda distribucion={distribucion} onElegir={onElegirGrupo} />
      </View>
      {distribucion.sinDatos > 0 && (
        <Text style={styles.sinDatos}>{plural(distribucion.sinDatos, 'destino sin previsión', 'destinos sin previsión')}</Text>
      )}

      <View style={styles.separador} />
      <Text style={styles.overline} accessibilityRole="header">
        Lo más tranquilo ahora
      </Text>
      {tranquilos.length === 0 ? (
        <Text style={styles.estadoTexto}>Ningún destino está abierto en este momento.</Text>
      ) : (
        <View style={styles.tranquilos}>
          {tranquilos.map((d) => (
            <FilaTranquila key={d.id} destino={d} onPress={() => onAbrirDestino(d.id)} />
          ))}
        </View>
      )}
    </>
  );
}

/** Leyenda: cuadrito, nombre y cifra alineada a la derecha. Cada fila mide ≥ 44 px de área táctil. */
function Leyenda({ distribucion, onElegir }: { distribucion: DistribucionOcupacion; onElegir: (g: GrupoOcupacion) => void }) {
  return (
    <View style={styles.leyenda}>
      {filasLeyenda(distribucion).map((f) => (
        <Pressable
          key={f.grupo}
          onPress={() => onElegir(f.grupo)}
          disabled={f.cantidad === 0}
          accessibilityRole="button"
          accessibilityLabel={`${ACCESIBLE[f.grupo]}: ${plural(f.cantidad, 'destino', 'destinos')}`}
          accessibilityHint={f.cantidad > 0 ? 'Abre Explorar con este filtro' : undefined}
          accessibilityState={{ disabled: f.cantidad === 0 }}
          hitSlop={{ top: 4, bottom: 4 }}
          style={({ pressed }) => [styles.leyendaFila, pressed && styles.leyendaPresionada]}
        >
          <View style={[styles.cuadrito, { backgroundColor: CUADRITO[f.grupo].relleno, borderColor: CUADRITO[f.grupo].borde }]} />
          <Text style={styles.leyendaNombre} numberOfLines={1}>
            {f.etiqueta}
          </Text>
          <Text style={styles.leyendaCifra}>{f.cantidad}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Fila de "Lo más tranquilo ahora": vidrio translúcido (blanco 62 % con desenfoque) sobre el degradado. */
function FilaTranquila({ destino, onPress }: { destino: Destino; onPress: () => void }) {
  const o = destino.ocupacionActual;
  const nivel = o?.nivel ? occupancyColors[o.nivel] : null;
  return (
    <PressableScale
      onPress={onPress}
      escala={motion.pressScale.button}
      accessibilityRole="button"
      accessibilityLabel={`${destino.nombre}, ${CATEGORIAS[destino.categoria].singular}. ${textoOcupacion(o).accesible}`}
      accessibilityHint="Abre el detalle"
    >
      <SuperficieVidrio
        variante="tarjeta"
        calidad="desenfoque"
        tinte={{ fondo: panelColors.vidrioFila, borde: panelColors.vidrioFilaBorde }}
        sombra={false}
        style={styles.fila}
      >
        <ImagenDestino destino={destino} style={styles.miniatura} tamanoIcono={20} />
        <View style={styles.filaTextos}>
          <Text style={styles.filaNombre} numberOfLines={1}>
            {destino.nombre}
          </Text>
          <Text style={styles.filaCategoria} numberOfLines={1}>
            {CATEGORIAS[destino.categoria].singular}
          </Text>
        </View>
        {nivel && o ? <ChipEstado etiqueta={`${Math.round(o.porcentaje)} %`} tono={tonoOcupacion(nivel)} /> : null}
        <Icon name="chevron-right" size={20} color={panelColors.secundario} />
      </SuperficieVidrio>
    </PressableScale>
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
      <View style={styles.resumen}>
        {bloque({ width: 112, height: 112, borderRadius: 56 })}
        <View style={styles.leyenda}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.leyendaFila}>
              {bloque({ width: 12, height: 12, borderRadius: 3 })}
              {bloque({ flex: 1, height: 12 })}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.separador} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.fila, styles.filaEsqueleto]}>
          {bloque({ width: 40, height: 40, borderRadius: radius.lg })}
          <View style={styles.filaTextos}>
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
  const principal = `${formatearTemperatura(actual.temperatura)} · ${estado.texto}`;
  const lluvia = actual.probLluvia === null ? null : `Lluvia ${actual.probLluvia} %`;
  return (
    <>
      <View style={styles.separador} />
      <Pressable
        onPress={() => void Linking.openURL(datos?.atribucion.url ?? 'https://open-meteo.com/')}
        accessibilityRole="link"
        accessibilityLabel={`Clima ahora en San Andrés: ${principal.replace('°', ' grados')}${lluvia ? `, ${lluvia}` : ''}. Datos de Open-Meteo.com`}
        style={styles.clima}
      >
        <View style={styles.climaIcono}>
          <Icon name={estado.icono} size={22} color={panelColors.encabezado} />
        </View>
        <View style={styles.climaTextos}>
          <Text style={styles.climaPrincipal} numberOfLines={1}>
            {principal}
          </Text>
          {lluvia ? <Text style={styles.climaLluvia}>{lluvia}</Text> : null}
        </View>
        <Text style={styles.climaFuente}>Open-Meteo</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, gap: spacing.gutter, borderRadius: radius.xxl },
  degradado: { borderRadius: radius.xxl },

  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cabeceraTextos: { flex: 1, gap: 2 },
  overline: { ...typography.overline, letterSpacing: 1.4, color: panelColors.encabezado },
  hora: { ...typography.bodyLg, color: colors.textStrong },
  horaNegrita: { fontFamily: typography.labelBold.fontFamily },
  estimado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: panelColors.pildora,
    borderWidth: 1,
    borderColor: panelColors.pildoraBorde,
  },
  estimadoPresionado: { backgroundColor: colors.surfaceLow },
  estimadoPunto: { width: 8, height: 8, borderRadius: 4, backgroundColor: panelColors.encabezado },
  estimadoTexto: { ...typography.labelBold, fontSize: 14, lineHeight: 18, color: panelColors.encabezado },
  nota: { padding: spacing.gutter, borderRadius: radius.lg, backgroundColor: panelColors.vidrioFila },
  notaTexto: { ...typography.bodyMd, color: colors.textStrong },

  resumen: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  leyenda: { flex: 1, gap: spacing.sm },
  // 36 px de alto + 4 px de hitSlop arriba y abajo = 44 px táctiles sin solaparse (separación 8).
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 36, borderRadius: radius.md, paddingHorizontal: 4 },
  leyendaPresionada: { backgroundColor: panelColors.vidrioFila },
  cuadrito: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5 },
  leyendaNombre: { ...typography.bodyLg, color: colors.textStrong, flex: 1 },
  leyendaCifra: { ...typography.titleMd, fontFamily: typography.display.fontFamily, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  sinDatos: { ...typography.labelMd, color: panelColors.secundario },

  separador: { height: StyleSheet.hairlineWidth * 2, backgroundColor: panelColors.separador },
  tranquilos: { gap: spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 56, paddingVertical: spacing.sm, paddingHorizontal: spacing.gutter, borderRadius: radius.xl },
  filaEsqueleto: { backgroundColor: panelColors.vidrioFila },
  miniatura: { width: 40, height: 40, borderRadius: radius.lg, backgroundColor: panelColors.pista },
  filaTextos: { flex: 1, minWidth: 0 },
  filaNombre: { ...typography.titleMd, fontSize: 16, lineHeight: 22, color: colors.textStrong },
  filaCategoria: { ...typography.bodyMd, color: panelColors.secundario },

  clima: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 48 },
  climaIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: panelColors.pildora,
    borderWidth: 1,
    borderColor: panelColors.pildoraBorde,
  },
  climaTextos: { flex: 1, minWidth: 0 },
  climaPrincipal: { ...typography.titleMd, fontSize: 16, lineHeight: 22, color: colors.textStrong },
  climaLluvia: { ...typography.bodyMd, color: panelColors.secundario },
  climaFuente: { ...typography.labelBold, color: panelColors.secundario },

  estado: { flexDirection: 'row', gap: spacing.gutter, paddingVertical: spacing.xs },
  estadoTextos: { flex: 1, gap: 4 },
  estadoTitulo: { ...typography.titleMd, fontSize: 16, color: colors.textStrong },
  estadoTexto: { ...typography.bodyMd, color: panelColors.secundario },
  estadoBoton: { alignSelf: 'flex-start', marginTop: spacing.sm },
  esqueleto: { gap: spacing.gutter },
  bloque: { backgroundColor: colors.track, borderRadius: radius.sm },
});
