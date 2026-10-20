import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { GlassPanel } from '../components/GlassPanel';
import { RangoPresupuesto } from '../components/RangoPresupuesto';
import { BotonVolver } from '../components/BotonVolver';
import { EncabezadoPantalla } from '../components/EncabezadoPantalla';
import { Overline } from '../components/ScreenHeader';
import { ScreenBackground } from '../components/ScreenBackground';
import { SelectRow } from '../components/SelectRow';
import { EstadoCargando, EstadoError } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { useBarraEstado } from '../hooks/useBarraEstado';
import { mensajeDeError } from '../services/api';
import { guardarPreferencias, obtenerCatalogo, obtenerPreferencias, restablecerPreferencias } from '../services/preferencias';
import type { CategoriaDestino, ItemCatalogo, NivelOcupacion, Preferencias } from '../services/tipos';
import { useAuth } from '../store/AuthContext';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { CATEGORIAS, ICONOS_PREFERENCIA, type NombreIcono } from '../utils/categorias';
import { OPCIONES_NIVEL } from '../utils/ocupacion';
import { PRESUPUESTO_INICIAL } from '../utils/presupuesto';

const VACIAS: Preferencias = {
  categorias: [],
  tiposExperiencia: [],
  tiposGrupo: [],
  nivelOcupacion: null,
  presupuestoMin: null,
  presupuestoMax: null,
};

async function cargar() {
  const [catalogo, preferencias] = await Promise.all([obtenerCatalogo(), obtenerPreferencias()]);
  return { catalogo, preferencias };
}

const alternar = (lista: string[], codigo: string) =>
  lista.includes(codigo) ? lista.filter((c) => c !== codigo) : [...lista, codigo];

const iconoCategoria = (codigo: string): NombreIcono =>
  CATEGORIAS[codigo as CategoriaDestino]?.icono ?? 'label';

interface Props {
  /** Primera configuración después del registro (sin volver atrás). */
  onboarding?: boolean;
}

/** Configuración de preferencias (onboarding) y edición desde el perfil. */
export function PreferenciasScreen({ onboarding = false }: Props) {
  useBarraEstado('dark');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { completarOnboarding, cerrarSesion } = useAuth();
  const { datos, error, cargando, recargar } = useAsync(cargar, []);

  const [seleccion, setSeleccion] = useState<Preferencias>(VACIAS);
  const [errorCategorias, setErrorCategorias] = useState<string>();
  const [errorGuardado, setErrorGuardado] = useState<string>();
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (datos) setSeleccion(datos.preferencias);
  }, [datos]);

  const cambiar = (cambio: Partial<Preferencias>) => {
    setSeleccion((s) => ({ ...s, ...cambio }));
    setGuardado(false);
    setErrorGuardado(undefined);
    if (cambio.categorias?.length) setErrorCategorias(undefined);
  };

  const guardar = async () => {
    if (seleccion.categorias.length === 0) {
      setErrorCategorias('Selecciona al menos una categoría.');
      return;
    }
    setGuardando(true);
    setErrorGuardado(undefined);
    try {
      const guardadas = await guardarPreferencias(seleccion);
      setSeleccion(guardadas);
      if (onboarding) {
        completarOnboarding();
        return;
      }
      setGuardado(true);
      setTimeout(() => navigation.canGoBack() && navigation.goBack(), 700);
    } catch (e) {
      setErrorGuardado(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarRestablecer = () =>
    Alert.alert('Restablecer preferencias', 'Se borrarán todas tus preferencias. Dejarás de recibir recomendaciones hasta que las configures de nuevo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restablecer',
        style: 'destructive',
        onPress: async () => {
          try {
            await restablecerPreferencias();
            setSeleccion(VACIAS);
            setGuardado(false);
          } catch (e) {
            setErrorGuardado(mensajeDeError(e));
          }
        },
      },
    ]);

  const grupoChecks = (items: ItemCatalogo[], seleccionados: string[], alCambiar: (codigo: string) => void, icono: (c: string) => NombreIcono) => (
    <GlassPanel tono="strong" padding={0} radius={radius.xl} style={styles.grupo}>
      {items.map((item, i) => {
        const marcado = seleccionados.includes(item.codigo);
        return (
          <SelectRow
            key={item.codigo}
            icono={icono(item.codigo)}
            tonoIcono={marcado ? 'turquoise' : 'neutral'}
            etiqueta={item.nombre}
            descripcion={item.descripcion ?? undefined}
            marcado={marcado}
            onPress={() => alCambiar(item.codigo)}
            divisor={i < items.length - 1}
          />
        );
      })}
    </GlassPanel>
  );

  const cuerpo = () => {
    if (cargando) return <EstadoCargando mensaje="Cargando preferencias…" />;
    if (!datos) return <EstadoError error={error} onReintentar={recargar} />;
    const { catalogo } = datos;
    const conPresupuesto = seleccion.presupuestoMin !== null && seleccion.presupuestoMax !== null;

    return (
      <View style={styles.cuerpo}>
        <Overline>Categorías de interés</Overline>
        {errorCategorias ? <Text style={styles.error}>{errorCategorias}</Text> : null}
        {grupoChecks(catalogo.categorias, seleccion.categorias, (c) => cambiar({ categorias: alternar(seleccion.categorias, c) }), iconoCategoria)}

        <Overline>Tipo de experiencia</Overline>
        {grupoChecks(
          catalogo.experiencias,
          seleccion.tiposExperiencia,
          (c) => cambiar({ tiposExperiencia: alternar(seleccion.tiposExperiencia, c) }),
          (c) => ICONOS_PREFERENCIA[c] ?? 'label',
        )}

        <Overline>¿Con quién viajas?</Overline>
        {grupoChecks(
          catalogo.grupos,
          seleccion.tiposGrupo,
          (c) => cambiar({ tiposGrupo: alternar(seleccion.tiposGrupo, c) }),
          (c) => ICONOS_PREFERENCIA[c] ?? 'label',
        )}

        <Overline>Nivel de ocupación preferido</Overline>
        <GlassPanel tono="strong" padding={0} radius={radius.xl} style={styles.grupo}>
          {OPCIONES_NIVEL.map((o, i) => (
            <SelectRow
              key={o.nivel}
              icono={o.icono as NombreIcono}
              tonoIcono={o.nivel}
              etiqueta={o.titulo}
              descripcion={o.descripcion}
              control="radio"
              marcado={seleccion.nivelOcupacion === o.nivel}
              onPress={() =>
                cambiar({ nivelOcupacion: seleccion.nivelOcupacion === o.nivel ? null : (o.nivel as NivelOcupacion) })
              }
              divisor={i < OPCIONES_NIVEL.length - 1}
            />
          ))}
        </GlassPanel>
        <Text style={styles.ayuda}>Opcional. Toca de nuevo la opción elegida para quitarla.</Text>

        <Overline>Presupuesto</Overline>
        <GlassPanel tono="strong" padding={0} radius={radius.xl} style={styles.grupo}>
          <SelectRow
            icono="payments"
            tonoIcono={conPresupuesto ? 'turquoise' : 'neutral'}
            etiqueta="Tener en cuenta mi presupuesto"
            descripcion="Por persona por visita: entrada, tour o consumo típico."
            marcado={conPresupuesto}
            onPress={() =>
              cambiar(
                conPresupuesto
                  ? { presupuestoMin: null, presupuestoMax: null }
                  : { presupuestoMin: PRESUPUESTO_INICIAL.minCop, presupuestoMax: PRESUPUESTO_INICIAL.maxCop },
              )
            }
            divisor={conPresupuesto}
          />
          {conPresupuesto && (
            <RangoPresupuesto
              valor={{ minCop: seleccion.presupuestoMin ?? 0, maxCop: seleccion.presupuestoMax ?? 0 }}
              onCambioFinal={(p) => cambiar({ presupuestoMin: p.minCop, presupuestoMax: p.maxCop })}
              style={styles.rango}
            />
          )}
        </GlassPanel>
        <Text style={styles.ayuda}>Los precios de los destinos son aproximados y se marcan como "Estimado".</Text>

        {!onboarding && (
          <Text style={styles.enlacePeligro} onPress={confirmarRestablecer} accessibilityRole="button">
            Restablecer preferencias
          </Text>
        )}
        {onboarding && (
          <Text style={styles.enlace} onPress={() => void cerrarSesion()} accessibilityRole="button">
            Cerrar sesión
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
          <EncabezadoPantalla
            titulo={onboarding ? 'Configura tus preferencias' : 'Editar preferencias'}
            subtitulo={
              onboarding
                ? 'Cuéntanos qué te gusta para recomendarte destinos.'
                : 'Cuéntanos qué te gusta para mejorar tus recomendaciones.'
            }
            conBotonVolver={!onboarding}
          />
          {cuerpo()}
        </ScrollView>
      </SafeAreaView>
      {!onboarding && <BotonVolver />}

      {datos && (
        <View style={[styles.barra, shadows.lg, { bottom: Math.max(insets.bottom, spacing.gutter) + 6 }]}>
          {errorGuardado ? <Text style={styles.errorBarra}>{errorGuardado}</Text> : null}
          <Button
            tamano="lg"
            anchoCompleto
            cargando={guardando}
            variante={guardado ? 'secondary' : 'primary'}
            icono={guardado ? 'check' : undefined}
            onPress={guardar}
            style={styles.botonBarra}
          >
            {guardado ? 'Cambios guardados' : onboarding ? 'Continuar' : 'Guardar cambios'}
          </Button>
        </View>
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cuerpo: { paddingHorizontal: spacing.screen, gap: spacing.gutter },
  grupo: { overflow: 'hidden', marginBottom: spacing.sm },
  rango: { padding: spacing.md },
  error: { ...typography.labelMd, color: colors.error },
  ayuda: { ...typography.labelMd, color: colors.textMuted, marginTop: -spacing.xs },
  enlacePeligro: { ...typography.labelBold, fontSize: 14, color: colors.error, textAlign: 'center', marginTop: spacing.lg },
  enlace: { ...typography.labelBold, fontSize: 14, color: colors.textLink, textAlign: 'center', marginTop: spacing.lg },
  barra: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    padding: 10,
    gap: spacing.sm,
    borderRadius: radius.sheet,
    backgroundColor: colors.glassBar,
    borderWidth: 1,
    borderColor: colors.glassBarBorder,
  },
  errorBarra: { ...typography.labelMd, color: colors.error, textAlign: 'center' },
  botonBarra: { borderRadius: radius.panel },
});
