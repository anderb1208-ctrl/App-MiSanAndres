import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { useBarraEstado } from '../hooks/useBarraEstado';
import type { AuthScreenProps } from '../navigation/types';
import { colors, spacing, typography } from '../theme';
import { IMAGENES } from '../utils/imagenes';

export function BienvenidaScreen({ navigation }: AuthScreenProps<'Bienvenida'>) {
  const insets = useSafeAreaInsets();
  useBarraEstado('light');

  return (
    <View style={styles.fondo}>
      <Image source={IMAGENES.johnnyCayHero} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={colors.scrimHero}
        locations={[0, 0.35, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.contenido, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View>
          <Text style={styles.marca} accessibilityRole="header">
            MiSanAndrés
          </Text>
          <Text style={styles.lema}>Descubre San Andrés Isla de forma inteligente</Text>
        </View>
        <GlassPanel tono="dark" radius={28} style={styles.panel}>
          <View style={styles.fila}>
            <Icon name="groups" size={20} color={colors.turq100} />
            <Text style={styles.texto}>
              Recomendaciones según tus gustos y la ocupación prevista de cada lugar.
            </Text>
          </View>
          <Button variante="light" tamano="lg" anchoCompleto iconoDerecha="arrow-forward" onPress={() => navigation.navigate('Login')}>
            Comenzar
          </Button>
        </GlassPanel>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.navy950 },
  contenido: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, gap: 28 },
  marca: { ...typography.hero, color: colors.white },
  lema: { ...typography.bodyLg, fontSize: 18, lineHeight: 26, color: colors.textOnDarkStrong, marginTop: 10, maxWidth: 280 },
  panel: { gap: spacing.gutter },
  fila: { flexDirection: 'row', gap: 10 },
  texto: { ...typography.bodyMd, color: colors.white, flex: 1 },
});
