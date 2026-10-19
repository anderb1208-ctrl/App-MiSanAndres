import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { FilterChip } from '../components/FilterChip';
import { GlassPanel } from '../components/GlassPanel';
import { PantallaApilada } from '../components/PantallaApilada';
import { SelectRow } from '../components/SelectRow';
import { EstadoCargando, EstadoError, EstadoMensaje } from '../components/StateView';
import type { AppScreenProps } from '../navigation/types';
import { mensajeDeError } from '../services/api';
import { borrarHistorial, obtenerHistorial } from '../services/historial';
import type { FiltroHistorial, ItemHistorial } from '../services/tipos';
import { colors, spacing, typography } from '../theme';
import { CATEGORIAS } from '../utils/categorias';
import { formatearFechaHora } from '../utils/fecha';
import { FILTROS_HISTORIAL, seccionesPorDia, textoItem, unirPaginas } from '../utils/historial';

interface Estado {
  items: ItemHistorial[];
  pagina: number;
  hayMas: boolean;
  total: number;
}

const VACIO: Record<FiltroHistorial, { titulo: string; mensaje: string }> = {
  recientes: { titulo: 'Aún no hay actividad', mensaje: 'Los destinos que abras aparecerán aquí.' },
  semana: { titulo: 'Nada en la última semana', mensaje: 'Los destinos que abras estos días aparecerán aquí.' },
  mes: { titulo: 'Nada en el último mes', mensaje: 'Los destinos que abras este mes aparecerán aquí.' },
  mas_vistos: { titulo: 'Aún no hay destinos', mensaje: 'Los que más consultes aparecerán primero.' },
  populares: { titulo: 'Sin datos todavía', mensaje: 'Cuando más viajeros usen la app verás aquí lo más consultado.' },
};

/** Historial con filtros: recientes, última semana, último mes, más vistos y populares. */
export function HistorialScreen({ navigation }: AppScreenProps<'Historial'>) {
  const [filtro, setFiltro] = useState<FiltroHistorial>('recientes');
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [borrando, setBorrando] = useState(false);
  // Evita que una respuesta de un filtro anterior pise la del filtro actual.
  const pedido = useRef(0);

  const cargar = useCallback(async (f: FiltroHistorial, pagina: number) => {
    const id = ++pedido.current;
    if (pagina === 1) setCargando(true);
    else setCargandoMas(true);
    try {
      const r = await obtenerHistorial(f, pagina);
      if (id !== pedido.current) return;
      setEstado((previo) => ({
        items: pagina === 1 || !previo ? r.items : unirPaginas(previo.items, r.items),
        pagina: r.pagina,
        hayMas: r.hayMas,
        total: r.total,
      }));
      setError(null);
    } catch (e) {
      if (id === pedido.current) setError(e);
    } finally {
      if (id === pedido.current) {
        setCargando(false);
        setCargandoMas(false);
      }
    }
  }, []);

  useEffect(() => {
    setEstado(null);
    void cargar(filtro, 1);
  }, [filtro, cargar]);

  const confirmarBorrado = () =>
    Alert.alert(
      'Borrar historial',
      'Se borrarán todos los destinos que has consultado. Tu pasaporte del viajero volverá a empezar. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            setBorrando(true);
            try {
              await borrarHistorial();
              await cargar(filtro, 1);
            } catch (e) {
              Alert.alert('No se pudo borrar', mensajeDeError(e));
            } finally {
              setBorrando(false);
            }
          },
        },
      ],
    );

  const items = estado?.items ?? [];
  const esPopulares = filtro === 'populares';
  const puedeBorrar = !esPopulares && items.length > 0;

  const contenido = () => {
    if (cargando && !estado) return <EstadoCargando mensaje="Cargando tu historial…" />;
    if (error && !estado) return <EstadoError error={error} onReintentar={() => void cargar(filtro, 1)} />;
    if (items.length === 0) {
      const vacio = VACIO[filtro];
      return (
        <GlassPanel tono="strong" radius={20}>
          <EstadoMensaje
            icono="history"
            titulo={vacio.titulo}
            mensaje={vacio.mensaje}
            accion={esPopulares ? undefined : { texto: 'Explorar destinos', onPress: () => navigation.navigate('Tabs', { screen: 'Explorar' }) }}
          />
        </GlassPanel>
      );
    }
    return seccionesPorDia(items).map((seccion) => (
      <View key={seccion.clave} style={styles.seccion}>
        {seccion.titulo && (
          <Text style={styles.encabezado} accessibilityRole="header">
            {seccion.titulo}
          </Text>
        )}
        <GlassPanel tono="strong" padding={0} radius={20} style={styles.lista}>
          {seccion.items.map((i, indice) => {
            const categoria = i.destino ? CATEGORIAS[i.destino.categoria] : null;
            const cuando = !esPopulares && i.ultimaVez && filtro === 'mas_vistos' ? ` · ${formatearFechaHora(i.ultimaVez)}` : '';
            return (
              <SelectRow
                key={`${i.dia ?? ''}-${i.idDestino}`}
                icono={categoria?.icono ?? 'place'}
                tonoIcono={esPopulares ? 'turquoise' : 'neutral'}
                etiqueta={`${esPopulares || filtro === 'mas_vistos' ? `${indice + 1}. ` : ''}${i.destino?.nombre ?? 'Destino no disponible'}`}
                descripcion={`${categoria ? `${categoria.singular} · ` : ''}${textoItem(i, filtro)}${cuando}`}
                control={i.destino ? 'chevron' : 'none'}
                onPress={i.destino ? () => navigation.navigate('DetalleDestino', { id: i.idDestino }) : undefined}
                divisor={indice < seccion.items.length - 1}
              />
            );
          })}
        </GlassPanel>
      </View>
    ));
  };

  return (
    <PantallaApilada
      titulo="Historial"
      subtitulo="Destinos que has consultado"
      onVolver={navigation.goBack}
      refrescando={cargando && Boolean(estado)}
      onRefrescar={() => void cargar(filtro, 1)}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTROS_HISTORIAL.map((f) => (
          <FilterChip key={f.valor} icono={f.icono} compacto activo={filtro === f.valor} onPress={() => setFiltro(f.valor)}>
            {f.etiqueta}
          </FilterChip>
        ))}
      </ScrollView>
      {esPopulares && (
        <Text style={styles.nota}>
          Lo más consultado por todos los viajeros en los últimos 30 días. Solo se muestran totales, sin datos de nadie.
        </Text>
      )}

      {contenido()}

      {estado?.hayMas && (
        <Button variante="glass" anchoCompleto cargando={cargandoMas} onPress={() => void cargar(filtro, estado.pagina + 1)}>
          Ver más
        </Button>
      )}

      {puedeBorrar && (
        <Button variante="danger" anchoCompleto icono="delete-outline" cargando={borrando} onPress={confirmarBorrado}>
          Borrar historial
        </Button>
      )}
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingRight: spacing.screen },
  nota: { ...typography.labelMd, color: colors.textMuted },
  seccion: { gap: spacing.sm },
  encabezado: { ...typography.labelBold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  lista: { overflow: 'hidden' },
});
