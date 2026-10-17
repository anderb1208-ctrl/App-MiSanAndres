import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GlassPanel } from '../components/GlassPanel';
import { IconButton } from '../components/IconButton';
import { ScreenHeader, SectionHeader } from '../components/ScreenHeader';
import { ScreenBackground } from '../components/ScreenBackground';
import { SelectRow } from '../components/SelectRow';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import { Tag } from '../components/Tag';
import { TextField } from '../components/TextField';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { mensajeDeError } from '../services/api';
import { obtenerHistorial } from '../services/interacciones';
import { actualizarNombre, obtenerPerfil } from '../services/perfil';
import { obtenerPreferencias } from '../services/preferencias';
import { guardarPedirLoginAlAbrir, leerPedirLoginAlAbrir } from '../services/sesion';
import type { InteraccionHistorial, TipoInteraccion } from '../services/tipos';
import { API_BASE_URL } from '../config/env';
import { useAuth } from '../store/AuthContext';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { CATEGORIAS, type NombreIcono } from '../utils/categorias';
import { ETIQUETA_ROL, ICONO_ROL } from '../utils/tickets';
import { formatearFechaHora, formatearMesAnio } from '../utils/fecha';
import { ETIQUETA_NIVEL } from '../utils/ocupacion';
import { validarNombre } from '../utils/validacion';

const INTERACCION: Record<TipoInteraccion, { icono: NombreIcono; texto: string }> = {
  vista: { icono: 'visibility', texto: 'Viste' },
  favorito: { icono: 'favorite', texto: 'Guardaste' },
  visita: { icono: 'where-to-vote', texto: 'Visitaste' },
  compartir: { icono: 'share', texto: 'Compartiste' },
};

async function cargarPerfil() {
  const [perfil, preferencias, historial] = await Promise.all([
    obtenerPerfil(),
    obtenerPreferencias(),
    obtenerHistorial(30),
  ]);
  return { perfil, preferencias, historial };
}

export function PerfilScreen({ navigation }: TabScreenProps<'Perfil'>) {
  useBarraEstado('dark');
  const espacioInferior = useEspacioTabBar();
  const { correo, rol, cerrarSesion } = useAuth();
  const esTurista = rol === 'turista';
  const { datos, error, cargando, refrescando, recargar } = useAsync(cargarPerfil, [], { recargarAlEnfocar: true });

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [errorNombre, setErrorNombre] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [pedirLogin, setPedirLogin] = useState(leerPedirLoginAlAbrir);

  const alternarPedirLogin = () => {
    const nuevo = !pedirLogin;
    if (guardarPedirLoginAlAbrir(nuevo)) setPedirLogin(nuevo);
    else Alert.alert('No se pudo guardar', 'El almacenamiento del dispositivo no está disponible.');
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

  const abrir = (i: InteraccionHistorial) => navigation.navigate('DetalleDestino', { id: i.idDestino });

  const cuerpo = () => {
    if (cargando) return <EstadoCargando mensaje="Cargando tu perfil…" />;
    if (!datos) return <EstadoError error={error} onReintentar={recargar} />;
    const { perfil, preferencias, historial } = datos;
    const intereses =
      preferencias.categorias.length + preferencias.tiposExperiencia.length + preferencias.tiposGrupo.length;

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

        <View style={styles.estadisticas}>
          {[
            [String(historial.length), 'Consultas recientes'],
            [String(intereses), 'Intereses'],
            [perfil.nivelOcupacionPreferido ? ETIQUETA_NIVEL[perfil.nivelOcupacionPreferido] : '—', 'Ocupación pref.'],
          ].map(([valor, etiqueta]) => (
            <GlassPanel key={etiqueta} padding={12} radius={radius.xl} style={styles.estadistica}>
              <Text style={styles.estadisticaValor}>{valor}</Text>
              <Text style={styles.estadisticaEtiqueta}>{etiqueta}</Text>
            </GlassPanel>
          ))}
        </View>

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
                icono="report-problem"
                tonoIcono="neutral"
                etiqueta="Reportar un problema"
                descripcion="Información incorrecta, fallas o sugerencias"
                control="chevron"
                onPress={() => navigation.navigate('NuevoTicket')}
              />
              <SelectRow
                icono="assignment"
                tonoIcono="neutral"
                etiqueta="Mis reportes"
                descripcion="Estado de lo que reportaste"
                control="chevron"
                onPress={() => navigation.navigate('MisReportes')}
              />
            </>
          )}
          <SelectRow
            icono="info-outline"
            tonoIcono="neutral"
            etiqueta="Créditos y licencias"
            descripcion="OpenStreetMap, Open-Meteo y fotos"
            control="chevron"
            onPress={() => navigation.navigate('Creditos')}
          />
          <SelectRow
            icono="lock-clock"
            tonoIcono="neutral"
            etiqueta="Pedir inicio de sesión al abrir la app"
            descripcion="Modo demostración: al abrir la app se cierra la sesión y se pide el login"
            control="checkbox"
            marcado={pedirLogin}
            divisor={false}
            onPress={alternarPedirLogin}
          />
        </GlassPanel>

        <View>
          <SectionHeader titulo="Historial" subtitulo="Destinos que has consultado recientemente" />
          {historial.length === 0 ? (
            <GlassPanel tono="strong" radius={20}>
              <EstadoMensaje
                icono="history"
                titulo="Aún no hay actividad"
                mensaje="Los destinos que abras aparecerán aquí."
                accion={{ texto: 'Explorar destinos', onPress: () => navigation.navigate('Explorar') }}
                style={styles.vacio}
              />
            </GlassPanel>
          ) : (
            <GlassPanel tono="strong" padding={0} radius={20} style={styles.menu}>
              {historial.map((i, indice) => {
                const tipo = INTERACCION[i.tipo];
                const categoria = i.destino ? CATEGORIAS[i.destino.categoria].singular : '';
                return (
                  <SelectRow
                    key={i.id}
                    icono={tipo.icono}
                    tonoIcono="neutral"
                    etiqueta={i.destino?.nombre ?? 'Destino no disponible'}
                    descripcion={`${tipo.texto} • ${categoria ? `${categoria} • ` : ''}${formatearFechaHora(i.fechaHora)}`}
                    control={i.destino ? 'chevron' : 'none'}
                    onPress={i.destino ? () => abrir(i) : undefined}
                    divisor={indice < historial.length - 1}
                  />
                );
              })}
            </GlassPanel>
          )}
        </View>

        <Button variante="danger" tamano="lg" anchoCompleto icono="logout" cargando={saliendo} onPress={confirmarSalida}>
          Cerrar sesión
        </Button>

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
  desde: { ...typography.labelMd, color: colors.textSubtle, marginTop: 2 },
  rol: { flexDirection: 'row', marginTop: 6 },
  edicion: { gap: spacing.gutter },
  edicionAcciones: { flexDirection: 'row', gap: spacing.sm },
  estadisticas: { flexDirection: 'row', gap: 10 },
  estadistica: { flex: 1, alignItems: 'center' },
  estadisticaValor: { ...typography.headlineSm, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  estadisticaEtiqueta: { ...typography.labelMd, color: colors.textSubtle, textAlign: 'center' },
  menu: { overflow: 'hidden' },
  vacio: { paddingVertical: spacing.md },
  servidor: { ...typography.labelMd, fontSize: 11, color: colors.textSubtle, textAlign: 'center' },
});
