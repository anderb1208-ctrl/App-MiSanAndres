import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ScreenBackground } from './components/ScreenBackground';
import { EstadoCargando, EstadoMensaje } from './components/StateView';
import { RootNavigator } from './navigation/RootNavigator';
import { configuracionValida, erroresConfiguracion } from './config/env';
import { AuthProvider } from './store/AuthContext';
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
        <NavigationContainer theme={temaNavegacion}>
          <RootNavigator />
        </NavigationContainer>
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
