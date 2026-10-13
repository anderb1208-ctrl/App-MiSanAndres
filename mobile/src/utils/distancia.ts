export interface Coordenadas {
  latitud: number;
  longitud: number;
}

const RADIO_TIERRA_KM = 6371;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/** Distancia en línea recta entre dos puntos (fórmula de Haversine), en km. */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const dLat = aRadianes(b.latitud - a.latitud);
  const dLon = aRadianes(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "350 m", "2,3 km", "18 km". */
export function formatearDistancia(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

/**
 * Ordena por distancia al usuario; sin ubicación, alfabéticamente.
 * Devuelve cada elemento con su distancia (o null).
 */
export function ordenarPorDistancia<T extends Coordenadas & { nombre: string }>(
  lugares: T[],
  usuario: Coordenadas | null,
): { lugar: T; km: number | null }[] {
  const conDistancia = lugares.map((lugar) => ({ lugar, km: usuario ? distanciaKm(usuario, lugar) : null }));
  return conDistancia.sort((a, b) =>
    a.km !== null && b.km !== null ? a.km - b.km : a.lugar.nombre.localeCompare(b.lugar.nombre, 'es'),
  );
}
