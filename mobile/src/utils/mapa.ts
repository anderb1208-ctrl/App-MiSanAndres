import { ActionSheetIOS, Linking, Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import type { OcupacionResumida } from '../services/tipos';
import { mapColors, occupancyColors } from '../theme';

/** Android usa Google Maps; iPhone, Apple Maps (sin clave y compatible con Expo Go). */
export const PROVEEDOR_MAPA = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

/** Toda la isla, de Johnny Cay (norte) al Hoyo Soplador (sur). */
export const REGION_SAN_ANDRES: Region = {
  latitude: 12.545,
  longitude: -81.71,
  latitudeDelta: 0.16,
  longitudeDelta: 0.1,
};

/** Acercamiento al centrar en un destino o en el usuario. */
export const DELTA_CERCANO = { latitudeDelta: 0.03, longitudeDelta: 0.02 };

export type EstadoMarcador = 'Bajo' | 'Medio' | 'Alto' | 'Cerrado' | 'SinDatos';

export function estadoMarcador(o: OcupacionResumida | null): EstadoMarcador {
  if (!o) return 'SinDatos';
  if (o.estado === 'Cerrado' || !o.nivel) return 'Cerrado';
  return o.nivel;
}

/** Color de relleno del marcador (colores de ocupación del tema). */
export function colorMarcador(estado: EstadoMarcador): string {
  if (estado === 'Cerrado') return mapColors.cerrado;
  if (estado === 'SinDatos') return mapColors.sinDatos;
  return occupancyColors[estado].main;
}

export const ETIQUETA_MARCADOR: Record<EstadoMarcador, string> = {
  Bajo: 'Baja',
  Medio: 'Media',
  Alto: 'Alta',
  Cerrado: 'Cerrado',
  SinDatos: 'Sin datos',
};

/** Apple Maps con un pin en el punto y el nombre como etiqueta. */
export const urlAppleMaps = (nombre: string, latitud: number, longitud: number) =>
  `https://maps.apple.com/?ll=${latitud},${longitud}&q=${encodeURIComponent(nombre)}`;

/**
 * Google Maps con un pin en el punto. Es un enlace universal: abre la app si está
 * instalada y, si no, el navegador. Se busca por coordenadas (no por nombre) para
 * que no elija otro lugar con un nombre parecido.
 */
export const urlGoogleMaps = (latitud: number, longitud: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitud}%2C${longitud}`;

/** Android: abre la app de mapas predeterminada con el pin y el nombre como etiqueta. */
export const urlGeo = (nombre: string, latitud: number, longitud: number) =>
  `geo:${latitud},${longitud}?q=${latitud},${longitud}(${encodeURIComponent(nombre)})`;

/**
 * "Cómo llegar": abre la UBICACIÓN del destino (un pin con su nombre), no una ruta;
 * desde la app de mapas el usuario decide si pide el trayecto.
 * iPhone: hoja de opciones Apple Maps / Google Maps. Android: enlace geo:.
 * Funciona en Expo Go (no usa esquemas que requieran declararse en la app).
 */
export function abrirUbicacion(nombre: string, latitud: number, longitud: number) {
  const google = () => Linking.openURL(urlGoogleMaps(latitud, longitud));

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: nombre, options: ['Apple Maps', 'Google Maps', 'Cancelar'], cancelButtonIndex: 2 },
      (i) => {
        if (i === 0) void Linking.openURL(urlAppleMaps(nombre, latitud, longitud));
        if (i === 1) void google();
      },
    );
    return;
  }
  // Si no hay app que entienda geo:, se abre Google Maps (app o navegador).
  Linking.openURL(urlGeo(nombre, latitud, longitud)).catch(google);
}
