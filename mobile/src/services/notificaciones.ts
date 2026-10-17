/**
 * Notificaciones de la app (expo-notifications):
 * - LOCALES (sin servidor, funcionan en Expo Go): avisos de apertura y cierre según el
 *   horario normal de los favoritos. Se reprograman al abrir la app y al cambiar favoritos.
 * - PUSH REMOTAS (Expo Push API): cierres temporales y reaperturas que decide el
 *   administrador. Requieren el projectId de EAS y no funcionan en Expo Go en Android
 *   (desde el SDK 53): ahí la app degrada con elegancia y sigue con las locales.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import type { Favorito } from './tipos';
import { quitarDispositivo, registrarDispositivo } from './favoritos';
import { calcularAvisosLocales } from '../utils/avisos';

export const CANAL_ANDROID = 'avisos-destinos';
const ORIGEN_LOCAL = 'favorito';
const CLAVE_TOKEN = 'misanandres.tokenPush';

/** Datos que viajan en la notificación para abrir el detalle al tocarla. */
export interface DatosNotificacion {
  tipo: 'destino';
  idDestino: number;
  origen?: string;
}

let configurado = false;

/** Muestra las notificaciones también con la app abierta y crea el canal de Android. */
export async function configurarNotificaciones(): Promise<void> {
  if (configurado) return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    // Android 13+: el permiso no se puede pedir hasta que exista al menos un canal.
    await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
      name: 'Avisos de destinos',
      description: 'Apertura, cierre y cierres temporales de tus favoritos',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#0E7490',
    });
  }
}

export type EstadoPermiso = 'concedido' | 'denegado' | 'sin_preguntar';

export async function estadoPermiso(): Promise<EstadoPermiso> {
  const { granted, canAskAgain, status } = await Notifications.getPermissionsAsync();
  if (granted) return 'concedido';
  return status === 'undetermined' || canAskAgain ? 'sin_preguntar' : 'denegado';
}

const preguntar = (titulo: string, mensaje: string) =>
  new Promise<boolean>((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Ahora no', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Permitir avisos', onPress: () => resolver(true) },
    ]),
  );

/**
 * Pide permiso explicando para qué (se llama al marcar el primer favorito). Devuelve true si
 * quedó concedido. Si lo niega, la app sigue funcionando (sin avisos).
 */
export async function pedirPermisoConExplicacion(): Promise<boolean> {
  await configurarNotificaciones();
  const estado = await estadoPermiso();
  if (estado === 'concedido') return true;
  if (estado === 'denegado') return false;
  const acepta = await preguntar(
    'Avisos de tus favoritos',
    'Te avisaremos cuando tus lugares favoritos abran o estén por cerrar, y si cierran temporalmente (por ejemplo, por mar de leva). Puedes elegir los avisos de cada favorito.',
  );
  if (!acepta) return false;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/** Cancela los avisos locales de favoritos y programa los próximos (máx. 60, límite de iOS). */
export async function reprogramarAvisosLocales(favoritos: Favorito[]): Promise<number> {
  if ((await estadoPermiso()) !== 'concedido') return 0;
  await configurarNotificaciones();
  const pendientes = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pendientes
      .filter((n) => (n.content.data as Partial<DatosNotificacion> | undefined)?.origen === ORIGEN_LOCAL)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const avisos = calcularAvisosLocales(favoritos);
  for (const a of avisos) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: a.titulo,
        body: a.cuerpo,
        sound: 'default',
        data: { tipo: 'destino', idDestino: a.idDestino, origen: ORIGEN_LOCAL } satisfies DatosNotificacion,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.fecha, channelId: CANAL_ANDROID },
    });
  }
  return avisos.length;
}

/** Quita todos los avisos locales de favoritos (al cerrar sesión). */
export async function cancelarAvisosLocales(): Promise<void> {
  const pendientes = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pendientes
      .filter((n) => (n.content.data as Partial<DatosNotificacion> | undefined)?.origen === ORIGEN_LOCAL)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Notificación local de prueba a los 5 segundos (para la demo). */
export async function probarNotificacion(idDestino?: number): Promise<boolean> {
  if (!(await pedirPermisoConExplicacion())) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Prueba de MiSanAndrés',
      body: idDestino ? 'Toca este aviso para abrir el destino.' : 'Las notificaciones funcionan en este teléfono.',
      sound: 'default',
      data: idDestino ? ({ tipo: 'destino', idDestino } satisfies DatosNotificacion) : {},
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CANAL_ANDROID },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Push remotas
// ---------------------------------------------------------------------------

export type ResultadoPush =
  | { estado: 'registrado'; token: string }
  | { estado: 'no_soportado' | 'sin_proyecto' | 'sin_permiso' | 'error'; mensaje: string };

const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** projectId de EAS (app.config.ts → extra.eas.projectId, desde EAS_PROJECT_ID). */
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

const leerTokenGuardado = () => {
  try {
    return globalThis.localStorage?.getItem(CLAVE_TOKEN) ?? null;
  } catch {
    return null;
  }
};
const guardarToken = (token: string | null) => {
  try {
    if (token) globalThis.localStorage?.setItem(CLAVE_TOKEN, token);
    else globalThis.localStorage?.removeItem(CLAVE_TOKEN);
  } catch {
    // Sin almacenamiento: no se podrá desasociar el token al cerrar sesión; el backend lo
    // reasigna o lo desactiva cuando Expo lo rechace.
  }
};

/**
 * Obtiene el token de Expo y lo registra para el usuario (tras iniciar sesión). Nunca lanza:
 * si no se puede (Expo Go en Android, emulador, sin projectId o sin permiso) lo informa.
 */
export async function registrarTokenPush(): Promise<ResultadoPush> {
  try {
    if (!Device.isDevice) return { estado: 'no_soportado', mensaje: 'Las notificaciones push necesitan un teléfono real.' };
    if (esExpoGo && Platform.OS === 'android') {
      return {
        estado: 'no_soportado',
        mensaje: 'Expo Go en Android no recibe notificaciones push (desde el SDK 53). Los avisos locales sí funcionan.',
      };
    }
    const id = projectId();
    if (!id) return { estado: 'sin_proyecto', mensaje: 'Falta EAS_PROJECT_ID: las notificaciones push están desactivadas.' };
    if ((await estadoPermiso()) !== 'concedido') return { estado: 'sin_permiso', mensaje: 'Sin permiso de notificaciones.' };
    await configurarNotificaciones();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await registrarDispositivo(token, Platform.OS === 'ios' ? 'ios' : 'android');
    guardarToken(token);
    return { estado: 'registrado', token };
  } catch (e) {
    return { estado: 'error', mensaje: (e as Error).message };
  }
}

/** Desasocia el token del usuario (al cerrar sesión) y borra los avisos locales. */
export async function desasociarDispositivo(): Promise<void> {
  const token = leerTokenGuardado();
  await Promise.allSettled([token ? quitarDispositivo(token) : Promise.resolve(), cancelarAvisosLocales()]);
  guardarToken(null);
}

/** Id del destino de una notificación tocada, si trae uno. */
export function destinoDeRespuesta(respuesta: Notifications.NotificationResponse | null | undefined): number | null {
  const datos = respuesta?.notification.request.content.data as Partial<DatosNotificacion> | undefined;
  const id = Number(datos?.idDestino);
  return datos?.tipo === 'destino' && Number.isInteger(id) && id > 0 ? id : null;
}

export function escucharToques(alTocar: (idDestino: number) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const id = destinoDeRespuesta(r);
    if (id) alTocar(id);
  });
  return () => sub.remove();
}

export const ultimaRespuesta = () => Notifications.getLastNotificationResponseAsync();
