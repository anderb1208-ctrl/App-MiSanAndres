import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { colors, spacing } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { ScreenBackground } from './ScreenBackground';
import { ScreenHeader } from './ScreenHeader';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Sin onVolver, la pantalla no muestra la flecha (p. ej. cuando es una pestaña). */
  onVolver?: () => void;
  acciones?: { icono: NombreIcono; etiqueta: string; onPress: () => void }[];
  refrescando?: boolean;
  onRefrescar?: () => void;
  /** Espacio inferior extra (p. ej. para la barra de pestañas). */
  espacioInferior?: number;
  children: ReactNode;
}

/** Estructura común de las pantallas de formulario y detalle: fondo, encabezado y scroll. */
export function PantallaApilada({ titulo, subtitulo, onVolver, acciones, refrescando, onRefrescar, espacioInferior = spacing.xl, children }: Props) {
  useBarraEstado('dark');
  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: espacioInferior }}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefrescar ? (
                <RefreshControl refreshing={Boolean(refrescando)} onRefresh={onRefrescar} tintColor={colors.secondary} />
              ) : undefined
            }
          >
            <ScreenHeader titulo={titulo} subtitulo={subtitulo} onVolver={onVolver} acciones={acciones} />
            <View style={styles.cuerpo}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cuerpo: { paddingHorizontal: spacing.screen, gap: spacing.md },
});
