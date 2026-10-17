import type { ExpoConfig } from 'expo/config';

/**
 * Configuración de Expo. Reemplaza a app.json para poder leer variables de entorno.
 *
 * GOOGLE_MAPS_API_KEY: clave de Google Maps SDK for Android. Solo la usa el build de
 * Android (en iPhone el mapa es Apple Maps, sin clave). Nunca se escribe aquí: viene de
 * mobile/.env en local o de las variables de entorno de EAS (ver README).
 * Expo Go no la necesita: trae su propia configuración de mapas.
 */
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || undefined;

/**
 * EAS_PROJECT_ID: id del proyecto de EAS (lo crea `eas init`). Lo necesita
 * getExpoPushTokenAsync para las notificaciones push remotas. Sin él, la app sigue
 * funcionando con notificaciones locales. No es secreto, pero se lee del entorno para no
 * fijar una cuenta en el repositorio.
 */
const easProjectId = process.env.EAS_PROJECT_ID || undefined;

const config: ExpoConfig = {
  name: 'MiSanAndrés',
  slug: 'misanandres',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'misanandres',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.misanandres.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#001430',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.misanandres.app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-sqlite',
    'expo-font',
    [
      'expo-location',
      {
        // Solo ubicación en primer plano (mientras la app está abierta).
        locationWhenInUsePermission:
          'MiSanAndrés usa tu ubicación para mostrarte en el mapa y ordenar los destinos por cercanía.',
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    ['react-native-maps', { androidGoogleMapsApiKey: googleMapsApiKey }],
    // Notificaciones locales (avisos de horario de favoritos) y push (cierres temporales).
    ['expo-notifications', { color: '#0E7490' }],
  ],
  extra: easProjectId ? { eas: { projectId: easProjectId } } : {},
};

export default config;
