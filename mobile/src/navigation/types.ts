import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CategoriaDestino, EstadoDestino, EstadoTicket, PrioridadTicket } from '../services/tipos';
import type { GrupoOcupacion } from '../utils/resumenOcupacion';

export type AuthStackParamList = {
  Bienvenida: undefined;
  Login: { aviso?: string } | undefined;
  Registro: undefined;
};

/**
 * Todas las pestañas posibles; cada rol muestra solo las suyas (RootNavigator):
 * turista: Inicio, Explorar, Mapa, Favoritos, Perfil · técnico: Inicio (su panel), Tickets, Perfil ·
 * administrador: Panel, Tickets, Destinos, Usuarios, Perfil.
 */
export type TabsParamList = {
  Inicio: undefined;
  /**
   * categoria y pendientes: desde una insignia del pasaporte, lo que falta por explorar.
   * ocupacion: desde la barra de distribución de Inicio (un nivel o los cerrados).
   */
  Explorar: { categoria?: CategoriaDestino; pendientes?: number[]; motivo?: string; ocupacion?: GrupoOcupacion } | undefined;
  /** destinoId: destino a resaltar al llegar desde el detalle. */
  Mapa: { destinoId?: number } | undefined;
  Favoritos: undefined;
  Panel: undefined;
  /** Filtro con el que se abre la lista (desde las cifras de los paneles). */
  Tickets: { estado?: EstadoTicket; prioridad?: PrioridadTicket; mios?: boolean; sinAsignar?: boolean } | undefined;
  /** estado: abre la lista filtrada (p. ej. los cerrados temporalmente desde el Panel). */
  Destinos: { estado?: EstadoDestino } | undefined;
  Usuarios: undefined;
  Perfil: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  DetalleDestino: { id: number };
  Preferencias: undefined;
  Creditos: undefined;
  TicketDetalle: { id: number };
  /** Desde el detalle de un destino llega con el destino ya elegido; pestana abre "Mis reportes". */
  NuevoTicket: { idDestino?: number; nombreDestino?: string; pestana?: 'nuevo' | 'mios' } | undefined;
  Historial: undefined;
  /** Sin id: crear un destino nuevo. */
  EditarDestino: { id?: number } | undefined;
  /** Panel del administrador: comparativa de los modelos de ML. */
  /** comparar: abre directamente el selector de "Comparar una predicción". */
  ModelosMl: { comparar?: boolean } | undefined;
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
