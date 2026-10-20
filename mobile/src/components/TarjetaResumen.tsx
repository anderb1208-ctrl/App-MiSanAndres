import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { mensajeDeError } from '../services/api';
import { colors, motion, panelColors, radius, shadows, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Button } from './Button';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Bloque, Esqueleto } from './Esqueleto';
import { GrupoVidrio, SuperficieVidrio } from './SuperficieVidrio';

/**
 * Superficie de los paneles resumen (Inicio, Panel del administrador, Tickets del técnico):
 * SuperficieVidrio (panel) con el degradado azul claro encima. Liquid Glass en iOS 26+,
 * desenfoque en iOS anterior, velo con borde en Android y casi opaco con Reducir transparencia.
 */
export function PanelDegradado({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SuperficieVidrio variante="panel" style={[styles.panel, style]}>
      <LinearGradient
        colors={panelColors.degradado}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, styles.degradado]}
        pointerEvents="none"
      />
      {children}
    </SuperficieVidrio>
  );
}

/** "OCUPACIÓN AHORA" en azul medio con espaciado, subtítulo debajo y algo opcional a la derecha. */
export function EncabezadoPanel({ titulo, subtitulo, derecha }: { titulo: string; subtitulo?: ReactNode; derecha?: ReactNode }) {
  return (
    <View style={styles.cabecera}>
      <View style={styles.cabeceraTextos}>
        <Text style={styles.overline} accessibilityRole="header">
          {titulo}
        </Text>
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {derecha}
    </View>
  );
}

/** Título de sección dentro de un panel ("LO MÁS TRANQUILO AHORA"). */
export function OverlinePanel({ children }: { children: string }) {
  return (
    <Text style={styles.overline} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Separador dentro de un panel. */
export function SeparadorPanel() {
  return <View style={styles.separador} />;
}

export interface CifraResumen {
  clave: string;
  valor: number | string;
  /** Etiqueta completa: puede ocupar dos líneas, nunca se corta con puntos suspensivos. */
  etiqueta: string;
  icono?: NombreIcono;
  /** Lo que lee el lector de pantalla (por defecto "valor etiqueta"). */
  accesible?: string;
  onPress?: () => void;
}

interface Props {
  titulo: string;
  subtitulo?: ReactNode;
  cifras: CifraResumen[];
  cargando?: boolean;
  error?: unknown;
  onReintentar?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tarjeta héroe de un panel: degradado azul sobre vidrio, encabezado en azul medio y cifras en
 * una cuadrícula de 2 columnas (2 × 2; con un número impar, la última ocupa el ancho). Cada cifra
 * es una tarjeta de vidrio (dentro de un GrupoVidrio, para que en iOS 26 se fusionen y animen
 * juntas): número grande, etiqueta completa, ícono y flecha. Máximo dos capas de vidrio.
 */
export function TarjetaResumen({ titulo, subtitulo, cifras, cargando = false, error, onReintentar, style }: Props) {
  return (
    <PanelDegradado style={[styles.heroe, style]}>
      <EncabezadoPanel titulo={titulo} subtitulo={subtitulo} />
      {cargando ? (
        <Esqueleto etiqueta={`Cargando ${titulo.toLowerCase()}`} style={styles.grilla}>
          {cifras.map((c) => (
            <View key={c.clave} style={[styles.celda, styles.cifra, styles.cifraEsqueleto]}>
              <Bloque ancho={32} alto={32} radio={16} />
              <Bloque ancho={44} alto={28} />
              <Bloque ancho="75%" alto={12} />
            </View>
          ))}
        </Esqueleto>
      ) : error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Icon name="cloud-off" size={20} color={colors.error} />
          <View style={styles.errorTextos}>
            <Text style={styles.errorTexto}>{mensajeDeError(error)}</Text>
            {onReintentar && (
              <Button variante="secondary" icono="refresh" onPress={onReintentar} style={styles.errorBoton}>
                Reintentar
              </Button>
            )}
          </View>
        </View>
      ) : (
        <GrupoVidrio espaciado={spacing.sm} style={styles.grilla}>
          {cifras.map((c) => (
            <Cifra key={c.clave} cifra={c} />
          ))}
        </GrupoVidrio>
      )}
    </PanelDegradado>
  );
}

function Cifra({ cifra }: { cifra: CifraResumen }) {
  const contenido = (
    <SuperficieVidrio
      variante="tarjeta"
      tinte={{ fondo: panelColors.vidrioFila, borde: panelColors.vidrioFilaBorde }}
      sombra={false}
      style={styles.cifra}
    >
      <View style={styles.cifraArriba}>
        <View style={styles.icono}>{cifra.icono && <Icon name={cifra.icono} size={18} color={panelColors.encabezado} />}</View>
        {cifra.onPress && <Icon name="arrow-forward" size={18} color={panelColors.encabezado} />}
      </View>
      <Text style={styles.valor}>{cifra.valor}</Text>
      <Text style={styles.etiqueta}>{cifra.etiqueta}</Text>
    </SuperficieVidrio>
  );
  const accesible = cifra.accesible ?? `${cifra.valor} ${cifra.etiqueta}`;
  if (!cifra.onPress) {
    return (
      <View style={styles.celda} accessible accessibilityLabel={accesible}>
        {contenido}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={cifra.onPress}
      escala={motion.pressScale.button}
      brillo={radius.xl}
      accessibilityRole="button"
      accessibilityLabel={accesible}
      style={styles.celda}
    >
      {contenido}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, gap: spacing.gutter, borderRadius: radius.xxl },
  heroe: shadows.lg,
  degradado: { borderRadius: radius.xxl },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cabeceraTextos: { flex: 1, gap: 2 },
  overline: { ...typography.overline, letterSpacing: 1.4, color: panelColors.encabezado },
  subtitulo: { ...typography.bodyLg, color: colors.textStrong },
  separador: { height: StyleSheet.hairlineWidth * 2, backgroundColor: panelColors.separador },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Dos columnas: cada celda ocupa casi la mitad y crece; una impar al final llena la fila.
  celda: { flexGrow: 1, flexBasis: '45%', minWidth: 0 },
  cifra: { minHeight: 112, padding: spacing.gutter, borderRadius: radius.xl, gap: spacing.xs },
  cifraEsqueleto: { backgroundColor: panelColors.vidrioFila },
  cifraArriba: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  icono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: panelColors.pildora,
  },
  valor: { ...typography.display, fontSize: 30, lineHeight: 34, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  etiqueta: { ...typography.labelBold, fontSize: 14, lineHeight: 18, color: panelColors.secundario },

  error: { flexDirection: 'row', gap: spacing.gutter },
  errorTextos: { flex: 1, gap: spacing.sm },
  errorTexto: { ...typography.bodyMd, color: colors.textStrong },
  errorBoton: { alignSelf: 'flex-start' },
});
