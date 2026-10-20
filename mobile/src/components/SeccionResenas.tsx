import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAsync } from '../hooks/useAsync';
import { mensajeDeError } from '../services/api';
import { guardarResena, listarResenasAdmin, obtenerMiResena, obtenerResenas, ocultarResena } from '../services/resenas';
import type { Resena } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { colors, radius, spacing, typography } from '../theme';
import { Button } from './Button';
import { Estrellas } from './Estrellas';
import { GlassPanel } from './GlassPanel';
import { EstadoCargando } from './StateView';
import { TextField } from './TextField';

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' });

/** Promedio en texto: "4,3". */
const promedioTexto = (n: number) => n.toFixed(1).replace('.', ',');

interface Props {
  idDestino: number;
  /** Para avisar al detalle que cambió el promedio. */
  onCambio?: () => void;
}

/**
 * Reseñas del destino: promedio, lista y la reseña propia (turista). El administrador ve
 * también las ocultas y puede ocultarlas o volver a mostrarlas.
 */
export function SeccionResenas({ idDestino, onCambio }: Props) {
  const { rol, sesion } = useAuth();
  const esAdmin = rol === 'administrador';
  const puedeOpinar = Boolean(sesion) && rol === 'turista';

  const publicas = useAsync(() => obtenerResenas(idDestino), [idDestino]);
  const admin = useAsync(() => (esAdmin ? listarResenasAdmin(idDestino) : Promise.resolve(null)), [idDestino, esAdmin]);
  const mia = useAsync(() => (puedeOpinar ? obtenerMiResena(idDestino) : Promise.resolve(null)), [idDestino, puedeOpinar]);

  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setEstrellas(mia.datos?.estrellas ?? 0);
    setComentario(mia.datos?.comentario ?? '');
  }, [mia.datos]);

  const recargar = () => {
    publicas.recargar();
    admin.recargar();
    mia.recargar();
    onCambio?.();
  };

  const guardar = async () => {
    if (estrellas < 1) {
      setError('Elige de 1 a 5 estrellas.');
      return;
    }
    setGuardando(true);
    setError(undefined);
    try {
      await guardarResena(idDestino, estrellas, comentario.trim() || null);
      setEditando(false);
      recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const alternarOculta = async (r: Resena) => {
    try {
      await ocultarResena(r.id, !r.oculta);
      recargar();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  if (publicas.cargando) return <EstadoCargando mensaje="Cargando reseñas…" />;
  const calificacion = publicas.datos?.calificacion ?? null;
  const lista = (esAdmin ? admin.datos : null) ?? publicas.datos?.resenas ?? [];
  const formularioAbierto = puedeOpinar && (editando || !mia.datos);

  return (
    <View style={styles.contenedor}>
      {calificacion ? (
        <View style={styles.resumen}>
          <Text style={styles.promedio}>{promedioTexto(calificacion.promedio)}</Text>
          <View>
            <Estrellas valor={calificacion.promedio} />
            <Text style={styles.cantidad}>
              {calificacion.cantidad} {calificacion.cantidad === 1 ? 'reseña' : 'reseñas'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.vacio}>Aún no hay reseñas. {puedeOpinar ? '¡Sé el primero en opinar!' : ''}</Text>
      )}

      {puedeOpinar && mia.datos && !editando && (
        <GlassPanel tono="strong" radius={radius.lg} padding={spacing.gutter} style={styles.tarjeta}>
          <Text style={styles.autor}>Tu reseña</Text>
          <Estrellas valor={mia.datos.estrellas} />
          {mia.datos.comentario ? <Text style={styles.comentario}>{mia.datos.comentario}</Text> : null}
          {mia.datos.oculta ? <Text style={styles.oculta}>Un administrador ocultó esta reseña.</Text> : null}
          <Button variante="glass" icono="edit" onPress={() => setEditando(true)}>
            Editar mi reseña
          </Button>
        </GlassPanel>
      )}

      {formularioAbierto && (
        <GlassPanel tono="strong" radius={radius.lg} padding={spacing.gutter} style={styles.tarjeta}>
          <Text style={styles.autor}>{mia.datos ? 'Editar tu reseña' : '¿Ya lo visitaste?'}</Text>
          <Estrellas valor={estrellas} onCambio={setEstrellas} tamano={30} />
          <TextField
            etiqueta="Comentario (opcional)"
            value={comentario}
            onChangeText={setComentario}
            maxLength={1000}
            multiline
            placeholder="Cuéntales a otros viajeros cómo te fue"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button icono="send" cargando={guardando} onPress={guardar}>
            Publicar reseña
          </Button>
        </GlassPanel>
      )}

      {lista
        .filter((r) => !(puedeOpinar && r.esMia))
        .map((r) => (
          <View key={r.id} style={[styles.resena, r.oculta && styles.resenaOculta]}>
            <View style={styles.cabecera}>
              <Text style={styles.autor}>{r.autor ?? 'Viajero'}</Text>
              <Text style={styles.fecha}>{fecha(r.fecha)}</Text>
            </View>
            <Estrellas valor={r.estrellas} tamano={15} />
            {r.comentario ? <Text style={styles.comentario}>{r.comentario}</Text> : null}
            {esAdmin && (
              <Button variante={r.oculta ? 'glass' : 'danger'} icono={r.oculta ? 'visibility' : 'visibility-off'} onPress={() => void alternarOculta(r)}>
                {r.oculta ? 'Mostrar de nuevo' : 'Ocultar reseña'}
              </Button>
            )}
          </View>
        ))}
      {error && !formularioAbierto ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.gutter },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  promedio: { ...typography.display, color: colors.textStrong },
  cantidad: { ...typography.labelMd, color: colors.textMuted, marginTop: 2 },
  vacio: { ...typography.bodyMd, color: colors.textMuted },
  tarjeta: { gap: spacing.sm },
  resena: { gap: 4, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderCard },
  resenaOculta: { opacity: 0.55 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between' },
  autor: { ...typography.labelBold, color: colors.textStrong },
  fecha: { ...typography.labelMd, color: colors.textMuted },
  comentario: { ...typography.bodyMd, color: colors.textMuted },
  oculta: { ...typography.labelMd, color: colors.error },
  error: { ...typography.labelMd, color: colors.error },
});
