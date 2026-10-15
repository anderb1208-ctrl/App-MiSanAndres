import { StyleSheet, Text, View } from 'react-native';
import type { PrediccionOcupacion } from '../services/tipos';
import { colors, spacing, typography } from '../theme';
import { iconoFactor, MOTIVO_SIN_CLIMA } from '../utils/clima';
import { formatearPorcentaje } from '../utils/ocupacion';
import { Icon } from './Icon';

interface Props {
  prediccion: PrediccionOcupacion | undefined;
  cargando: boolean;
  error: unknown;
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];

function textoBase(p: PrediccionOcupacion): string | null {
  if (!p.base) return null;
  const cuando =
    p.base.origen === 'dia_semana'
      ? `los ${DIAS[p.features.diaSemana - 1] ?? 'días'}`
      : p.base.origen === 'fin_de_semana'
        ? 'los fines de semana'
        : 'entre semana';
  return `Promedio histórico de ${cuando} a esta hora: ${formatearPorcentaje(p.base.porcentaje)}`;
}

/** Explica la predicción: de qué histórico parte y qué factores (clima, festivo, temporada) la ajustan. */
export function FactoresPrediccion({ prediccion, cargando, error }: Props) {
  if (cargando) return <Text style={styles.nota}>Calculando los factores de la predicción…</Text>;
  if (error || !prediccion) return error ? <Text style={styles.nota}>No pudimos cargar los factores de la predicción.</Text> : null;
  if (prediccion.estado === 'Cerrado') return null;

  const base = textoBase(prediccion);
  const conModelo = prediccion.proveedor === 'ml';
  return (
    <View style={styles.contenedor} accessibilityLabel="Factores de la predicción">
      <Text style={styles.titulo}>Por qué esta predicción</Text>
      {base && <Text style={styles.nota}>{base}</Text>}
      {conModelo ? (
        <Text style={styles.nota}>Estimada por el modelo de predicción a partir del día, la hora, el calendario y el clima.</Text>
      ) : prediccion.factores.length === 0 ? (
        <Text style={styles.nota}>Sin ajustes: no se prevé lluvia y no es festivo ni temporada alta.</Text>
      ) : (
        prediccion.factores.map((f) => (
          <View key={f.codigo} style={styles.factor}>
            <Icon name={iconoFactor(f)} size={18} color={colors.secondary} />
            <Icon name={f.efecto > 0 ? 'trending-up' : 'trending-down'} size={18} color={colors.textMuted} />
            <View style={styles.factorTextos}>
              <Text style={styles.factorTexto}>{f.texto}</Text>
              {f.detalle ? <Text style={styles.nota}>{f.detalle}</Text> : null}
            </View>
          </View>
        ))
      )}
      {prediccion.motivoSinClima && (
        <Text style={styles.nota}>Sin clima: {MOTIVO_SIN_CLIMA[prediccion.motivoSinClima]}</Text>
      )}
      {prediccion.mensajeOrigen && (
        <View style={styles.factor} accessibilityRole="text">
          <Icon name="science" size={16} color={colors.textMuted} />
          <Text style={[styles.nota, styles.factorTextos]}>{prediccion.mensajeOrigen}.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 6, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderCard },
  titulo: { ...typography.labelBold, color: colors.textStrong },
  nota: { ...typography.labelMd, color: colors.textMuted },
  factor: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  factorTextos: { flex: 1 },
  factorTexto: { ...typography.bodyMd, color: colors.textStrong },
});
