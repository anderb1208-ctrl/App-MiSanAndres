import { StyleSheet, Text, View } from 'react-native';
import type { Ticket } from '../services/tipos';
import { colors, spacing, typography } from '../theme';
import { haceTiempo } from '../utils/panelTecnico';
import { ETIQUETA_CATEGORIA_TICKET, ETIQUETA_ESTADO_TICKET, ETIQUETA_PRIORIDAD, ICONO_ESTADO_TICKET } from '../utils/tickets';
import { ChipEstadoTicket, ChipPrioridad } from './ChipsTicket';
import { GlassPanel } from './GlassPanel';
import { Icon } from './Icon';

interface Props {
  ticket: Ticket;
  onPress: () => void;
  /** Personal (técnico y administrador): muestra quién lo reportó. */
  mostrarCreador?: boolean;
}

/**
 * Fila de un ticket: asunto, categoría y destino, chips de prioridad y estado, y "hace X horas".
 * Tarjeta translúcida simple (sin desenfoque ni Liquid Glass): va en listas largas.
 */
export function TarjetaTicket({ ticket, onPress, mostrarCreador = false }: Props) {
  const asignado = ticket.tecnico ? `Asignado a ${ticket.tecnico.nombre ?? 'un técnico'}` : 'Sin asignar';
  return (
    <GlassPanel
      tono="strong"
      calidad="ligera"
      radius={16}
      padding={14}
      onPress={onPress}
      accessibilityLabel={`Ticket ${ticket.id}: ${ticket.asunto}. ${ETIQUETA_ESTADO_TICKET[ticket.estado]}, prioridad ${ETIQUETA_PRIORIDAD[ticket.prioridad].toLowerCase()}. ${ETIQUETA_CATEGORIA_TICKET[ticket.categoria]}${ticket.destino ? `, ${ticket.destino.nombre}` : ''}. Creado ${haceTiempo(ticket.fechaCreacion)}. ${asignado}`}
    >
      <View style={styles.filaSuperior}>
        <Icon name={ICONO_ESTADO_TICKET[ticket.estado]} size={18} color={colors.secondary} />
        <Text style={styles.asunto} numberOfLines={2}>
          {ticket.asunto}
        </Text>
        <Text style={styles.numero}>#{ticket.id}</Text>
      </View>
      <Text style={styles.meta}>
        {ETIQUETA_CATEGORIA_TICKET[ticket.categoria]}
        {ticket.destino ? ` · ${ticket.destino.nombre}` : ''}
      </Text>
      <View style={styles.chips}>
        <ChipPrioridad prioridad={ticket.prioridad} tamano="sm" />
        <ChipEstadoTicket estado={ticket.estado} tamano="sm" />
      </View>
      <Text style={styles.pie}>
        {haceTiempo(ticket.fechaCreacion)}
        {mostrarCreador && ticket.creador.nombre ? ` · ${ticket.creador.nombre}` : ''}
        {mostrarCreador ? ` · ${asignado}` : ''}
      </Text>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  filaSuperior: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  asunto: { ...typography.titleMd, color: colors.textStrong, flex: 1 },
  numero: { ...typography.labelMd, color: colors.textMuted, marginTop: 3 },
  meta: { ...typography.bodyMd, color: colors.textMuted, marginTop: 4 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  pie: { ...typography.labelMd, color: colors.textMuted, marginTop: spacing.sm },
});
