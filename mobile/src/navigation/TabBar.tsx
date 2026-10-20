import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SuperficieVidrio } from '../components/SuperficieVidrio';
import { Icon } from '../components/Icon';
import { colors, radius, sizes, spacing, typography } from '../theme';
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

/** Barra de navegación flotante tipo píldora de vidrio (Liquid Glass en iOS 26+, con respaldo). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <SuperficieVidrio
      variante="panel"
      sombra="lg"
      style={[styles.contenedor, { bottom: Math.max(bottom, MARGEN_INFERIOR) }]}
      accessibilityRole="tablist"
    >
      {state.routes.map((ruta, indice) => {
        const activa = state.index === indice;
        const tab = TABS[ruta.name as keyof TabsParamList];
        // Inactiva en textMuted: textSubtle no llega a 4.5:1 sobre el vidrio.
        const color = activa ? colors.secondary : colors.textMuted;

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
            <Text style={[styles.etiqueta, { color }]} numberOfLines={1}>
              {tab.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </SuperficieVidrio>
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
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  indicador: { width: 52, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  indicadorActivo: { backgroundColor: colors.secondarySoft },
  etiqueta: typography.labelMd,
});
