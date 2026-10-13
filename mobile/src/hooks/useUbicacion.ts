import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Coordenadas } from '../utils/distancia';

export type EstadoUbicacion =
  /** Pidiendo permiso u obteniendo la posición. */
  | 'buscando'
  | 'lista'
  /** El usuario negó el permiso. `puedePreguntar` indica si se le puede volver a pedir. */
  | 'denegada'
  /** GPS apagado, sin señal o error del sistema. */
  | 'error';

export interface Ubicacion {
  estado: EstadoUbicacion;
  coords: Coordenadas | null;
  /** false si el sistema ya no muestra el diálogo (hay que ir a Ajustes). */
  puedePreguntar: boolean;
  /** Vuelve a pedir el permiso y la posición. */
  actualizar: () => void;
}

const TIEMPO_MAXIMO_MS = 10_000;

const aCoordenadas = (p: Location.LocationObject): Coordenadas => ({
  latitud: p.coords.latitude,
  longitud: p.coords.longitude,
});

/**
 * Ubicación del usuario en primer plano. Nunca lanza: si el permiso se niega o falla,
 * `coords` queda en null y la pantalla sigue funcionando.
 */
export function useUbicacion(): Ubicacion {
  const [estado, setEstado] = useState<EstadoUbicacion>('buscando');
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [puedePreguntar, setPuedePreguntar] = useState(true);
  const montado = useRef(true);

  const actualizar = useCallback(async () => {
    setEstado('buscando');
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!montado.current) return;
      setPuedePreguntar(permiso.canAskAgain);
      if (permiso.status !== Location.PermissionStatus.GRANTED) {
        setEstado('denegada');
        return;
      }

      // La última posición conocida es instantánea; luego se refina con una lectura actual.
      const ultima = await Location.getLastKnownPositionAsync();
      if (ultima && montado.current) {
        setCoords(aCoordenadas(ultima));
        setEstado('lista');
      }
      const actual = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>((resolver) => setTimeout(() => resolver(null), TIEMPO_MAXIMO_MS)),
      ]);
      if (!montado.current) return;
      if (actual) {
        setCoords(aCoordenadas(actual));
        setEstado('lista');
      } else if (!ultima) {
        setEstado('error');
      }
    } catch {
      if (montado.current) setEstado((e) => (e === 'lista' ? e : 'error'));
    }
  }, []);

  useEffect(() => {
    montado.current = true;
    void actualizar();
    return () => {
      montado.current = false;
    };
  }, [actualizar]);

  return { estado, coords, puedePreguntar, actualizar: () => void actualizar() };
}
