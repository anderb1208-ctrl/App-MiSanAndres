import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GlassPanel } from '../components/GlassPanel';
import { PasaporteViajero } from '../components/PasaporteViajero';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { ScreenBackground } from '../components/ScreenBackground';
import { SelectRow } from '../components/SelectRow';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { Tag } from '../components/Tag';
import { TextField } from '../components/TextField';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { mensajeDeError } from '../services/api';
import { obtenerPasaporte } from '../services/historial';
import { actualizarNombre, obtenerPerfil } from '../services/perfil';
import { probarNotificacion } from '../services/notificaciones';
import type { Insignia, Rol } from '../services/tipos';
import { API_BASE_URL } from '../config/env';
import { useAuth } from '../store/AuthContext';
import { colors, shadows, spacing, typography } from '../theme';
import { ETIQUETA_ROL, ICONO_ROL } from '../utils/tickets';
import { formatearMesAnio } from '../utils/fecha';
import { motivoPendientes } from '../utils/pasaporte';
import { validarNombre } from '../utils/validacion';

/** El pasaporte es del turista: técnicos y administradores no exploran destinos. */
async function cargarPerfil(rol: Rol | null) {
  const [perfil, pasaporte] = await Promise.all([obtenerPerfil(), rol === 'turista' ? obtenerPasaporte() : Promise.resolve(null)]);
  return { perfil, pasaporte };
}

export function PerfilScreen({ navigation }: TabScreenProps<'Perfil'>) {
  useBarraEstado('dark');
  const espacioInferior = useEspacioTabBar();
  const { correo, rol, cerrarSesion } = useAuth();
  const esTurista = rol === 'turista';
  // Herramienta de prueba: solo en desarrollo o para administradores.
  const conPruebaNotificacion = __DEV__ || rol === 'administrador';
  const { datos, error, cargando, refrescando, recargar } = useAsync(() => cargarPerfil(rol), [rol], { recargarAlEnfocar: true });

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [errorNombre, setErrorNombre] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  const probar = async () => {
    try {
      const ok = await probarNotificacion();
      Alert.alert(
        ok ? 'Notificación programada' : 'Notificaciones desactivadas',
        ok
          ? 'Llegará en 5 segundos. Puedes salir de la app o bloquear el teléfono para verla.'
          : 'Activa las notificaciones de MiSanAndrés en los ajustes del teléfono para recibir avisos.',
      );
    } catch (e) {
      Alert.alert('No se pudo programar', (e as Error).message);
    }
  };

  const empezarEdicion = () => {
    setNombre(datos?.perfil.nombre ?? '');
    setErrorNombre(undefined);
    setEditando(true);
  };

  const guardarNombre = async () => {
    const invalido = validarNombre(nombre);
    if (invalido) {
      setErrorNombre(invalido);
      return;
    }
    setGuardando(true);
    try {
      await actualizarNombre(nombre.trim());
      setEditando(false);
      recargar();
    } catch (e) {
      setErrorNombre(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarSalida = () =>
    Alert.alert('Cerrar sesión', '¿Quieres cerrar sesión en este dispositivo? Dejarás de recibir avisos de tus favoritos aquí.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          setSaliendo(true);
          await cerrarSesion();
        },
      },
    ]);

  const explorarPendientes = (i: Insignia) =>
    navigation.navigate('Explorar', { categoria: i.categoria ?? undefined, pendientes: i.pendientes, motivo: motivoPendientes(i) });

  const cuerpo = () => {
    if (cargando) return <EstadoCargando mensaje="Cargando tu perfil…" />;
    if (!datos) return <EstadoError error={error} onReintentar={recargar} />;
    const { perfil, pasaporte } = datos;

    return (
      <View style={styles.cuerpo}>
        <GlassPanel tono="strong" radius={20}>
          {editando ? (
            <View style={styles.edicion}>
              <TextField
                etiqueta="Nombre"
                value={nombre}
                onChangeText={setNombre}
                error={errorNombre}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={guardarNombre}
              />
              <View style={styles.edicionAcciones}>
                <Button variante="glass" style={styles.flex} onPress={() => setEditando(false)} deshabilitado={guardando}>
                  Cancelar
                </Button>
                <Button style={styles.flex} onPress={guardarNombre} cargando={guardando}>
                  Guardar
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.usuario}>
              <View style={[styles.avatar, shadows.sm]}>
                <Text style={styles.avatarTexto}>{(perfil.nombre ?? correo ?? '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {perfil.nombre || 'Sin nombre'}
                </Text>
                <Text style={styles.correo} numberOfLines={1}>
                  {perfil.correo ?? correo}
                </Text>
                <Text style={styles.desde}>Desde {formatearMesAnio(perfil.fechaRegistro)}</Text>
                <View style={styles.rol}>
                  <Tag icono={ICONO_ROL[perfil.rol]} tono={perfil.rol === 'turista' ? 'neutral' : 'turquoise'}>
                    {ETIQUETA_ROL[perfil.rol]}
                  </Tag>
                </View>
              </View>
              <IconButton icono="edit" etiqueta="Editar nombre" tono="tonal" onPress={empezarEdicion} />
            </View>
          )}
        </GlassPanel>

        {pasaporte && <PasaporteViajero pasaporte={pasaporte} onExplorarPendientes={explorarPendientes} />}

        {(esTurista || conPruebaNotificacion) && (
          <GlassPanel tono="strong" padding={0} radius={20} style={styles.menu}>
            {esTurista && (
              <>
                <SelectRow
                  icono="tune"
                  etiqueta="Mis preferencias"
                  descripcion="Ver y editar preferencias"
                  control="chevron"
                  onPress={() => navigation.navigate('Preferencias')}
                />
                <SelectRow
                  icono="history"
                  etiqueta="Historial"
                  descripcion="Lo que has consultado, lo más visto y lo popular"
                  control="chevron"
                  onPress={() => navigation.navigate('Historial')}
                />
                <SelectRow
                  icono="report-problem"
                  tonoIcono="neutral"
                  etiqueta="Reportar un problema"
                  descripcion="Nuevo reporte o estado de tus reportes"
                  control="chevron"
                  divisor={conPruebaNotificacion}
                  onPress={() => navigation.navigate('NuevoTicket')}
                />
              </>
            )}
            {conPruebaNotificacion && (
              <SelectRow
                icono="notifications-active"
                tonoIcono="neutral"
                etiqueta="Probar notificación"
                descripcion="Aviso local de prueba a los 5 segundos"
                control="none"
                divisor={false}
                onPress={() => void probar()}
              />
            )}
          </GlassPanel>
        )}

        <Button variante="dangerOutline" anchoCompleto icono="logout" cargando={saliendo} onPress={confirmarSalida}>
          Cerrar sesión
        </Button>

        {/* OpenStreetMap, Open-Meteo y las fotos exigen atribución visible. */}
        <Pressable
          onPress={() => navigation.navigate('Creditos')}
          accessibilityRole="link"
          accessibilityLabel="Créditos y licencias"
          hitSlop={8}
          style={styles.creditos}
        >
          <Text style={styles.creditosTexto}>Créditos</Text>
        </Pressable>

        {__DEV__ && (
          <Text style={styles.servidor} selectable>
            API: {API_BASE_URL}
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: espacioInferior, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={colors.secondary} />}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader titulo="Mi perfil" />
          {cuerpo()}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cuerpo: { paddingHorizontal: spacing.screen, gap: spacing.screen },
  usuario: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { ...typography.headlineMd, color: colors.white },
  nombre: { ...typography.headlineSm, color: colors.textStrong },
  correo: { ...typography.bodyMd, color: colors.textMuted },
  desde: { ...typography.labelMd, color: colors.textMuted, marginTop: 2 },
  rol: { flexDirection: 'row', marginTop: 6 },
  edicion: { gap: spacing.gutter },
  edicionAcciones: { flexDirection: 'row', gap: spacing.sm },
  menu: { overflow: 'hidden' },
  creditos: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  creditosTexto: { ...typography.labelBold, color: colors.textLink, textDecorationLine: 'underline' },
  servidor: { ...typography.labelMd, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
