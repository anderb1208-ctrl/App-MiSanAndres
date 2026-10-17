import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthSheet } from '../components/AuthSheet';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useBarraEstado } from '../hooks/useBarraEstado';
import type { AuthScreenProps } from '../navigation/types';
import { ErrorAuth, registrarse } from '../services/auth';
import { colors, spacing, typography } from '../theme';
import { IMAGENES } from '../utils/imagenes';
import {
  type Fortaleza,
  fortalezaContrasena,
  MIN_CONTRASENA,
  validarContrasena,
  validarCorreo,
  validarNombre,
} from '../utils/validacion';

const FORTALEZA: Record<Fortaleza, { texto: string; color: string; partes: number }> = {
  debil: { texto: 'Débil', color: colors.error, partes: 1 },
  media: { texto: 'Aceptable', color: colors.tertiary, partes: 2 },
  fuerte: { texto: 'Fuerte', color: colors.secondary, partes: 3 },
};

interface Errores {
  nombre?: string;
  correo?: string;
  contrasena?: string;
  confirmacion?: string;
}

export function RegistroScreen({ navigation }: AuthScreenProps<'Registro'>) {
  useBarraEstado('light');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const campoCorreo = useRef<TextInput>(null);
  const campoContrasena = useRef<TextInput>(null);
  const campoConfirmacion = useRef<TextInput>(null);
  const fortaleza = FORTALEZA[fortalezaContrasena(contrasena)];

  /** Al editar un campo se borra su error (y el error general). */
  const cambiar = (setter: (v: string) => void, campo: keyof Errores) => (v: string) => {
    setter(v);
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorGeneral(undefined);
  };

  const enviar = async () => {
    const nuevos: Errores = {
      nombre: validarNombre(nombre),
      correo: validarCorreo(correo),
      contrasena: validarContrasena(contrasena),
      confirmacion: confirmacion !== contrasena ? 'Las contraseñas no coinciden.' : undefined,
    };
    setErrores(nuevos);
    setErrorGeneral(undefined);
    if (Object.values(nuevos).some(Boolean)) return;

    setEnviando(true);
    try {
      const { requiereConfirmacion } = await registrarse(nombre.trim(), correo.trim(), contrasena);
      if (requiereConfirmacion) {
        // Sin sesión todavía: al confirmar el correo e iniciar sesión, irá a sus preferencias.
        navigation.navigate('Login', {
          aviso: `Te enviamos un correo a ${correo.trim()}. Confírmalo y luego inicia sesión.`,
        });
        setEnviando(false);
      }
      // Con sesión inmediata, AuthContext lleva a la configuración de preferencias.
    } catch (e) {
      setErrorGeneral(e instanceof ErrorAuth ? e.message : 'No pudimos crear tu cuenta. Intenta de nuevo.');
      setEnviando(false);
    }
  };

  return (
    <AuthSheet imagen={IMAGENES.westView} onVolver={navigation.goBack}>
      <Text style={styles.titulo} accessibilityRole="header">
        Crear cuenta
      </Text>
      <Text style={styles.subtitulo}>Completa tus datos para comenzar</Text>

      <View style={styles.formulario}>
        <TextField
          etiqueta="Nombre completo"
          placeholder="Ingresa tu nombre"
          value={nombre}
          onChangeText={cambiar(setNombre, 'nombre')}
          error={errores.nombre}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => campoCorreo.current?.focus()}
        />
        <TextField
          ref={campoCorreo}
          etiqueta="Correo electrónico"
          placeholder="ejemplo@correo.com"
          value={correo}
          onChangeText={cambiar(setCorreo, 'correo')}
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
          placeholder="Crea una contraseña"
          value={contrasena}
          onChangeText={cambiar(setContrasena, 'contrasena')}
          error={errores.contrasena}
          ayuda={`Mínimo ${MIN_CONTRASENA} caracteres, con letras y números`}
          contrasena
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => campoConfirmacion.current?.focus()}
        />
        {contrasena ? (
          <View style={styles.fortaleza} accessibilityLabel={`Fortaleza de la contraseña: ${fortaleza.texto}`}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={[styles.segmento, { backgroundColor: n <= fortaleza.partes ? fortaleza.color : colors.track }]} />
            ))}
            <Text style={[styles.fortalezaTexto, { color: fortaleza.color }]}>{fortaleza.texto}</Text>
          </View>
        ) : null}
        <TextField
          ref={campoConfirmacion}
          etiqueta="Confirmar contraseña"
          placeholder="Confirma tu contraseña"
          value={confirmacion}
          onChangeText={cambiar(setConfirmacion, 'confirmacion')}
          error={errores.confirmacion}
          contrasena
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={enviar}
        />
        {errorGeneral ? (
          <Text style={styles.errorGeneral} accessibilityLiveRegion="polite">
            {errorGeneral}
          </Text>
        ) : null}
        <Button tamano="lg" anchoCompleto cargando={enviando} onPress={enviar} style={styles.boton}>
          Registrarme
        </Button>
      </View>

      <View style={styles.pie}>
        <Text style={styles.pieTexto}>¿Ya tienes cuenta?</Text>
        <Text style={styles.enlace} onPress={() => navigation.navigate('Login')} accessibilityRole="link">
          Inicia sesión
        </Text>
      </View>
    </AuthSheet>
  );
}

const styles = StyleSheet.create({
  titulo: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
  formulario: { gap: 14 },
  errorGeneral: { ...typography.bodyMd, color: colors.error, textAlign: 'center' },
  fortaleza: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  segmento: { flex: 1, height: 4, borderRadius: 2 },
  fortalezaTexto: { ...typography.labelBold, minWidth: 70, textAlign: 'right' },
  boton: { marginTop: spacing.sm },
  pie: { marginTop: 'auto', paddingTop: spacing.lg, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  pieTexto: { ...typography.bodyMd, color: colors.textMuted },
  enlace: { ...typography.bodyMd, fontFamily: typography.titleMd.fontFamily, color: colors.textLink },
});
