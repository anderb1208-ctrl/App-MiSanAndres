import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { Icon } from './Icon';

interface Props extends Omit<TextInputProps, 'style'> {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  /** Campo de contraseña con botón para mostrarla. */
  contrasena?: boolean;
}

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { etiqueta, error, ayuda, contrasena = false, onFocus, onBlur, ...resto },
  ref,
) {
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View
        style={[
          styles.campo,
          enfocado && styles.campoEnfocado,
          Boolean(error) && styles.campoError,
        ]}
      >
        <TextInput
          ref={ref}
          {...resto}
          accessibilityLabel={etiqueta}
          secureTextEntry={contrasena && !visible}
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          onFocus={(e) => {
            setEnfocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            onBlur?.(e);
          }}
        />
        {contrasena && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Icon name={visible ? 'visibility-off' : 'visibility'} size={20} color={colors.textSubtle} />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : ayuda ? (
        <Text style={styles.ayuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  contenedor: { gap: 6 },
  etiqueta: { ...typography.labelBold, color: colors.textMuted, paddingLeft: spacing.xs },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md + 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.white,
  },
  campoEnfocado: {
    borderColor: colors.borderFocus,
    shadowColor: colors.secondary,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  campoError: { borderColor: colors.error },
  input: { flex: 1, ...typography.bodyLg, color: colors.textBody, paddingVertical: 0 },
  error: { ...typography.labelMd, color: colors.error, paddingLeft: spacing.xs },
  ayuda: { ...typography.labelMd, color: colors.textSubtle, paddingLeft: spacing.xs },
});
