import { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ControlSegmentado } from '../components/ControlSegmentado';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { OcupacionCompacta } from '../components/OcupacionCompacta';
import { PantallaApilada } from '../components/PantallaApilada';
import { SectionHeader } from '../components/ScreenHeader';
import { SelectRow } from '../components/SelectRow';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { ChipEstado } from '../components/ChipEstado';
import { useAsync } from '../hooks/useAsync';
import type { AppScreenProps } from '../navigation/types';
import { compararModelosMl, listarDestinosAdmin, obtenerModelosMl } from '../services/admin';
import { mensajeDeError } from '../services/api';
import type { ComparacionPrediccion, Destino, ModeloMl } from '../services/tipos';
import { colors, radius, spacing, ticketColors, typography } from '../theme';

const CHIP_EN_USO = <ChipEstado etiqueta="En uso" icono="verified" tono={ticketColors.estado.resuelto} tamano="sm" />;
import { hoyEnColombia } from '../utils/fecha';

const HORAS = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`); // 06:00 a 22:00
const DIAS = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'manana', etiqueta: 'Mañana' },
] as const;

const num = (v: number | null | undefined, decimales = 2) =>
  v === null || v === undefined ? '—' : v.toLocaleString('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

function sumarDia(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

type FilaTabla = Pick<ModeloMl, 'clave' | 'nombre' | 'mae' | 'rmse' | 'r2'> & Partial<Pick<ModeloMl, 'tamanoMb' | 'ganador' | 'activo' | 'disponible'>>;

/** Una fila de la tabla: nombre e insignias arriba y las cuatro métricas en columnas (cabe en pantallas angostas). */
function Fila({ m, respaldo, ultima }: { m: FilaTabla; respaldo: boolean; ultima: boolean }) {
  const esBaseline = m.clave === 'baseline';
  const tamano = esBaseline ? '—' : m.tamanoMb === null || m.tamanoMb === undefined ? '—' : `${num(m.tamanoMb, m.tamanoMb < 1 ? 2 : 1)} MB`;
  return (
    <View
      style={[styles.fila, m.ganador && styles.filaGanador, !ultima && styles.filaDivisor]}
      accessible
      accessibilityLabel={`${m.nombre}${m.ganador ? ', en uso' : ''}${respaldo && m.activo ? ', responde como respaldo' : ''}. MAE ${num(m.mae)}, RMSE ${num(m.rmse)}, R² ${num(m.r2, 3)}, tamaño ${tamano}`}
    >
      <View style={styles.filaCabecera}>
        <Text style={[styles.filaNombre, esBaseline && styles.filaNombreBaseline]} numberOfLines={2}>
          {m.nombre}
        </Text>
        {m.ganador && CHIP_EN_USO}
        {respaldo && m.activo && <ChipEstado etiqueta="Respaldo activo" icono="swap-horiz" tono={ticketColors.estado.en_revision} tamano="sm" />}
        {!esBaseline && m.disponible === false && <ChipEstado etiqueta="Sin archivo" icono="error-outline" tono={ticketColors.estado.cerrado} tamano="sm" />}
      </View>
      <View style={styles.metricas}>
        {[
          ['MAE', num(m.mae)],
          ['RMSE', num(m.rmse)],
          ['R²', num(m.r2, 3)],
          ['Tamaño', tamano],
        ].map(([etiqueta, valor]) => (
          <View key={etiqueta} style={styles.metrica}>
            <Text style={styles.metricaEtiqueta}>{etiqueta}</Text>
            <Text style={[styles.metricaValor, m.ganador && styles.metricaGanador]}>{valor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Panel del administrador: comparativa de los tres modelos de ML y el baseline, y una predicción comparada. */
export function ModelosMlScreen(_props: AppScreenProps<'ModelosMl'>) {
  const insets = useSafeAreaInsets();
  const modelos = useAsync(obtenerModelosMl, []);
  const destinos = useAsync(listarDestinosAdmin, []);

  const [destino, setDestino] = useState<Destino | null>(null);
  const [dia, setDia] = useState<(typeof DIAS)[number]['valor']>('hoy');
  const [hora, setHora] = useState('12:00');
  const [eligiendo, setEligiendo] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [comparacion, setComparacion] = useState<ComparacionPrediccion | null>(null);
  const [errorComparar, setErrorComparar] = useState<string | null>(null);

  const comparar = async () => {
    if (!destino) return;
    setComparando(true);
    setErrorComparar(null);
    try {
      const hoy = hoyEnColombia();
      setComparacion(await compararModelosMl(destino.id, dia === 'hoy' ? hoy : sumarDia(hoy), hora));
    } catch (e) {
      setComparacion(null);
      setErrorComparar(mensajeDeError(e));
    } finally {
      setComparando(false);
    }
  };

  const d = modelos.datos;
  const filas: FilaTabla[] = d ? [...d.modelos, ...(d.baseline ? [d.baseline] : [])] : [];
  const activos = (destinos.datos ?? []).filter((x) => x.estado !== 'inactivo');

  return (
    <PantallaApilada
      titulo="Modelos de ML"
      subtitulo="Los tres modelos entrenados y el que está en uso"
      conVolver
      refrescando={modelos.refrescando}
      onRefrescar={modelos.recargar}
    >
      {modelos.cargando ? (
        <EstadoCargando mensaje="Consultando el servicio de ML…" />
      ) : !d ? (
        <EstadoError error={modelos.error} onReintentar={modelos.recargar} />
      ) : (
        <>
          {d.datosSimulados && (
            <View style={styles.nota} accessibilityRole="text">
              <Icon name="science" size={18} color={colors.secondary} />
              <Text style={styles.notaTexto}>
                <Text style={styles.notaTitulo}>Datos simulados. </Text>
                Los modelos se entrenaron con datos simulados calibrados con datos reales: las métricas comparan los modelos
                entre sí, no miden la precisión con afluencia real.
              </Text>
            </View>
          )}
          {d.respaldo && (
            <View style={[styles.nota, styles.notaAlerta]} accessibilityRole="alert">
              <Icon name="warning-amber" size={18} color={colors.error} />
              <Text style={styles.notaTexto}>
                El ganador no se pudo cargar: las predicciones las está dando el siguiente mejor modelo.
              </Text>
            </View>
          )}

          <GlassPanel tono="strong" padding={0} radius={20} style={styles.tabla}>
            {filas.map((m, i) => (
              <Fila key={m.clave} m={m} respaldo={d.respaldo} ultima={i === filas.length - 1} />
            ))}
          </GlassPanel>
          <Text style={styles.pie}>
            MAE y RMSE en puntos de ocupación (0–100), en los últimos 3 meses del dataset. Menor es mejor; R² más cerca de 1 es mejor.
          </Text>
          {d.motivo && (
            <Text style={styles.motivo}>
              <Text style={styles.motivoTitulo}>Por qué está en uso: </Text>
              {d.motivo}
            </Text>
          )}

          <SectionHeader titulo="Comparar una predicción" subtitulo="Los tres modelos y el baseline para el mismo destino y hora" />
          <GlassPanel tono="strong" padding={0} radius={20} style={styles.tabla}>
            <SelectRow
              icono="place"
              etiqueta={destino ? destino.nombre : 'Elegir destino'}
              descripcion={destino ? 'Toca para cambiarlo' : destinos.cargando ? 'Cargando destinos…' : 'Ningún destino elegido'}
              control="chevron"
              divisor={false}
              onPress={() => setEligiendo(true)}
            />
          </GlassPanel>
          <ControlSegmentado opciones={DIAS} valor={dia} onCambiar={setDia} etiquetaAccesible="Día" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horas}>
            {HORAS.map((h) => (
              <FilterChip key={h} compacto activo={h === hora} onPress={() => setHora(h)}>
                {h}
              </FilterChip>
            ))}
          </ScrollView>
          <Button icono="compare-arrows" anchoCompleto deshabilitado={!destino} cargando={comparando} onPress={() => void comparar()}>
            Comparar una predicción
          </Button>

          {errorComparar && (
            <View style={[styles.nota, styles.notaAlerta]} accessibilityRole="alert">
              <Icon name="cloud-off" size={18} color={colors.error} />
              <Text style={styles.notaTexto}>{errorComparar}</Text>
            </View>
          )}

          {comparacion && (
            <GlassPanel tono="strong" radius={20} style={styles.resultados}>
              <Text style={styles.resultadosTitulo} accessibilityRole="header">
                {comparacion.nombre} · {comparacion.fecha} · {comparacion.hora}
              </Text>
              <Text style={styles.pie}>
                {comparacion.estado === 'Cerrado'
                  ? 'Cerrado a esa hora: ningún modelo predice afluencia.'
                  : comparacion.conClima
                    ? 'Con el clima previsto para esa hora.'
                    : 'Sin pronóstico para esa hora: los modelos usan el clima típico del mes.'}
              </Text>
              {comparacion.resultados.map((r) => (
                <View
                  key={r.clave}
                  style={[styles.resultado, r.ganador && styles.filaGanador]}
                  accessible
                  accessibilityLabel={`${r.nombre}${r.ganador ? ', en uso' : ''}: ${
                    r.disponible ? `${num(r.porcentaje, 1)} por ciento, ocupación ${r.nivel ?? 'sin nivel'}` : `no disponible. ${r.error ?? ''}`
                  }`}
                >
                  <View style={styles.resultadoTextos}>
                    <View style={styles.filaCabecera}>
                      <Text style={styles.filaNombre} numberOfLines={2}>
                        {r.nombre}
                      </Text>
                      {r.ganador && CHIP_EN_USO}
                    </View>
                    {!r.disponible && <Text style={styles.error}>{r.error ?? 'No disponible.'}</Text>}
                    {r.disponible && r.personasEstimadas !== null && comparacion.estado === 'Abierto' && (
                      <Text style={styles.pie}>≈ {r.personasEstimadas} personas</Text>
                    )}
                  </View>
                  {r.disponible && (
                    <OcupacionCompacta
                      variante="chip"
                      ocupacion={{ estado: comparacion.estado, porcentaje: r.porcentaje ?? 0, nivel: r.nivel }}
                    />
                  )}
                </View>
              ))}
            </GlassPanel>
          )}
        </>
      )}

      <Modal visible={eligiendo} transparent animationType="slide" onRequestClose={() => setEligiendo(false)}>
        <Pressable style={styles.fondoModal} onPress={() => setEligiendo(false)} accessibilityLabel="Cerrar la lista de destinos" />
        <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.asa} />
          <Text style={styles.hojaTitulo} accessibilityRole="header">
            Elegir destino
          </Text>
          {destinos.cargando ? (
            <EstadoCargando mensaje="Cargando destinos…" />
          ) : !destinos.datos ? (
            <EstadoError error={destinos.error} onReintentar={destinos.recargar} />
          ) : (
            <FlatList
              data={activos}
              keyExtractor={(x) => String(x.id)}
              renderItem={({ item }) => (
                <SelectRow
                  etiqueta={item.nombre}
                  descripcion={item.ubicacion}
                  control="radio"
                  marcado={destino?.id === item.id}
                  onPress={() => {
                    setDestino(item);
                    setComparacion(null);
                    setEligiendo(false);
                  }}
                />
              )}
            />
          )}
        </View>
      </Modal>
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  nota: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.gutter,
    borderRadius: radius.lg,
    backgroundColor: colors.turquoiseTint,
  },
  notaAlerta: { backgroundColor: colors.errorContainer },
  notaTexto: { ...typography.bodyMd, color: colors.textStrong, flex: 1 },
  notaTitulo: { fontFamily: typography.labelBold.fontFamily },
  tabla: { overflow: 'hidden' },
  fila: { paddingHorizontal: spacing.md, paddingVertical: spacing.gutter, gap: spacing.sm },
  filaGanador: { backgroundColor: colors.secondarySoft },
  filaDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  filaCabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  filaNombre: { ...typography.titleMd, fontSize: 16, color: colors.textStrong, flexShrink: 1 },
  filaNombreBaseline: { color: colors.textMuted },
  metricas: { flexDirection: 'row' },
  metrica: { flex: 1, minWidth: 0 },
  metricaEtiqueta: { ...typography.labelMd, color: colors.textMuted },
  metricaValor: { ...typography.bodyLg, fontFamily: typography.titleMd.fontFamily, color: colors.textStrong },
  metricaGanador: { color: colors.textStrong },
  pie: { ...typography.labelMd, color: colors.textMuted },
  motivo: { ...typography.bodyMd, color: colors.textBody },
  motivoTitulo: { fontFamily: typography.labelBold.fontFamily, color: colors.textStrong },
  horas: { gap: spacing.sm, paddingVertical: spacing.xs },
  resultados: { gap: spacing.sm },
  resultadosTitulo: { ...typography.titleMd, color: colors.textStrong },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.gutter,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  resultadoTextos: { flex: 1, gap: 2 },
  error: { ...typography.bodyMd, color: colors.error },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,20,48,0.4)' },
  hoja: {
    maxHeight: '75%',
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  asa: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.gutter },
  hojaTitulo: { ...typography.headlineSm, color: colors.textStrong, marginBottom: spacing.sm },
});
