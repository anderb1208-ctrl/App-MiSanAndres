import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthSheet } from '../components/AuthSheet';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { TextField } from '../components/TextField';
import { useBarraEstado } from '../hooks/useBarraEstado';
import type { AuthScreenProps } from '../navigation/types';
import { ErrorAuth, registrarse } from '../services/auth';
import { colors, spacing, typography } from '../theme';
import { requisitosContrasena, validarContrasena } from '../utils/contrasena';
import { IMAGENES } from '../utils/imagenes';
import { validarCorreo, validarNombre } from '../utils/validacion';

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
  const requisitos = requisitosContrasena(contrasena);

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
      // El error de Supabase va bajo su campo (correo ya registrado, contraseña rechazada); si no, arriba del botón.
      if (e instanceof ErrorAuth && e.campo) setErrores((prev) => ({ ...prev, [e.campo!]: e.message }));
      else setErrorGeneral(e instanceof ErrorAuth ? e.message : 'No pudimos crear tu cuenta. Intenta de nuevo.');
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
          contrasena
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => campoConfirmacion.current?.focus()}
        />
        {/* Los dos requisitos de la política; cada uno se marca al cumplirse. */}
        <View style={styles.requisitos} accessibilityLiveRegion="polite">
          {requisitos.map((r) => (
            <View
              key={r.clave}
              style={styles.requisito}
              accessible
              accessibilityLabel={`${r.texto}: ${r.cumple ? 'cumple' : 'no cumple'}`}
            >
              <Icon
                name={r.cumple ? 'check-circle' : 'radio-button-unchecked'}
                size={18}
                color={r.cumple ? colors.secondary : colors.textMuted}
              />
              <Text style={[styles.requisitoTexto, r.cumple && styles.requisitoCumplido]}>{r.texto}</Text>
            </View>
          ))}
        </View>
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
  requisitos: { gap: 4, marginTop: -6 },
  requisito: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requisitoTexto: { ...typography.bodyMd, color: colors.textMuted },
  requisitoCumplido: { color: colors.textStrong },
  boton: { marginTop: spacing.sm },
  pie: { marginTop: 'auto', paddingTop: spacing.lg, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  pieTexto: { ...typography.bodyMd, color: colors.textMuted },
  enlace: { ...typography.bodyMd, fontFamily: typography.titleMd.fontFamily, color: colors.textLink },
});
