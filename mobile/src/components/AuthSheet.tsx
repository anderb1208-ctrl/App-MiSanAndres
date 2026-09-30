import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { IconButton } from './IconButton';

interface Props {
  imagen: ImageSourcePropType;
  children: ReactNode;
  onVolver?: () => void;
}

/** Layout de login y registro: foto de playa arriba y hoja de vidrio con el formulario. */
export function AuthSheet({ imagen, children, onVolver }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fondo}>
      <Image source={imagen} style={styles.imagen} resizeMode="cover" />
      <LinearGradient colors={colors.scrimTop} style={styles.scrim} />
      {onVolver && (
        <IconButton
          icono="arrow-back"
          etiqueta="Volver"
          tono="glass-dark"
          onPress={onVolver}
          style={[styles.volver, { top: insets.top + spacing.sm }]}
        />
      )}
      <KeyboardAvoidingView style={styles.hojaContenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hoja}>
          <ScrollView
            contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colors.white },
  imagen: { position: 'absolute', top: 0, left: 0, right: 0, height: '46%' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  volver: { position: 'absolute', left: spacing.screen, zIndex: 5 },
  hojaContenedor: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    maxHeight: '72%',
    minHeight: '66%',
    borderTopLeftRadius: radius.auth,
    borderTopRightRadius: radius.auth,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderTopWidth: 1,
    borderColor: colors.white,
    shadowColor: colors.navy950,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  contenido: { flexGrow: 1, paddingTop: 28, paddingHorizontal: spacing.screen },
});
