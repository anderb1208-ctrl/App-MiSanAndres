import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Destino } from '../services/tipos';
import { useFavoritos } from '../store/FavoritosContext';
import { colors, radius, spacing, typography } from '../theme';
import { MINUTOS_ANTES_DEL_CIERRE } from '../utils/avisos';
import { Button } from './Button';
import { Icon } from './Icon';

interface Props {
  destino: Pick<Destino, 'id' | 'nombre' | 'horario'> | null;
  onCerrar: () => void;
}

/** Hoja "Alertas" de un favorito: "Avisarme cuando abra" y "Avisarme cuando cierre". */
export function HojaAlertas({ destino, onCerrar }: Props) {
  const insets = useSafeAreaInsets();
  const { avisosDe, actualizarAvisos, avisoPermiso, estadoPush } = useFavoritos();
  const [guardando, setGuardando] = useState<'apertura' | 'cierre' | null>(null);
  const avisos = destino ? avisosDe(destino.id) : null;

  const cambiar = async (campo: 'avisarApertura' | 'avisarCierre', valor: boolean) => {
    if (!destino) return;
    setGuardando(campo === 'avisarApertura' ? 'apertura' : 'cierre');
    try {
      await actualizarAvisos(destino.id, { [campo]: valor });
    } catch (e) {
      Alert.alert('No se pudo guardar', (e as Error).message);
    } finally {
      setGuardando(null);
    }
  };

  const sinHorario = destino && !destino.horario;

  return (
    <Modal visible={Boolean(destino && avisos)} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar alertas" />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
        <View style={styles.asa} />
        <Text style={styles.titulo} accessibilityRole="header">
          Alertas
        </Text>
        <Text style={styles.subtitulo}>{destino?.nombre}</Text>

        <Fila
          icono="lock-open"
          titulo="Avisarme cuando abra"
          detalle={sinHorario ? 'Sin horario: solo te avisaremos si reabre tras un cierre temporal.' : `A la hora de apertura${destino?.horario ? ` (${destino.horario.apertura})` : ''} y si reabre tras un cierre temporal.`}
          valor={avisos?.avisarApertura ?? false}
          cargando={guardando === 'apertura'}
          onCambio={(v) => void cambiar('avisarApertura', v)}
        />
        <Fila
          icono="lock-outline"
          titulo="Avisarme cuando cierre"
          detalle={sinHorario ? 'Sin horario: solo te avisaremos si cierra temporalmente.' : `${MINUTOS_ANTES_DEL_CIERRE} minutos antes del cierre${destino?.horario ? ` (${destino.horario.cierre})` : ''} y si cierra temporalmente.`}
          valor={avisos?.avisarCierre ?? false}
          cargando={guardando === 'cierre'}
          onCambio={(v) => void cambiar('avisarCierre', v)}
        />

        {avisoPermiso ? (
          <View style={styles.aviso}>
            <Icon name="notifications-off" size={18} color={colors.error} />
            <Text style={styles.avisoTexto}>{avisoPermiso}</Text>
          </View>
        ) : estadoPush && estadoPush.estado !== 'registrado' ? (
          <View style={styles.aviso}>
            <Icon name="info-outline" size={18} color={colors.textMuted} />
            <Text style={styles.avisoTexto}>
              Los avisos de horario funcionan en este teléfono. Los de cierre temporal llegan por notificación push, que aquí no está disponible: {estadoPush.mensaje}
            </Text>
          </View>
        ) : null}

        <Button anchoCompleto onPress={onCerrar}>
          Listo
        </Button>
      </View>
    </Modal>
  );
}

function Fila(props: {
  icono: 'lock-open' | 'lock-outline';
  titulo: string;
  detalle: string;
  valor: boolean;
  cargando: boolean;
  onCambio: (v: boolean) => void;
}) {
  return (
    <View style={styles.fila}>
      <Icon name={props.icono} size={22} color={colors.secondary} />
      <View style={styles.textos}>
        <Text style={styles.filaTitulo}>{props.titulo}</Text>
        <Text style={styles.filaDetalle}>{props.detalle}</Text>
      </View>
      <Switch
        value={props.valor}
        onValueChange={props.onCambio}
        disabled={props.cargando}
        trackColor={{ true: colors.secondary, false: colors.track }}
        accessibilityLabel={props.titulo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  hoja: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  titulo: { ...typography.headlineSm, color: colors.textStrong },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted, marginTop: -spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter },
  textos: { flex: 1 },
  filaTitulo: { ...typography.titleMd, color: colors.textStrong },
  filaDetalle: { ...typography.labelMd, color: colors.textMuted },
  aviso: { flexDirection: 'row', gap: spacing.sm, padding: spacing.gutter, borderRadius: radius.lg, backgroundColor: colors.surfaceLow },
  avisoTexto: { ...typography.labelMd, color: colors.textMuted, flex: 1 },
});
