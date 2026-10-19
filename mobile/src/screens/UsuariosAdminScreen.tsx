import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PantallaApilada } from '../components/PantallaApilada';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { Tag } from '../components/Tag';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { cambiarRol, listarUsuarios } from '../services/admin';
import { mensajeDeError } from '../services/api';
import type { Rol, UsuarioAdmin } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { formatearMesAnio } from '../utils/fecha';
import { ETIQUETA_ROL, ICONO_ROL } from '../utils/tickets';

const ROLES: Rol[] = ['turista', 'tecnico', 'administrador'];

/** Usuarios y roles (administrador). El backend impide quitarse el propio rol o quedar sin administradores. */
export function UsuariosAdminScreen(_props: TabScreenProps<'Usuarios'>) {
  const espacio = useEspacioTabBar();
  const { sesion } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const { datos, error, cargando, refrescando, recargar } = useAsync(listarUsuarios, [], { recargarAlEnfocar: true });
  const q = busqueda.trim().toLowerCase();
  const lista = (datos ?? []).filter((u) => !q || `${u.nombre ?? ''} ${u.correo ?? ''}`.toLowerCase().includes(q));

  const elegirRol = (u: UsuarioAdmin) => {
    const esYo = u.id === sesion?.user.id;
    Alert.alert(
      u.nombre ?? u.correo ?? 'Usuario',
      esYo ? 'No puedes quitarte tu propio rol de administrador.' : `Rol actual: ${ETIQUETA_ROL[u.rol]}. Elige el nuevo rol:`,
      [
        ...(esYo
          ? []
          : ROLES.filter((r) => r !== u.rol).map((r) => ({
              text: ETIQUETA_ROL[r],
              onPress: async () => {
                try {
                  await cambiarRol(u.id, r);
                  recargar();
                } catch (e) {
                  Alert.alert('No se pudo cambiar el rol', mensajeDeError(e));
                }
              },
            }))),
        { text: esYo ? 'Entendido' : 'Cancelar', style: 'cancel' },
      ],
    );
  };

  return (
    <PantallaApilada conVolver titulo="Usuarios" subtitulo={`${datos?.length ?? 0} registrados`} espacioInferior={espacio} refrescando={refrescando} onRefrescar={recargar}>
      <View style={styles.buscador}>
        <Icon name="search" size={20} color={colors.textSubtle} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre o correo"
          placeholderTextColor={colors.textSubtle}
          style={styles.entrada}
          autoCapitalize="none"
          accessibilityLabel="Buscar usuarios"
        />
      </View>
      {cargando ? (
        <EstadoCargando mensaje="Cargando usuarios…" />
      ) : error && !datos ? (
        <EstadoError error={error} onReintentar={recargar} />
      ) : (
        lista.map((u) => (
          <GlassPanel key={u.id} tono="strong" radius={16} padding={14} onPress={() => elegirRol(u)} accessibilityLabel={`${u.nombre ?? u.correo}, ${ETIQUETA_ROL[u.rol]}`}>
            <View style={styles.fila}>
              <Icon name={ICONO_ROL[u.rol]} size={22} color={colors.secondary} />
              <View style={styles.textos}>
                <Text style={styles.nombre} numberOfLines={1}>
                  {u.nombre || 'Sin nombre'}
                  {u.id === sesion?.user.id ? ' (tú)' : ''}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {u.correo ?? '—'} · desde {formatearMesAnio(u.fechaRegistro)}
                </Text>
              </View>
              <Tag tono={u.rol === 'turista' ? 'neutral' : 'turquoise'}>{ETIQUETA_ROL[u.rol]}</Tag>
            </View>
          </GlassPanel>
        ))
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  entrada: { flex: 1, ...typography.bodyLg, color: colors.textStrong, paddingVertical: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter },
  textos: { flex: 1 },
  nombre: { ...typography.titleMd, color: colors.textStrong },
  meta: { ...typography.labelMd, color: colors.textMuted },
});
