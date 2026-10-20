import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { mensajeDeError } from '../services/api';
import { colors, motion, panelColors, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { Button } from './Button';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { SuperficieVidrio } from './SuperficieVidrio';

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
 * Panel resumen en el estilo del de Inicio: degradado azul, encabezado en azul medio y cifras en
 * tarjetas de vidrio (blanco translúcido con desenfoque), en dos columnas para pantallas angostas.
 * Cada cifra puede ser tocable (≥ 44 px). Incluye esqueleto y error con reintento.
 */
export function TarjetaResumen({ titulo, subtitulo, cifras, cargando = false, error, onReintentar, style }: Props) {
  return (
    <PanelDegradado style={style}>
      <EncabezadoPanel titulo={titulo} subtitulo={subtitulo} />
      {cargando ? (
        <View style={styles.grilla} accessible accessibilityLabel={`Cargando ${titulo.toLowerCase()}`} accessibilityState={{ busy: true }}>
          {cifras.map((c) => (
            <View key={c.clave} style={[styles.cifra, styles.cifraEsqueleto]}>
              <View style={[styles.bloque, { width: 36, height: 26 }]} />
              <View style={[styles.bloque, { width: '70%', height: 12 }]} />
            </View>
          ))}
        </View>
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
        <View style={styles.grilla}>
          {cifras.map((c) => (
            <Cifra key={c.clave} cifra={c} />
          ))}
        </View>
      )}
    </PanelDegradado>
  );
}

function Cifra({ cifra }: { cifra: CifraResumen }) {
  const contenido = (
    <SuperficieVidrio
      variante="tarjeta"
      calidad="desenfoque"
      tinte={{ fondo: panelColors.vidrioFila, borde: panelColors.vidrioFilaBorde }}
      sombra={false}
      style={styles.cifra}
    >
      <View style={styles.cifraArriba}>
        <Text style={styles.valor}>{cifra.valor}</Text>
        {cifra.icono && <Icon name={cifra.icono} size={18} color={panelColors.encabezado} />}
      </View>
      <View style={styles.cifraAbajo}>
        <Text style={styles.etiqueta} numberOfLines={2}>
          {cifra.etiqueta}
        </Text>
        {cifra.onPress && <Icon name="chevron-right" size={16} color={panelColors.secundario} />}
      </View>
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
    <PressableScale onPress={cifra.onPress} escala={motion.pressScale.button} accessibilityRole="button" accessibilityLabel={accesible} style={styles.celda}>
      {contenido}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.md, gap: spacing.gutter, borderRadius: radius.xxl },
  degradado: { borderRadius: radius.xxl },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cabeceraTextos: { flex: 1, gap: 2 },
  overline: { ...typography.overline, letterSpacing: 1.4, color: panelColors.encabezado },
  subtitulo: { ...typography.bodyLg, color: colors.textStrong },
  separador: { height: StyleSheet.hairlineWidth * 2, backgroundColor: panelColors.separador },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  celda: { flexGrow: 1, flexBasis: '45%' },
  cifra: { minHeight: 76, padding: spacing.gutter, borderRadius: radius.xl, justifyContent: 'space-between', gap: 4 },
  cifraEsqueleto: { backgroundColor: panelColors.vidrioFila, flexGrow: 1, flexBasis: '45%' },
  cifraArriba: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cifraAbajo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valor: { ...typography.display, fontSize: 28, lineHeight: 32, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  etiqueta: { ...typography.labelBold, fontSize: 13, lineHeight: 17, color: panelColors.secundario, flex: 1 },
  bloque: { backgroundColor: colors.track, borderRadius: radius.sm },

  error: { flexDirection: 'row', gap: spacing.gutter },
  errorTextos: { flex: 1, gap: spacing.sm },
  errorTexto: { ...typography.bodyMd, color: colors.textStrong },
  errorBoton: { alignSelf: 'flex-start' },
});
