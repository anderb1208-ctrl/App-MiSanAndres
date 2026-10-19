import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { ControlSegmentado } from '../components/ControlSegmentado';
import { FilterChip } from '../components/FilterChip';
import { PantallaApilada } from '../components/PantallaApilada';
import { Overline } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { useAsync } from '../hooks/useAsync';
import type { AppScreenProps } from '../navigation/types';
import { mensajeDeError } from '../services/api';
import { listarDestinos } from '../services/destinos';
import { crearTicket } from '../services/tickets';
import type { CategoriaTicket, PrioridadTicket } from '../services/tipos';
import { colors, spacing, typography } from '../theme';
import { CATEGORIAS_TICKET, ETIQUETA_PRIORIDAD, PRIORIDADES_TICKET } from '../utils/tickets';
import { MisReportes } from './TicketsScreen';

type Pestana = 'nuevo' | 'mios';
const PESTANAS = [
  { valor: 'nuevo', etiqueta: 'Nuevo' },
  { valor: 'mios', etiqueta: 'Mis reportes' },
] as const;

/** "Reportar un problema": pestañas Nuevo (formulario) y Mis reportes (estado de lo reportado). */
export function NuevoTicketScreen({ navigation, route }: AppScreenProps<'NuevoTicket'>) {
  const destinoFijo = route.params?.idDestino;
  const [pestana, setPestana] = useState<Pestana>(route.params?.pestana ?? 'nuevo');
  const [categoria, setCategoria] = useState<CategoriaTicket>(destinoFijo ? 'informacion_incorrecta' : 'app');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState<PrioridadTicket>('media');
  const [idDestino, setIdDestino] = useState<number | null>(destinoFijo ?? null);
  const [verDestinos, setVerDestinos] = useState(false);
  const [errores, setErrores] = useState<{ asunto?: string; descripcion?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const destinos = useAsync(() => listarDestinos({}), []);
  const nombreDestino =
    route.params?.nombreDestino ?? destinos.datos?.find((d) => d.id === idDestino)?.nombre ?? null;

  const enviar = async () => {
    const nuevos = {
      asunto: asunto.trim().length < 3 ? 'Escribe un asunto de al menos 3 caracteres.' : undefined,
      descripcion: descripcion.trim().length < 5 ? 'Describe el problema (al menos 5 caracteres).' : undefined,
    };
    setErrores(nuevos);
    if (nuevos.asunto || nuevos.descripcion) return;
    setEnviando(true);
    try {
      const ticket = await crearTicket({ categoria, asunto: asunto.trim(), descripcion: descripcion.trim(), prioridad, idDestino });
      Alert.alert('¡Gracias por reportarlo!', 'El equipo lo revisará. Puedes seguir su estado en la pestaña "Mis reportes".');
      navigation.replace('TicketDetalle', { id: ticket.id });
    } catch (e) {
      Alert.alert('No se pudo enviar', mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PantallaApilada
      titulo="Reportar un problema"
      subtitulo={pestana === 'nuevo' ? 'Cuéntanos qué pasó' : 'Lo que reportaste y su estado'}
      onVolver={navigation.goBack}
    >
      <ControlSegmentado opciones={PESTANAS} valor={pestana} onCambiar={setPestana} etiquetaAccesible="Reportar un problema" />
      {pestana === 'mios' ? (
        <MisReportes onAbrir={(id) => navigation.navigate('TicketDetalle', { id })} onNuevo={() => setPestana('nuevo')} />
      ) : (
      <>
      <Overline>TIPO DE PROBLEMA</Overline>
      <View style={styles.chips}>
        {CATEGORIAS_TICKET.map((c) => (
          <FilterChip key={c.valor} icono={c.icono} compacto activo={categoria === c.valor} onPress={() => setCategoria(c.valor)}>
            {c.etiqueta}
          </FilterChip>
        ))}
      </View>

      <TextField etiqueta="Asunto" value={asunto} onChangeText={setAsunto} maxLength={120} error={errores.asunto} placeholder="Ej.: el horario de un cayo está mal" />
      <TextField
        etiqueta="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        maxLength={2000}
        error={errores.descripcion}
        placeholder="Qué viste, dónde y cuándo"
      />

      <Overline>DESTINO (OPCIONAL)</Overline>
      {destinoFijo ? (
        <Text style={styles.texto}>{nombreDestino ?? `Destino #${destinoFijo}`}</Text>
      ) : (
        <>
          <FilterChip icono="place" activo={idDestino !== null} onPress={() => setVerDestinos(!verDestinos)}>
            {idDestino !== null ? (nombreDestino ?? 'Destino elegido') : 'Elegir un destino'}
          </FilterChip>
          {verDestinos && (
            <View style={styles.chips}>
              {idDestino !== null && (
                <FilterChip compacto activo={false} acento="turquoise" onPress={() => setIdDestino(null)}>
                  Ninguno
                </FilterChip>
              )}
              {(destinos.datos ?? []).map((d) => (
                <FilterChip
                  key={d.id}
                  compacto
                  activo={idDestino === d.id}
                  onPress={() => {
                    setIdDestino(d.id);
                    setVerDestinos(false);
                  }}
                >
                  {d.nombre}
                </FilterChip>
              ))}
            </View>
          )}
        </>
      )}

      <Overline>PRIORIDAD</Overline>
      <View style={styles.chips}>
        {PRIORIDADES_TICKET.map((p) => (
          <FilterChip key={p} compacto acento="turquoise" activo={prioridad === p} onPress={() => setPrioridad(p)}>
            {ETIQUETA_PRIORIDAD[p]}
          </FilterChip>
        ))}
      </View>

      <Button tamano="lg" anchoCompleto icono="send" cargando={enviando} onPress={() => void enviar()}>
        Enviar reporte
      </Button>
      </>
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  texto: { ...typography.bodyLg, color: colors.textStrong },
});
