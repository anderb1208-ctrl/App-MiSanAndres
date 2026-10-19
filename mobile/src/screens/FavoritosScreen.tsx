import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { BotonAlertas } from '../components/BotonAlertas';
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
        <View style={styles.aviso} accessibilityRole="alert">
          <View style={styles.avisoFila}>
            <Icon name="notifications-off" size={20} color={colors.error} />
            <Text style={styles.avisoTexto}>{avisoPermiso}</Text>
          </View>
          <Button variante="light" icono="settings" style={styles.avisoBoton} onPress={() => void Linking.openSettings().catch(() => undefined)}>
            Abrir ajustes
          </Button>
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
        visibles.map((f) => {
          const resumen = resumenAvisos(f.avisarApertura, f.avisarCierre);
          const abrirAlertas = () => setAlertas(f.destino);
          return (
            <DestinoCard
              key={f.idDestino}
              destino={f.destino!}
              nota={resumen}
              onPress={() => navigation.navigate('DetalleDestino', { id: f.idDestino })}
              accion={{
                etiqueta: 'Alertas',
                onPress: abrirAlertas,
                elemento: <BotonAlertas activo={f.avisarApertura || f.avisarCierre} resumen={resumen} onPress={abrirAlertas} />,
              }}
            />
          );
        })
      )}
      <HojaAlertas destino={alertas} onCerrar={() => setAlertas(null)} />
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  aviso: { gap: spacing.gutter, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.errorContainer, borderWidth: 1, borderColor: colors.errorBorder },
  avisoFila: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  avisoTexto: { ...typography.bodyMd, color: colors.textStrong, flex: 1 },
  avisoBoton: { alignSelf: 'flex-start' },
});
