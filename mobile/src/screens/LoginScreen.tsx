import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthSheet } from '../components/AuthSheet';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { TextField } from '../components/TextField';
import { useBarraEstado } from '../hooks/useBarraEstado';
import type { AuthScreenProps } from '../navigation/types';
import { ErrorAuth, iniciarSesion, recuperarContrasena } from '../services/auth';
import { useAuth } from '../store/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { IMAGENES } from '../utils/imagenes';
import { validarCorreo } from '../utils/validacion';

export function LoginScreen({ navigation, route }: AuthScreenProps<'Login'>) {
  useBarraEstado('light');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<{ correo?: string; contrasena?: string }>({});
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const campoContrasena = useRef<TextInput>(null);
  const { aviso: avisoSesion, limpiarAviso } = useAuth();
  const aviso = route.params?.aviso ?? avisoSesion;
  const [recuperando, setRecuperando] = useState(false);

  const cambiarCorreo = (v: string) => {
    setCorreo(v);
    if (errores.correo) setErrores((e) => ({ ...e, correo: undefined }));
    setErrorGeneral(undefined);
  };
  const cambiarContrasena = (v: string) => {
    setContrasena(v);
    if (errores.contrasena) setErrores((e) => ({ ...e, contrasena: undefined }));
    setErrorGeneral(undefined);
  };

  const recuperar = async () => {
    const error = validarCorreo(correo);
    if (error) {
      setErrores((e) => ({ ...e, correo: 'Escribe tu correo para enviarte el enlace de recuperación.' }));
      return;
    }
    setRecuperando(true);
    try {
      await recuperarContrasena(correo);
      Alert.alert('Revisa tu correo', `Si ${correo.trim()} tiene una cuenta, te enviamos un enlace para crear una contraseña nueva.`);
    } catch (e) {
      setErrorGeneral(e instanceof ErrorAuth ? e.message : 'No pudimos enviar el correo. Intenta de nuevo.');
    } finally {
      setRecuperando(false);
    }
  };

  const enviar = async () => {
    const nuevos = {
      correo: validarCorreo(correo),
      contrasena: contrasena ? undefined : 'Ingresa tu contraseña.',
    };
    setErrores(nuevos);
    setErrorGeneral(undefined);
    if (nuevos.correo || nuevos.contrasena) return;

    setEnviando(true);
    try {
      await iniciarSesion(correo, contrasena);
      limpiarAviso();
      // AuthContext detecta la sesión y cambia de flujo.
    } catch (e) {
      setErrorGeneral(e instanceof ErrorAuth ? e.message : 'No pudimos iniciar sesión. Intenta de nuevo.');
      setEnviando(false);
    }
  };

  return (
    <AuthSheet imagen={IMAGENES.loginBeach} onVolver={navigation.canGoBack() ? navigation.goBack : undefined}>
      <View style={styles.encabezado}>
        <Text style={styles.marca} accessibilityRole="header">
          MiSanAndrés
        </Text>
        <Text style={styles.subtitulo}>Inicia sesión para continuar</Text>
      </View>

      {aviso ? (
        <View style={styles.aviso}>
          <Icon name={avisoSesion && !route.params?.aviso ? 'info-outline' : 'mark-email-read'} size={20} color={colors.secondary} />
          <Text style={styles.avisoTexto}>{aviso}</Text>
        </View>
      ) : null}

      <View style={styles.formulario}>
        <TextField
          etiqueta="Correo electrónico"
          placeholder="ejemplo@correo.com"
          value={correo}
          onChangeText={cambiarCorreo}
          error={errores.correo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => campoContrasena.current?.focus()}
        />
        <TextField
          ref={campoContrasena}
          etiqueta="Contraseña"
          placeholder="Ingresa tu contraseña"
          value={contrasena}
          onChangeText={cambiarContrasena}
          error={errores.contrasena}
          contrasena
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={enviar}
        />
        <Text style={styles.olvido} onPress={recuperando ? undefined : () => void recuperar()} accessibilityRole="link">
          {recuperando ? 'Enviando enlace…' : '¿Olvidaste tu contraseña?'}
        </Text>
        {errorGeneral ? (
          <Text style={styles.errorGeneral} accessibilityLiveRegion="polite">
            {errorGeneral}
          </Text>
        ) : null}
        <Button tamano="lg" anchoCompleto cargando={enviando} onPress={enviar} style={styles.boton}>
          Iniciar sesión
        </Button>
      </View>

      <View style={styles.pie}>
        <Text style={styles.pieTexto}>¿No tienes cuenta?</Text>
        <Text style={styles.enlace} onPress={() => navigation.navigate('Registro')} accessibilityRole="link">
          Regístrate
        </Text>
      </View>
    </AuthSheet>
  );
}

const styles = StyleSheet.create({
  encabezado: { alignItems: 'center', marginBottom: 28 },
  marca: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted, marginTop: 4 },
  aviso: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.gutter,
    borderRadius: radius.lg,
    backgroundColor: colors.turquoiseTintSoft,
    marginBottom: spacing.md,
  },
  avisoTexto: { ...typography.bodyMd, color: colors.turq800, flex: 1 },
  formulario: { gap: spacing.md },
  errorGeneral: { ...typography.bodyMd, color: colors.error, textAlign: 'center' },
  olvido: { ...typography.labelBold, color: colors.textLink, alignSelf: 'flex-end' },
  boton: { marginTop: spacing.sm },
  pie: { marginTop: 'auto', paddingTop: 28, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  pieTexto: { ...typography.bodyMd, color: colors.textMuted },
  enlace: { ...typography.bodyMd, fontFamily: typography.titleMd.fontFamily, color: colors.textLink },
});
