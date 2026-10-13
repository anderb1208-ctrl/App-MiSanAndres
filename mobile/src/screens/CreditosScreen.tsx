import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassPanel } from '../components/GlassPanel';
import { ScreenBackground } from '../components/ScreenBackground';
import { ScreenHeader, SectionHeader } from '../components/ScreenHeader';
import { SelectRow } from '../components/SelectRow';
import { useBarraEstado } from '../hooks/useBarraEstado';
import type { AppScreenProps } from '../navigation/types';
import { colors, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';

interface Credito {
  icono: NombreIcono;
  titulo: string;
  descripcion: string;
  url?: string;
}

const CREDITOS: Credito[] = [
  {
    icono: 'place',
    titulo: '© Colaboradores de OpenStreetMap',
    descripcion:
      'Las ubicaciones de los destinos se calcularon con datos de OpenStreetMap, disponibles bajo la licencia Open Database License (ODbL).',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    icono: 'wb-sunny',
    titulo: 'Datos del clima: Open-Meteo.com',
    descripcion: 'Pronóstico y clima histórico por hora, con licencia CC BY 4.0.',
    url: 'https://open-meteo.com/',
  },
  {
    icono: 'map',
    titulo: 'Mapas: Apple Maps y Google Maps',
    descripcion: 'El mapa de la app usa Apple Maps en iPhone y Google Maps en Android; cada uno muestra su atribución sobre el mapa.',
  },
  {
    icono: 'photo-library',
    titulo: 'Fotos de los destinos',
    descripcion:
      'Cada foto indica su autor y licencia en el detalle del destino. Las marcadas como "Imagen de referencia" son provisionales y se reemplazarán por fotos propias.',
  },
];

/** Atribuciones que exigen las licencias de los datos usados por la app. */
export function CreditosScreen({ navigation }: AppScreenProps<'Creditos'>) {
  useBarraEstado('dark');

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <ScreenHeader titulo="Créditos y licencias" onVolver={navigation.goBack} />
          <View style={styles.cuerpo}>
            <SectionHeader titulo="Datos y servicios" subtitulo="Toca un elemento para abrir su sitio" />
            <GlassPanel tono="strong" padding={0} radius={20} style={styles.menu}>
              {CREDITOS.map((c, i) => (
                <SelectRow
                  key={c.titulo}
                  icono={c.icono}
                  tonoIcono="neutral"
                  etiqueta={c.titulo}
                  descripcion={c.descripcion}
                  control={c.url ? 'chevron' : 'none'}
                  onPress={c.url ? () => void Linking.openURL(c.url!) : undefined}
                  divisor={i < CREDITOS.length - 1}
                />
              ))}
            </GlassPanel>
            <Text style={styles.nota}>MiSanAndrés · proyecto académico.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingBottom: spacing.xl },
  cuerpo: { paddingHorizontal: spacing.screen, gap: spacing.md },
  menu: { overflow: 'hidden' },
  nota: { ...typography.labelMd, color: colors.textSubtle, textAlign: 'center' },
});
