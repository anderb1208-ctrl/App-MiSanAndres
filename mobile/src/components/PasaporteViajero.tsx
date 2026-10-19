import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Insignia, Pasaporte } from '../services/tipos';
import { colors, motion, radius, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { textoProgresoInsignia } from '../utils/pasaporte';
import { GlassPanel } from './GlassPanel';
import { Icon } from './Icon';

const AnilloAnimado = Animated.createAnimatedComponent(Circle);
const TAMANO = 112;
const GROSOR = 10;
const RADIO = (TAMANO - GROSOR) / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

interface Props {
  pasaporte: Pasaporte;
  /** Abre Explorar con lo que falta para una insignia bloqueada. */
  onExplorarPendientes: (insignia: Insignia) => void;
}

/** Anillo de progreso que se llena al aparecer (sin animación si el sistema pide reducir el movimiento). */
function AnilloProgreso({ fraccion, explorados, total }: { fraccion: number; explorados: number; total: number }) {
  const progreso = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let activo = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (!activo) return;
      if (reducir) progreso.setValue(fraccion);
      else
        Animated.timing(progreso, {
          toValue: fraccion,
          duration: motion.duration.slow * 2,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
    });
    return () => {
      activo = false;
    };
  }, [fraccion, progreso]);

  const desplazamiento = progreso.interpolate({ inputRange: [0, 1], outputRange: [CIRCUNFERENCIA, 0] });
  return (
    <View
      style={styles.anillo}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${explorados} de ${total} destinos explorados`}
      accessibilityValue={{ min: 0, max: total, now: explorados }}
    >
      <Svg width={TAMANO} height={TAMANO}>
        <Circle cx={TAMANO / 2} cy={TAMANO / 2} r={RADIO} stroke={colors.track} strokeWidth={GROSOR} fill="none" />
        <AnilloAnimado
          cx={TAMANO / 2}
          cy={TAMANO / 2}
          r={RADIO}
          stroke={colors.secondary}
          strokeWidth={GROSOR}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
          strokeDashoffset={desplazamiento}
          transform={`rotate(-90 ${TAMANO / 2} ${TAMANO / 2})`}
        />
      </Svg>
      <View style={styles.anilloCentro} pointerEvents="none">
        <Text style={styles.anilloValor}>
          {explorados}
          <Text style={styles.anilloTotal}>/{total}</Text>
        </Text>
        <Text style={styles.anilloEtiqueta}>explorados</Text>
      </View>
    </View>
  );
}

function TarjetaInsignia({ insignia, onPress }: { insignia: Insignia; onPress: () => void }) {
  const { desbloqueada } = insignia;
  const fraccion = insignia.meta ? insignia.progreso / insignia.meta : 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${insignia.nombre}. ${insignia.descripcion}. ${textoProgresoInsignia(insignia)}`}
      accessibilityHint={desbloqueada ? undefined : 'Abre Explorar con lo que te falta'}
      style={({ pressed }) => [styles.insignia, !desbloqueada && styles.insigniaBloqueada, pressed && styles.presionada]}
    >
      <View style={[styles.insigniaIcono, desbloqueada ? styles.iconoActivo : styles.iconoBloqueado]}>
        <Icon name={insignia.icono as NombreIcono} size={22} color={desbloqueada ? colors.secondary : colors.textSubtle} />
        {!desbloqueada && (
          <View style={styles.candado}>
            <Icon name="lock" size={11} color={colors.white} />
          </View>
        )}
      </View>
      <Text style={[styles.insigniaNombre, !desbloqueada && styles.textoBloqueado]} numberOfLines={2}>
        {insignia.nombre}
      </Text>
      <View style={styles.barra}>
        <View style={[styles.barraRelleno, { width: `${Math.round(fraccion * 100)}%` }]} />
      </View>
      <Text style={styles.insigniaProgreso} numberOfLines={1}>
        {textoProgresoInsignia(insignia)}
      </Text>
    </Pressable>
  );
}

/** Relleno interactivo del Perfil: destinos explorados, resumen e insignias. */
export function PasaporteViajero({ pasaporte, onExplorarPendientes }: Props) {
  const [verTodas, setVerTodas] = useState(false);
  const desbloqueadas = pasaporte.insignias.filter((i) => i.desbloqueada).length;
  // Primero las que están más cerca de desbloquearse; las ya ganadas al final.
  const ordenadas = [...pasaporte.insignias].sort(
    (a, b) => Number(a.desbloqueada) - Number(b.desbloqueada) || b.progreso / b.meta - a.progreso / a.meta,
  );
  const visibles = verTodas ? ordenadas : ordenadas.slice(0, 6);

  const tocar = (i: Insignia) => {
    if (i.desbloqueada) Alert.alert(`¡${i.nombre}!`, `${i.descripcion}: insignia desbloqueada.`);
    else onExplorarPendientes(i);
  };

  return (
    <GlassPanel tono="strong" radius={20}>
      <View style={styles.cabecera}>
        <AnilloProgreso fraccion={pasaporte.total ? pasaporte.explorados / pasaporte.total : 0} explorados={pasaporte.explorados} total={pasaporte.total} />
        <View style={styles.flex}>
          <Text style={styles.titulo} accessibilityRole="header">
            Pasaporte del viajero
          </Text>
          <Text style={styles.subtitulo}>
            {pasaporte.explorados === 0
              ? 'Abre un destino para sellar tu primera página.'
              : pasaporte.explorados >= pasaporte.total
                ? '¡Exploraste toda la isla en la app!'
                : `Has explorado el ${pasaporte.porcentaje} % de la isla en la app.`}
          </Text>
          <Text style={styles.ganadas}>
            {desbloqueadas} de {pasaporte.insignias.length} insignias
          </Text>
        </View>
      </View>

      <View style={styles.resumen}>
        {(
          [
            ['explore', String(pasaporte.explorados), 'Explorados'],
            ['favorite', String(pasaporte.favoritos), 'Favoritos'],
            ['event-available', String(pasaporte.diasActivos), pasaporte.diasActivos === 1 ? 'Día activo' : 'Días activos'],
          ] as const
        ).map(([icono, valor, etiqueta]) => (
          <View key={etiqueta} style={styles.dato} accessible accessibilityLabel={`${valor} ${etiqueta.toLowerCase()}`}>
            <Icon name={icono} size={18} color={colors.secondary} />
            <Text style={styles.datoValor}>{valor}</Text>
            <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
          </View>
        ))}
      </View>

      <View style={styles.insignias}>
        {visibles.map((i) => (
          <TarjetaInsignia key={i.codigo} insignia={i} onPress={() => tocar(i)} />
        ))}
      </View>
      {ordenadas.length > 6 && (
        <Pressable onPress={() => setVerTodas(!verTodas)} accessibilityRole="button" style={styles.verTodas} hitSlop={8}>
          <Text style={styles.verTodasTexto}>{verTodas ? 'Ver menos' : `Ver las ${ordenadas.length} insignias`}</Text>
        </Pressable>
      )}
      <Text style={styles.nota}>"Explorado" = lo abriste o guardaste en la app; no hace falta haber ido.</Text>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  anillo: { width: TAMANO, height: TAMANO },
  anilloCentro: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  anilloValor: { ...typography.headlineSm, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  anilloTotal: { ...typography.bodyMd, color: colors.textSubtle },
  anilloEtiqueta: { ...typography.labelMd, color: colors.textSubtle },
  titulo: { ...typography.titleMd, color: colors.textStrong },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted, marginTop: 2 },
  ganadas: { ...typography.labelBold, color: colors.secondary, marginTop: spacing.sm },
  resumen: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderCard,
  },
  dato: { flex: 1, alignItems: 'center', gap: 2 },
  datoValor: { ...typography.titleMd, color: colors.textStrong },
  datoEtiqueta: { ...typography.labelMd, color: colors.textSubtle, textAlign: 'center' },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  insignia: {
    // Tres por fila; en pantallas angostas el texto baja a dos líneas sin cortarse.
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 44,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderCard,
    alignItems: 'center',
    gap: 6,
  },
  insigniaBloqueada: { backgroundColor: colors.surfaceLow },
  presionada: { opacity: 0.7 },
  insigniaIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconoActivo: { backgroundColor: colors.secondarySoft },
  iconoBloqueado: { backgroundColor: colors.track },
  candado: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceLow,
  },
  insigniaNombre: { ...typography.labelBold, color: colors.textStrong, textAlign: 'center' },
  textoBloqueado: { color: colors.textMuted },
  barra: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: colors.track, overflow: 'hidden' },
  barraRelleno: { height: 4, borderRadius: 2, backgroundColor: colors.secondary },
  insigniaProgreso: { ...typography.labelMd, fontSize: 11, color: colors.textSubtle },
  verTodas: { alignSelf: 'center', marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' },
  verTodasTexto: { ...typography.labelBold, color: colors.textLink },
  nota: { ...typography.labelMd, fontSize: 11, color: colors.textSubtle, marginTop: spacing.sm, textAlign: 'center' },
});
