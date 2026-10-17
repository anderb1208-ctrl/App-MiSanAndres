import { createNavigationContainerRef, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from './components/ScreenBackground';
import { EstadoCargando, EstadoMensaje } from './components/StateView';
import { RootNavigator } from './navigation/RootNavigator';
import type { AppStackParamList } from './navigation/types';
import { configurarNotificaciones, destinoDeRespuesta, escucharToques, ultimaRespuesta } from './services/notificaciones';
import { configuracionValida, erroresConfiguracion } from './config/env';
import { AuthProvider, useAuth } from './store/AuthContext';
import { FavoritosProvider } from './store/FavoritosContext';
import { colors, fontAssets } from './theme';

const temaNavegacion: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.secondary,
    background: colors.surfaceApp,
    card: colors.white,
    text: colors.textStrong,
    border: colors.borderCard,
  },
};

const navegacion = createNavigationContainerRef<AppStackParamList>();

/**
 * Al tocar una notificación (local o push) se abre el detalle del destino. Si la app estaba
 * cerrada o aún no hay sesión lista, el destino queda pendiente hasta que se pueda navegar.
 */
function ManejadorNotificaciones() {
  const { estado } = useAuth();
  const pendiente = useRef<number | null>(null);

  const abrir = (id: number) => {
    if (estado === 'lista' && navegacion.isReady()) navegacion.navigate('DetalleDestino', { id });
    else pendiente.current = id;
  };

  useEffect(() => {
    void configurarNotificaciones().catch(() => undefined);
    ultimaRespuesta()
      .then((r) => {
        const id = destinoDeRespuesta(r);
        if (id) pendiente.current = id;
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => escucharToques(abrir));

  useEffect(() => {
    if (estado === 'lista' && pendiente.current && navegacion.isReady()) {
      navegacion.navigate('DetalleDestino', { id: pendiente.current });
      pendiente.current = null;
    }
  }, [estado]);

  return null;
}

export default function App() {
  const [fuentesListas, errorFuentes] = useFonts(fontAssets);

  let contenido;
  if (!configuracionValida) {
    contenido = (
      <ScreenBackground>
        <SafeAreaView style={styles.centro}>
          <EstadoMensaje
            tono="danger"
            icono="settings"
            titulo="Falta configurar la app"
            mensaje={`${erroresConfiguracion.join(' ')} Luego reinicia Expo con npm run start:limpio.`}
          />
        </SafeAreaView>
      </ScreenBackground>
    );
  } else if (!fuentesListas && !errorFuentes) {
    // Si las fuentes fallan se sigue con la del sistema en vez de bloquear la app.
    contenido = (
      <ScreenBackground>
        <EstadoCargando style={styles.centro} />
      </ScreenBackground>
    );
  } else {
    contenido = (
      <AuthProvider>
        <FavoritosProvider>
          <NavigationContainer ref={navegacion} theme={temaNavegacion}>
            <RootNavigator />
            <ManejadorNotificaciones />
          </NavigationContainer>
        </FavoritosProvider>
      </AuthProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {contenido}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center' },
});
