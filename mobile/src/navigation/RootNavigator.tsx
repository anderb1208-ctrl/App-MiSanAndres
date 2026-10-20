import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ScreenBackground } from '../components/ScreenBackground';
import { EstadoCargando, EstadoMensaje } from '../components/StateView';
import { BienvenidaScreen } from '../screens/BienvenidaScreen';
import { CreditosScreen } from '../screens/CreditosScreen';
import { DestinosAdminScreen } from '../screens/DestinosAdminScreen';
import { EditarDestinoScreen } from '../screens/EditarDestinoScreen';
import { ModelosMlScreen } from '../screens/ModelosMlScreen';
import { NuevoTicketScreen } from '../screens/NuevoTicketScreen';
import { PanelScreen } from '../screens/PanelScreen';
import { TicketDetalleScreen } from '../screens/TicketDetalleScreen';
import { TicketsScreen } from '../screens/TicketsScreen';
import { HistorialScreen } from '../screens/HistorialScreen';
import { UsuariosAdminScreen } from '../screens/UsuariosAdminScreen';
import { DetalleDestinoScreen } from '../screens/DetalleDestinoScreen';
import { ExplorarScreen } from '../screens/ExplorarScreen';
import { FavoritosScreen } from '../screens/FavoritosScreen';
import { InicioScreen } from '../screens/InicioScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MapaScreen } from '../screens/MapaScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { PreferenciasScreen } from '../screens/PreferenciasScreen';
import { RegistroScreen } from '../screens/RegistroScreen';
import { useAuth } from '../store/AuthContext';
import { colors, spacing } from '../theme';
import { TabBar } from './TabBar';
import type { AppStackParamList, AuthStackParamList, OnboardingStackParamList, TabsParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

const sinEncabezado = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.surfaceApp },
} as const;

/**
 * Pestañas según el rol (el rol lo informa el backend). Ocultar pantallas es solo
 * comodidad: el backend y RLS rechazan lo que un rol no puede hacer.
 */
function TabsNavigator() {
  const { rol } = useAuth();
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      {rol === 'administrador' ? (
        <>
          <Tabs.Screen name="Panel" component={PanelScreen} />
          <Tabs.Screen name="Tickets" component={TicketsScreen} />
          <Tabs.Screen name="Destinos" component={DestinosAdminScreen} />
          <Tabs.Screen name="Usuarios" component={UsuariosAdminScreen} />
        </>
      ) : rol === 'tecnico' ? (
        <Tabs.Screen name="Tickets" component={TicketsScreen} />
      ) : (
        <>
          <Tabs.Screen name="Inicio" component={InicioScreen} />
          <Tabs.Screen name="Explorar" component={ExplorarScreen} />
          <Tabs.Screen name="Mapa" component={MapaScreen} />
          <Tabs.Screen name="Favoritos" component={FavoritosScreen} />
        </>
      )}
      <Tabs.Screen name="Perfil" component={PerfilScreen} />
    </Tabs.Navigator>
  );
}

function OnboardingPantalla() {
  return <PreferenciasScreen onboarding />;
}

/**
 * Elige el flujo según la sesión:
 * autenticación → (primer ingreso) configuración de preferencias → tabs y detalle.
 */
export function RootNavigator() {
  const { estado, mensajeError, aviso, reintentar, cerrarSesion } = useAuth();

  if (estado === 'cargando' || estado === 'verificando') {
    return (
      <ScreenBackground>
        <EstadoCargando style={styles.centro} mensaje="Preparando tu experiencia…" />
      </ScreenBackground>
    );
  }

  if (estado === 'error') {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.centro}>
          <EstadoMensaje
            tono="danger"
            icono="wifi-off"
            titulo="No pudimos cargar tu cuenta"
            mensaje={mensajeError ?? 'Intenta de nuevo en unos minutos.'}
            accion={{ texto: 'Reintentar', onPress: reintentar }}
          />
          <View style={styles.salir}>
            <Button variante="glass" icono="logout" onPress={() => void cerrarSesion()}>
              Cerrar sesión
            </Button>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (estado === 'sin_sesion') {
    return (
      // Con un aviso (sesión vencida) se abre directamente el login.
      <AuthStack.Navigator screenOptions={sinEncabezado} initialRouteName={aviso ? 'Login' : 'Bienvenida'}>
        <AuthStack.Screen name="Bienvenida" component={BienvenidaScreen} />
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Registro" component={RegistroScreen} />
      </AuthStack.Navigator>
    );
  }

  if (estado === 'onboarding') {
    return (
      <OnboardingStack.Navigator screenOptions={sinEncabezado}>
        <OnboardingStack.Screen name="Onboarding" component={OnboardingPantalla} />
      </OnboardingStack.Navigator>
    );
  }

  return (
    <AppStack.Navigator screenOptions={sinEncabezado}>
      <AppStack.Screen name="Tabs" component={TabsNavigator} />
      <AppStack.Screen name="DetalleDestino" component={DetalleDestinoScreen} />
      <AppStack.Screen name="Preferencias" component={PreferenciasScreen} />
      <AppStack.Screen name="Creditos" component={CreditosScreen} />
      <AppStack.Screen name="TicketDetalle" component={TicketDetalleScreen} />
      <AppStack.Screen name="NuevoTicket" component={NuevoTicketScreen} />
      <AppStack.Screen name="Historial" component={HistorialScreen} />
      <AppStack.Screen name="EditarDestino" component={EditarDestinoScreen} />
      <AppStack.Screen name="ModelosMl" component={ModelosMlScreen} />
    </AppStack.Navigator>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center' },
  salir: { alignItems: 'center', marginTop: -spacing.sm },
});
