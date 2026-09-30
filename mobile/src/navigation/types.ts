import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Bienvenida: undefined;
  Login: { aviso?: string } | undefined;
  Registro: undefined;
};

export type TabsParamList = {
  Inicio: undefined;
  Explorar: undefined;
  /** destinoId: destino a resaltar al llegar desde el detalle. */
  Mapa: { destinoId?: number } | undefined;
  Perfil: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  DetalleDestino: { id: number };
  Preferencias: undefined;
};

export type OnboardingStackParamList = {
  Onboarding: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<AppStackParamList, T>;

export type TabScreenProps<T extends keyof TabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabsParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;
