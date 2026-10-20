import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ChipEstadoTicket, ChipPrioridad } from '../components/ChipsTicket';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { PantallaApilada } from '../components/PantallaApilada';
import { Overline } from '../components/ScreenHeader';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { Tag } from '../components/Tag';
import { TextField } from '../components/TextField';
import { useAsync } from '../hooks/useAsync';
import type { AppScreenProps } from '../navigation/types';
import { mensajeDeError } from '../services/api';
import { actualizarTicket, comentarTicket, obtenerTicket } from '../services/tickets';
import type { ComentarioTicket, EstadoTicket, PrioridadTicket } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { colors, spacing, typography } from '../theme';
import { formatearFechaHora } from '../utils/fecha';
import {
  ESTADOS_TICKET,
  ETIQUETA_CATEGORIA_TICKET,
  ETIQUETA_ESTADO_TICKET,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_ROL,
  PRIORIDADES_TICKET,
} from '../utils/tickets';

function autorDe(c: ComentarioTicket): string {
  if (c.autor.esYo) return 'Tú';
  if (c.autor.nombre) return c.autor.rol && c.autor.rol !== 'turista' ? `${c.autor.nombre} (${ETIQUETA_ROL[c.autor.rol]})` : c.autor.nombre;
  return 'Equipo de soporte';
}

/** Detalle de un ticket: datos, comentarios y, para técnico/administrador, estado, prioridad y asignación. */
export function TicketDetalleScreen({ navigation, route }: AppScreenProps<'TicketDetalle'>) {
  const { id } = route.params;
  const { rol, sesion } = useAuth();
  const esPersonal = rol === 'tecnico' || rol === 'administrador';
  const { datos: t, error, cargando, refrescando, recargar } = useAsync(() => obtenerTicket(id), [id]);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cambiar = async (cambios: { estado?: EstadoTicket; prioridad?: PrioridadTicket; idTecnico?: string | null }) => {
    setGuardando(true);
    try {
      await actualizarTicket(id, cambios);
      recargar();
    } catch (e) {
      Alert.alert('No se pudo actualizar', mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const enviarComentario = async () => {
    const texto = comentario.trim();
    if (!texto) return;
    setEnviando(true);
    try {
      await comentarTicket(id, texto);
      setComentario('');
      recargar();
    } catch (e) {
      Alert.alert('No se pudo enviar', mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaApilada titulo={`Ticket #${id}`} conVolver refrescando={refrescando} onRefrescar={recargar}>
      {cargando ? (
        <EstadoCargando mensaje="Cargando ticket…" />
      ) : !t ? (
        <EstadoError error={error} onReintentar={recargar} />
      ) : (
        <>
          <GlassPanel tono="strong" radius={20}>
            <Text style={styles.asunto}>{t.asunto}</Text>
            <View style={styles.etiquetas}>
              <ChipEstadoTicket estado={t.estado} />
              <ChipPrioridad prioridad={t.prioridad} />
              <Tag>{ETIQUETA_CATEGORIA_TICKET[t.categoria]}</Tag>
            </View>
            <Text style={styles.descripcion}>{t.descripcion}</Text>
            {t.destino && <Text style={styles.meta}>Destino: {t.destino.nombre}</Text>}
            <Text style={styles.meta}>
              Reportado {formatearFechaHora(t.fechaCreacion)}
              {esPersonal && t.creador.nombre ? ` por ${t.creador.nombre}` : ''}
            </Text>
            <Text style={styles.meta}>{t.tecnico ? `Asignado a ${t.tecnico.nombre ?? 'un técnico'}` : 'Sin asignar'}</Text>
            {t.fechaCierre && <Text style={styles.meta}>Cerrado {formatearFechaHora(t.fechaCierre)}</Text>}
          </GlassPanel>

          {esPersonal && (
            <GlassPanel tono="strong" radius={20} style={styles.gestion}>
              <Overline>ESTADO</Overline>
              <View style={styles.chips}>
                {ESTADOS_TICKET.map((e) => (
                  <FilterChip key={e} compacto activo={t.estado === e} onPress={() => t.estado !== e && void cambiar({ estado: e })}>
                    {ETIQUETA_ESTADO_TICKET[e]}
                  </FilterChip>
                ))}
              </View>
              <Overline>PRIORIDAD</Overline>
              <View style={styles.chips}>
                {PRIORIDADES_TICKET.map((p) => (
                  <FilterChip key={p} compacto acento="turquoise" activo={t.prioridad === p} onPress={() => t.prioridad !== p && void cambiar({ prioridad: p })}>
                    {ETIQUETA_PRIORIDAD[p]}
                  </FilterChip>
                ))}
              </View>
              {sesion && t.tecnico?.id !== sesion.user.id ? (
                <Button variante="glass" icono="person-add" cargando={guardando} onPress={() => void cambiar({ idTecnico: sesion.user.id })}>
                  Asignármelo
                </Button>
              ) : t.tecnico ? (
                <Button variante="glass" icono="person-remove" cargando={guardando} onPress={() => void cambiar({ idTecnico: null })}>
                  Quitar asignación
                </Button>
              ) : null}
            </GlassPanel>
          )}

          <Overline>COMENTARIOS</Overline>
          {t.comentarios.length === 0 ? (
            <Text style={styles.meta}>Aún no hay comentarios.</Text>
          ) : (
            t.comentarios.map((c) => (
              <GlassPanel key={c.id} tono={c.autor.esYo ? 'normal' : 'strong'} radius={16} padding={12}>
                <Text style={styles.autor}>
                  {autorDe(c)} · {formatearFechaHora(c.fecha)}
                </Text>
                <Text style={styles.comentario}>{c.comentario}</Text>
              </GlassPanel>
            ))
          )}
          <TextField
            etiqueta="Agregar un comentario"
            value={comentario}
            onChangeText={setComentario}
            multiline
            maxLength={2000}
            placeholder={esPersonal ? 'Respuesta para quien reportó…' : 'Agrega detalles o responde al equipo…'}
          />
          <Button icono="send" cargando={enviando} deshabilitado={!comentario.trim()} onPress={() => void enviarComentario()}>
            Enviar comentario
          </Button>
        </>
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  asunto: { ...typography.headlineSm, color: colors.textStrong },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  descripcion: { ...typography.bodyLg, color: colors.textBody, marginBottom: spacing.sm },
  meta: { ...typography.labelMd, color: colors.textMuted, marginTop: 2 },
  gestion: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  autor: { ...typography.labelBold, color: colors.textMuted },
  comentario: { ...typography.bodyMd, color: colors.textStrong, marginTop: 4 },
});
