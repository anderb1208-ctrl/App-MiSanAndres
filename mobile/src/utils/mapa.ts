import { Linking, Platform } from 'react-native';
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

/**
 * Abre la app de mapas del teléfono con la ruta al destino. El enlace universal de
 * Google Maps funciona en Android y en iPhone (app de Google Maps o navegador),
 * sin clave ni costo.
 */
export function abrirComoLlegar(latitud: number, longitud: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
  return Linking.openURL(url);
}
