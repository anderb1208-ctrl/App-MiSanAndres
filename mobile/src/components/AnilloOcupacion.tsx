import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useReducirMovimiento } from '../hooks/useReducirMovimiento';
import { colors, occupancyColors, panelColors, typography } from '../theme';
import { calcularAnillo, etiquetaAnillo, trazoSegmento } from '../utils/anillo';
import type { DistribucionOcupacion, GrupoOcupacion } from '../utils/resumenOcupacion';

interface Props {
  distribucion: DistribucionOcupacion;
  onElegir: (grupo: GrupoOcupacion) => void;
  tamano?: number;
  grosor?: number;
}

/** Área táctil de cada segmento: trazo invisible más ancho que el visible (≥ 44 px de alto). */
const GROSOR_TACTIL = 34;

/**
 * Anillo de los destinos abiertos por nivel (Baja, Media, Alta) sobre la pista de los cerrados,
 * con el número de abiertos al centro. Pista con contorno (≥ 3:1 sobre el panel) para que la
 * parte de cerrados se distinga. Cada segmento abre Explorar con su nivel. Para el lector de
 * pantalla es una imagen con la descripción hablada; la leyenda tiene los botones.
 */
export function AnilloOcupacion({ distribucion, onElegir, tamano = 112, grosor = 14 }: Props) {
  const anillo = calcularAnillo(distribucion);
  const radio = (tamano - grosor) / 2 - 1;
  const circunferencia = 2 * Math.PI * radio;
  const centro = tamano / 2;

  const reducirMovimiento = useReducirMovimiento();
  const aparicion = useRef(new Animated.Value(reducirMovimiento ? 1 : 0)).current;
  useEffect(() => {
    if (reducirMovimiento) {
      aparicion.setValue(1);
      return;
    }
    aparicion.setValue(0);
    Animated.timing(aparicion, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // Solo cuando cambian las cifras.
  }, [anillo.total, anillo.abiertos, distribucion.conteo.Bajo, distribucion.conteo.Medio, reducirMovimiento, aparicion]);

  const giro = aparicion.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] });

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Destinos ${etiquetaAnillo(distribucion)}`}
      style={{ width: tamano, height: tamano }}
    >
      {/* Opacidad y giro en el anillo (hijo del panel), nunca en la superficie de vidrio. */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: aparicion, transform: [{ rotate: giro }] }]}>
        <Svg width={tamano} height={tamano}>
          <G rotation={-90} origin={`${centro}, ${centro}`}>
            <Circle cx={centro} cy={centro} r={radio} stroke={panelColors.pista} strokeWidth={grosor} fill="none" />
            <Circle cx={centro} cy={centro} r={radio + grosor / 2} stroke={panelColors.contorno} strokeWidth={1} fill="none" />
            <Circle cx={centro} cy={centro} r={radio - grosor / 2} stroke={panelColors.contorno} strokeWidth={1} fill="none" />
            {anillo.segmentos.map((s) => {
              const t = trazoSegmento(s, circunferencia, grosor);
              const tactil = trazoSegmento(s, circunferencia, 0, false);
              return (
                <G key={s.grupo}>
                  <Circle
                    cx={centro}
                    cy={centro}
                    r={radio}
                    stroke={occupancyColors[s.grupo].main}
                    strokeWidth={grosor}
                    strokeLinecap="round"
                    strokeDasharray={t.dasharray}
                    strokeDashoffset={t.dashoffset}
                    fill="none"
                  />
                  <Circle
                    cx={centro}
                    cy={centro}
                    r={radio}
                    stroke="transparent"
                    strokeWidth={GROSOR_TACTIL}
                    strokeDasharray={tactil.dasharray}
                    strokeDashoffset={tactil.dashoffset}
                    fill="none"
                    onPress={() => onElegir(s.grupo)}
                  />
                </G>
              );
            })}
          </G>
        </Svg>
      </Animated.View>
      <View pointerEvents="none" style={styles.centro}>
        <Text style={styles.cifra}>{anillo.abiertos}</Text>
        <Text style={styles.etiqueta}>{anillo.abiertos === 1 ? 'abierto' : 'abiertos'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  cifra: { ...typography.display, fontSize: 30, lineHeight: 34, color: colors.textStrong },
  etiqueta: { ...typography.labelBold, color: panelColors.secundario },
});
