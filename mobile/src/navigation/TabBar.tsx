import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { blur, colors, radius, shadows, sizes, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import type { TabsParamList } from './types';

const TABS: Record<keyof TabsParamList, { etiqueta: string; icono: NombreIcono }> = {
  Inicio: { etiqueta: 'Inicio', icono: 'home' },
  Explorar: { etiqueta: 'Explorar', icono: 'search' },
  Mapa: { etiqueta: 'Mapa', icono: 'map' },
  Favoritos: { etiqueta: 'Favoritos', icono: 'favorite' },
  Panel: { etiqueta: 'Panel', icono: 'insights' },
  Tickets: { etiqueta: 'Tickets', icono: 'support-agent' },
  Destinos: { etiqueta: 'Destinos', icono: 'place' },
  Usuarios: { etiqueta: 'Usuarios', icono: 'group' },
  Perfil: { etiqueta: 'Perfil', icono: 'person' },
};

const MARGEN_INFERIOR = 12;

/** Espacio que el contenido debe dejar abajo para no quedar bajo la barra flotante. */
export function useEspacioTabBar() {
  const { bottom } = useSafeAreaInsets();
  return sizes.tabBar + Math.max(bottom, MARGEN_INFERIOR) + spacing.lg;
}

/** Barra de navegación flotante tipo píldora de vidrio. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.contenedor, { bottom: Math.max(bottom, MARGEN_INFERIOR) }]} accessibilityRole="tablist">
      {Platform.OS === 'ios' && (
        <BlurView intensity={blur.bar} tint="light" style={[StyleSheet.absoluteFill, styles.blur]} />
      )}
      {state.routes.map((ruta, indice) => {
        const activa = state.index === indice;
        const tab = TABS[ruta.name as keyof TabsParamList];
        const color = activa ? colors.secondary : colors.textSubtle;

        const alPresionar = () => {
          const evento = navigation.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
          if (!activa && !evento.defaultPrevented) navigation.navigate(ruta.name, ruta.params);
        };

        return (
          <Pressable
            key={ruta.key}
            onPress={alPresionar}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={tab.etiqueta}
            style={styles.tab}
          >
            <View style={[styles.indicador, activa && styles.indicadorActivo]}>
              <Icon name={tab.icono} size={22} color={color} />
            </View>
            <Text style={[styles.etiqueta, { color }]}>{tab.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    height: sizes.tabBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: Platform.OS === 'ios' ? colors.glass : colors.glassStrong,
    ...shadows.lg,
  },
  blur: { borderRadius: radius.full, overflow: 'hidden' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  indicador: { width: 52, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  indicadorActivo: { backgroundColor: colors.secondarySoft },
  etiqueta: { ...typography.labelMd, fontSize: 11, lineHeight: 14 },
});
