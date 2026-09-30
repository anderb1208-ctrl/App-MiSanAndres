import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop, Text as SvgText } from 'react-native-svg';
import type { PuntoPrevision, RegistroOcupacion } from '../services/tipos';
import { colors, fonts, occupancyColors, spacing, typography } from '../theme';

interface Props {
  /** Curva prevista (una entrada por hora "HH:00"). */
  prevision: PuntoPrevision[];
  /** Registros reales de hoy, que se superponen a la curva. */
  registros?: RegistroOcupacion[];
  /** Hora actual (0–23) para marcarla; se omite si el día mostrado no es hoy. */
  horaActual?: number;
  alto?: number;
}

const MARGEN = { izquierda: 30, derecha: 8, arriba: 10, abajo: 22 };
const ETIQUETAS_EJE = [0, 6, 12, 18, 23];
const LIMITES = [
  { valor: 40, color: occupancyColors.Medio.main },
  { valor: 70, color: occupancyColors.Alto.main },
];

const hora = (texto: string) => Number(texto.slice(0, 2));

/**
 * OcupacionChart: curva prevista de ocupación durante el día (área turquesa)
 * con los registros reales de hoy superpuestos (puntos navy) y la hora actual marcada.
 */
export function OcupacionChart({ prevision, registros = [], horaActual, alto = 170 }: Props) {
  const [ancho, setAncho] = useState(0);
  const anchoUtil = Math.max(0, ancho - MARGEN.izquierda - MARGEN.derecha);
  const altoUtil = alto - MARGEN.arriba - MARGEN.abajo;

  const x = (h: number) => MARGEN.izquierda + (h / 23) * anchoUtil;
  const y = (p: number) => MARGEN.arriba + (1 - Math.min(100, Math.max(0, p)) / 100) * altoUtil;
  const base = y(0);

  const puntos = prevision.map((p) => ({ x: x(hora(p.hora)), y: y(p.porcentaje) }));
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const linea = puntos.map((p) => `${p.x},${p.y}`).join(' ');
  const area =
    primero && ultimo
      ? `M${primero.x},${base} ${puntos.map((p) => `L${p.x},${p.y}`).join(' ')} L${ultimo.x},${base} Z`
      : '';

  const reales = registros.map((r) => ({ x: x(hora(r.hora)), y: y(r.porcentaje), clave: r.fechaHora }));

  const resumen = `Curva prevista de ocupación durante el día${
    registros.length > 0 ? ` con ${registros.length} registros reales de hoy` : ''
  }.`;

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

            {horaActual !== undefined && (
              <Line
                x1={x(horaActual)}
                x2={x(horaActual)}
                y1={MARGEN.arriba}
                y2={base}
                stroke={colors.primary}
                strokeOpacity={0.35}
                strokeWidth={1.5}
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
                strokeWidth={1.5}
                strokeOpacity={0.6}
              />
            )}
            {reales.map((p) => (
              <Circle key={p.clave} cx={p.x} cy={p.y} r={3.5} fill={colors.primary} stroke={colors.white} strokeWidth={1.5} />
            ))}

            {ETIQUETAS_EJE.map((h) => (
              <SvgText
                key={h}
                x={x(h)}
                y={alto - 6}
                fontSize={10}
                fontFamily={fonts.medium}
                fill={colors.textSubtle}
                textAnchor="middle"
              >
                {`${String(h).padStart(2, '0')}h`}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.leyenda}>
        <Leyenda color={colors.secondary} texto="Prevista" linea />
        {registros.length > 0 && <Leyenda color={colors.primary} texto="Registrada hoy" />}
        {horaActual !== undefined && <Leyenda color="rgba(0,20,48,0.35)" texto="Ahora" linea />}
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
