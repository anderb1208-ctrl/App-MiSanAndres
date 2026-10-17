import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Destino } from '../services/tipos';
import { colors, radius, spacing, typography } from '../theme';
import { Button } from './Button';
import { FilterChip } from './FilterChip';
import { Overline } from './ScreenHeader';
import { TextField } from './TextField';

type Duracion = 'sin_fecha' | '2h' | 'manana' | '3d';

const DURACIONES: { valor: Duracion; etiqueta: string }[] = [
  { valor: 'sin_fecha', etiqueta: 'Hasta reabrir a mano' },
  { valor: '2h', etiqueta: '2 horas' },
  { valor: 'manana', etiqueta: 'Hasta mañana 8:00' },
  { valor: '3d', etiqueta: '3 días' },
];

/** Fin del cierre (ISO con zona) para la duración elegida; Colombia es UTC-5 sin horario de verano. */
export function hastaDe(duracion: Duracion, ahora = new Date()): string | undefined {
  if (duracion === 'sin_fecha') return undefined;
  if (duracion === '2h') return new Date(ahora.getTime() + 2 * 3600_000).toISOString();
  if (duracion === '3d') return new Date(ahora.getTime() + 3 * 86_400_000).toISOString();
  const colombia = new Date(ahora.getTime() - 5 * 3600_000);
  const manana = new Date(Date.UTC(colombia.getUTCFullYear(), colombia.getUTCMonth(), colombia.getUTCDate() + 1, 13, 0));
  return manana.toISOString(); // 8:00 en Colombia = 13:00 UTC
}

interface Props {
  destino: Destino | null;
  onCerrar: () => void;
  onConfirmar: (motivo: string, hasta: string | undefined) => Promise<void>;
}

/** Hoja del administrador para cerrar temporalmente un destino con su motivo (dispara el push). */
export function HojaCierreTemporal({ destino, onCerrar, onConfirmar }: Props) {
  const insets = useSafeAreaInsets();
  const [motivo, setMotivo] = useState('');
  const [duracion, setDuracion] = useState<Duracion>('sin_fecha');
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (motivo.trim().length < 3) {
      setError('Escribe el motivo (se mostrará en el aviso y en el detalle).');
      return;
    }
    setEnviando(true);
    try {
      await onConfirmar(motivo.trim(), hastaDe(duracion));
      setMotivo('');
      setDuracion('sin_fecha');
      setError(undefined);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={Boolean(destino)} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cancelar" />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
        <Text style={styles.titulo} accessibilityRole="header">
          Cerrar temporalmente
        </Text>
        <Text style={styles.subtitulo}>
          {destino?.nombre}. Se avisará por notificación a quienes lo tienen en favoritos con "Avisarme cuando cierre".
        </Text>
        <TextField
          etiqueta="Motivo"
          value={motivo}
          onChangeText={(v) => {
            setMotivo(v);
            setError(undefined);
          }}
          error={error}
          maxLength={200}
          placeholder="Ej.: mar de leva, mantenimiento del muelle"
        />
        <Overline>DURACIÓN</Overline>
        <View style={styles.chips}>
          {DURACIONES.map((d) => (
            <FilterChip key={d.valor} compacto activo={duracion === d.valor} onPress={() => setDuracion(d.valor)}>
              {d.etiqueta}
            </FilterChip>
          ))}
        </View>
        <View style={styles.acciones}>
          <Button variante="glass" style={styles.flex} onPress={onCerrar} deshabilitado={enviando}>
            Cancelar
          </Button>
          <Button variante="danger" style={styles.flex} icono="block" cargando={enviando} onPress={() => void confirmar()}>
            Cerrar y avisar
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  hoja: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  titulo: { ...typography.headlineSm, color: colors.textStrong },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  acciones: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
