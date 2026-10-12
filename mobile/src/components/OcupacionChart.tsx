import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { PuntoPrevision, RegistroOcupacion } from '../services/tipos';
import { colors, fonts, occupancyColors, spacing, typography } from '../theme';
import { formatearPorcentaje } from '../utils/ocupacion';

interface Props {
  /** Ocupación típica de cada hora para ese día de la semana ("HH:00"). */
  tipica: PuntoPrevision[];
  /** Registros reales de hoy: segunda serie, encima de la típica. */
  registros?: RegistroOcupacion[];
  /** Hora actual (0–23) que se resalta. */
  horaActual?: number;
  alto?: number;
}

const MARGEN = { izquierda: 30, derecha: 10, arriba: 26, abajo: 22 };
const ETIQUETAS_EJE = [0, 6, 12, 18, 23];
const LIMITES = [
  { valor: 40, color: occupancyColors.Medio.main },
  { valor: 70, color: occupancyColors.Alto.main },
];
const ANCHO_ETIQUETA_AHORA = 96;

const hora = (texto: string) => Number(texto.slice(0, 2));

/**
 * OcupacionChart: ocupación típica de cada hora (área turquesa), registros reales de
 * hoy superpuestos (línea y puntos navy) y la hora actual resaltada con su valor.
 */
export function OcupacionChart({ tipica, registros = [], horaActual, alto = 190 }: Props) {
  const [ancho, setAncho] = useState(0);
  const anchoUtil = Math.max(0, ancho - MARGEN.izquierda - MARGEN.derecha);
  const altoUtil = alto - MARGEN.arriba - MARGEN.abajo;

  const x = (h: number) => MARGEN.izquierda + (h / 23) * anchoUtil;
  const y = (p: number) => MARGEN.arriba + (1 - Math.min(100, Math.max(0, p)) / 100) * altoUtil;
  const base = y(0);

  const puntos = tipica.map((p) => ({ x: x(hora(p.hora)), y: y(p.porcentaje) }));
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const linea = puntos.map((p) => `${p.x},${p.y}`).join(' ');
  const area =
    primero && ultimo
      ? `M${primero.x},${base} ${puntos.map((p) => `L${p.x},${p.y}`).join(' ')} L${ultimo.x},${base} Z`
      : '';

  const reales = registros.map((r) => ({ x: x(hora(r.hora)), y: y(r.porcentaje), clave: r.fechaHora }));

  // Valor resaltado de la hora actual: el real de hoy si existe, si no el típico.
  const realAhora = registros.find((r) => hora(r.hora) === horaActual);
  const tipicaAhora = tipica.find((p) => hora(p.hora) === horaActual);
  const valorAhora = realAhora?.porcentaje ?? tipicaAhora?.porcentaje;
  const cerradoAhora = !realAhora && tipicaAhora?.abierto === false;
  const etiquetaAhora = cerradoAhora ? 'Ahora · Cerrado' : `Ahora · ${formatearPorcentaje(valorAhora ?? 0)}`;

  // Franjas de las horas en que el destino está cerrado.
  const horasCerradas = tipica.filter((p) => !p.abierto).map((p) => hora(p.hora));
  const anchoColumna = anchoUtil / 23;
  const xAhora = horaActual !== undefined ? x(horaActual) : 0;
  const xEtiqueta = Math.min(
    Math.max(xAhora - ANCHO_ETIQUETA_AHORA / 2, MARGEN.izquierda),
    ancho - MARGEN.derecha - ANCHO_ETIQUETA_AHORA,
  );

  const resumen = [
    'Ocupación típica de cada hora del día',
    registros.length > 0 ? `con ${registros.length} registros reales de hoy` : '',
    horasCerradas.length > 0 ? `Cerrado ${horasCerradas.length} horas del día` : '',
    valorAhora !== undefined ? (cerradoAhora ? 'Ahora: cerrado' : `Ahora: ${formatearPorcentaje(valorAhora)}`) : '',
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <View>
      <View
        onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
        style={{ height: alto }}
        accessible
        accessibilityLabel={resumen}
      >
        {ancho > 0 && (
          <Svg width={ancho} height={alto}>
            <Defs>
              <LinearGradient id="relleno" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.secondaryContainer} stopOpacity={0.55} />
                <Stop offset="1" stopColor={colors.secondaryContainer} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>

            {[0, 50, 100].map((v) => (
              <SvgText
                key={v}
                x={MARGEN.izquierda - 6}
                y={y(v) + 4}
                fontSize={10}
                fontFamily={fonts.medium}
                fill={colors.textSubtle}
                textAnchor="end"
              >
                {`${v}%`}
              </SvgText>
            ))}
            <Line x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={base} y2={base} stroke={colors.borderCard} />
            {LIMITES.map((l) => (
              <Line
                key={l.valor}
                x1={MARGEN.izquierda}
                x2={ancho - MARGEN.derecha}
                y1={y(l.valor)}
                y2={y(l.valor)}
                stroke={l.color}
                strokeOpacity={0.45}
                strokeDasharray="4 4"
              />
            ))}

            {horasCerradas.map((h) => {
              const x0 = Math.max(MARGEN.izquierda, x(h) - anchoColumna / 2);
              const x1 = Math.min(ancho - MARGEN.derecha, x(h) + anchoColumna / 2);
              return (
                <Rect key={`cerrado-${h}`} x={x0} y={MARGEN.arriba} width={x1 - x0} height={altoUtil} fill={colors.track} />
              );
            })}

            {/* Franja de la hora actual, detrás de las series. */}
            {horaActual !== undefined && (
              <Rect
                x={xAhora - anchoUtil / 46}
                y={MARGEN.arriba}
                width={anchoUtil / 23}
                height={altoUtil}
                fill={colors.primary}
                fillOpacity={0.07}
              />
            )}

            {area ? <Path d={area} fill="url(#relleno)" /> : null}
            <Polyline
              points={linea}
              fill="none"
              stroke={colors.secondary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {reales.length > 1 && (
              <Polyline
                points={reales.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            )}
            {reales.map((p) => (
              <Circle key={p.clave} cx={p.x} cy={p.y} r={3} fill={colors.primary} stroke={colors.white} strokeWidth={1.5} />
            ))}

            {horaActual !== undefined && valorAhora !== undefined && (
              <>
                <Line
                  x1={xAhora}
                  x2={xAhora}
                  y1={MARGEN.arriba - 4}
                  y2={base}
                  stroke={colors.primary}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <Circle
                  cx={xAhora}
                  cy={y(valorAhora)}
                  r={6}
                  fill={realAhora ? colors.primary : colors.secondary}
                  stroke={colors.white}
                  strokeWidth={2.5}
                />
                <Rect x={xEtiqueta} y={0} width={ANCHO_ETIQUETA_AHORA} height={20} rx={10} fill={colors.primary} />
                <SvgText
                  x={xEtiqueta + ANCHO_ETIQUETA_AHORA / 2}
                  y={14}
                  fontSize={11}
                  fontFamily={fonts.bold}
                  fill={colors.white}
                  textAnchor="middle"
                >
                  {etiquetaAhora}
                </SvgText>
              </>
            )}

            {ETIQUETAS_EJE.map((h) => (
              <SvgText
                key={h}
                x={x(h)}
                y={alto - 6}
                fontSize={10}
                fontFamily={h === horaActual ? fonts.bold : fonts.medium}
                fill={h === horaActual ? colors.primary : colors.textSubtle}
                textAnchor="middle"
              >
                {`${String(h).padStart(2, '0')}h`}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.leyenda}>
        <Leyenda color={colors.secondary} texto="Ocupación típica" linea />
        {registros.length > 0 && <Leyenda color={colors.primary} texto="Real de hoy" linea />}
        {horasCerradas.length > 0 && <Leyenda color={colors.track} texto="Cerrado" />}
      </View>
    </View>
  );
}

function Leyenda({ color, texto, linea = false }: { color: string; texto: string; linea?: boolean }) {
  return (
    <View style={styles.item}>
      <View style={[linea ? styles.marcaLinea : styles.marcaPunto, { backgroundColor: color }]} />
      <Text style={styles.leyendaTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  leyenda: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  marcaLinea: { width: 14, height: 3, borderRadius: 2 },
  marcaPunto: { width: 8, height: 8, borderRadius: 4 },
  leyendaTexto: { ...typography.labelMd, color: colors.textMuted },
});
