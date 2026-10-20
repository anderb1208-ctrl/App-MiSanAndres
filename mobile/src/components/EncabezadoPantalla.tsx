import { StyleSheet, Text, View } from 'react-native';
import type { Rol } from '../services/tipos';
import { colors, spacing, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { ETIQUETA_ROL, ICONO_ROL } from '../utils/tickets';
import { SANGRIA_BOTON_VOLVER } from './BotonVolver';
import { IconButton } from './IconButton';
import { Tag } from './Tag';

interface Accion {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
}

interface Props {
  /** Título grande ("Mi perfil", "Usuarios"). Se ignora si hay saludo. */
  titulo?: string;
  /** Pantalla de inicio de un rol: "Hola, [nombre]" con la etiqueta del rol. */
  saludo?: { nombre: string | null | undefined; rol: Rol };
  subtitulo?: string;
  /** Deja libre la esquina izquierda para el BotonVolver flotante. */
  conBotonVolver?: boolean;
  acciones?: Accion[];
}

/**
 * Encabezado de pantalla común a todos los roles: título o saludo con la etiqueta del rol,
 * subtítulo y acciones como botones circulares planos (44 px, sin caja blanca).
 */
export function EncabezadoPantalla({ titulo, saludo, subtitulo, conBotonVolver = false, acciones = [] }: Props) {
  return (
    <View style={[styles.contenedor, conBotonVolver && styles.conBotonVolver]}>
      <View style={styles.textos}>
        <Text style={styles.titulo} accessibilityRole="header" numberOfLines={2}>
          {saludo ? (saludo.nombre ? `Hola, ${saludo.nombre}` : 'Hola') : titulo}
        </Text>
        {saludo && (
          <View style={styles.rol}>
            <Tag icono={ICONO_ROL[saludo.rol]} tono={saludo.rol === 'turista' ? 'neutral' : 'turquoise'}>
              {ETIQUETA_ROL[saludo.rol]}
            </Tag>
          </View>
        )}
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {acciones.map((a) => (
        <IconButton key={a.etiqueta} icono={a.icono} etiqueta={a.etiqueta} tono="tonal" onPress={a.onPress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.gutter,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  // El título empieza después del botón flotante (20 + 44 + 12) y queda centrado con él.
  conBotonVolver: { paddingLeft: spacing.screen + SANGRIA_BOTON_VOLVER, minHeight: 44 + spacing.sm + spacing.md },
  textos: { flex: 1, gap: 4 },
  titulo: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong },
  rol: { flexDirection: 'row' },
  subtitulo: { ...typography.bodyMd, color: colors.textMuted },
});
