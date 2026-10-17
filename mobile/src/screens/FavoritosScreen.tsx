import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { DestinoCard } from '../components/DestinoCard';
import { GlassPanel } from '../components/GlassPanel';
import { HojaAlertas } from '../components/HojaAlertas';
import { Icon } from '../components/Icon';
import { PantallaApilada } from '../components/PantallaApilada';
import { EstadoCargando, EstadoMensaje } from '../components/StateView';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import type { Destino } from '../services/tipos';
import { useFavoritos } from '../store/FavoritosContext';
import { colors, radius, spacing, typography } from '../theme';

function resumenAvisos(apertura: boolean, cierre: boolean): string {
  if (apertura && cierre) return 'Te avisamos cuando abra y cuando cierre';
  if (apertura) return 'Te avisamos cuando abra';
  if (cierre) return 'Te avisamos cuando cierre';
  return 'Sin avisos';
}

/** Pestaña Favoritos: destinos guardados y sus alertas. */
export function FavoritosScreen({ navigation }: TabScreenProps<'Favoritos'>) {
  const espacio = useEspacioTabBar();
  const { favoritos, cargando, recargar, avisoPermiso } = useFavoritos();
  const [alertas, setAlertas] = useState<Destino | null>(null);
  const visibles = favoritos.filter((f) => f.destino);

  return (
    <PantallaApilada
      titulo="Favoritos"
      subtitulo="Tus lugares guardados y sus avisos"
      espacioInferior={espacio}
      refrescando={cargando && favoritos.length > 0}
      onRefrescar={() => void recargar().catch(() => undefined)}
    >
      {avisoPermiso && (
        <View style={styles.aviso}>
          <Icon name="notifications-off" size={18} color={colors.error} />
          <Text style={styles.avisoTexto}>{avisoPermiso}</Text>
        </View>
      )}
      {cargando && favoritos.length === 0 ? (
        <EstadoCargando mensaje="Cargando favoritos…" />
      ) : visibles.length === 0 ? (
        <GlassPanel tono="strong" radius={20}>
          <EstadoMensaje
            icono="favorite-border"
            titulo="Aún no tienes favoritos"
            mensaje="Toca el corazón de un destino para guardarlo y recibir avisos cuando abra o cierre."
            accion={{ texto: 'Explorar destinos', onPress: () => navigation.navigate('Explorar') }}
          />
        </GlassPanel>
      ) : (
        visibles.map((f) => (
          <View key={f.idDestino} style={styles.item}>
            <DestinoCard
              destino={f.destino!}
              nota={resumenAvisos(f.avisarApertura, f.avisarCierre)}
              onPress={() => navigation.navigate('DetalleDestino', { id: f.idDestino })}
            />
            <Button variante="glass" icono="notifications-active" onPress={() => setAlertas(f.destino)}>
              Alertas
            </Button>
          </View>
        ))
      )}
      <HojaAlertas destino={alertas} onCerrar={() => setAlertas(null)} />
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  item: { gap: spacing.sm },
  aviso: { flexDirection: 'row', gap: spacing.sm, padding: spacing.gutter, borderRadius: radius.lg, backgroundColor: colors.errorContainer },
  avisoTexto: { ...typography.labelMd, color: colors.textStrong, flex: 1 },
});
