import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { mensajeDeError } from '../services/api';
import { actualizarAvisosFavorito, agregarFavorito, listarFavoritos, quitarFavorito } from '../services/favoritos';
import {
  desasociarDispositivo,
  estadoPermiso,
  pedirPermisoConExplicacion,
  registrarTokenPush,
  reprogramarAvisosLocales,
  type ResultadoPush,
} from '../services/notificaciones';
import { registrarAlCerrarSesion } from '../services/sesion';
import type { AvisosFavorito, Destino, Favorito } from '../services/tipos';
import { useAuth } from './AuthContext';

interface ValorFavoritos {
  favoritos: Favorito[];
  cargando: boolean;
  esFavorito: (idDestino: number) => boolean;
  avisosDe: (idDestino: number) => AvisosFavorito | null;
  /** Marca o desmarca; al marcar el primero pide el permiso de notificaciones explicando para qué. */
  alternar: (destino: Pick<Destino, 'id' | 'nombre'>) => Promise<void>;
  actualizarAvisos: (idDestino: number, avisos: Partial<AvisosFavorito>) => Promise<void>;
  recargar: () => Promise<void>;
  /** Aviso para el usuario si no hay permiso de notificaciones (la app sigue funcionando). */
  avisoPermiso: string | null;
  /** Resultado del registro para push remotas (para explicar si no está disponible). */
  estadoPush: ResultadoPush | null;
}

const FavoritosContext = createContext<ValorFavoritos | null>(null);

const SIN_PERMISO =
  'Las notificaciones están desactivadas: tus favoritos se guardan, pero no recibirás avisos. Puedes activarlas en los ajustes del teléfono.';

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const { estado, sesion } = useAuth();
  const activo = estado === 'lista' && Boolean(sesion);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [cargando, setCargando] = useState(false);
  const [avisoPermiso, setAvisoPermiso] = useState<string | null>(null);
  const [estadoPush, setEstadoPush] = useState<ResultadoPush | null>(null);
  const favoritosRef = useRef<Favorito[]>([]);
  favoritosRef.current = favoritos;

  const reprogramar = useCallback(async (lista: Favorito[]) => {
    try {
      await reprogramarAvisosLocales(lista);
    } catch {
      // Un fallo al programar avisos no debe afectar a los favoritos.
    }
  }, []);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await listarFavoritos();
      setFavoritos(lista);
      await reprogramar(lista);
    } finally {
      setCargando(false);
    }
  }, [reprogramar]);

  // Al iniciar sesión: favoritos, avisos locales y token para push.
  useEffect(() => {
    if (!activo) {
      setFavoritos([]);
      return;
    }
    recargar().catch(() => undefined);
    void (async () => {
      if ((await estadoPermiso()) === 'denegado') setAvisoPermiso(SIN_PERMISO);
      setEstadoPush(await registrarTokenPush());
    })();
  }, [activo, recargar]);

  // Al volver a la app se reprograman los avisos (los ya pasados se reemplazan por los siguientes).
  useEffect(() => {
    if (!activo) return;
    const sub = AppState.addEventListener('change', (e) => {
      if (e === 'active') void reprogramar(favoritosRef.current);
    });
    return () => sub.remove();
  }, [activo, reprogramar]);

  // Al cerrar sesión: desasociar el token y borrar los avisos locales.
  useEffect(() => registrarAlCerrarSesion(desasociarDispositivo), []);

  const esFavorito = useCallback((id: number) => favoritos.some((f) => f.idDestino === id), [favoritos]);
  const avisosDe = useCallback(
    (id: number) => {
      const f = favoritos.find((x) => x.idDestino === id);
      return f ? { avisarApertura: f.avisarApertura, avisarCierre: f.avisarCierre } : null;
    },
    [favoritos],
  );

  const alternar = useCallback(
    async (destino: Pick<Destino, 'id' | 'nombre'>) => {
      if (favoritosRef.current.some((f) => f.idDestino === destino.id)) {
        const lista = favoritosRef.current.filter((f) => f.idDestino !== destino.id);
        setFavoritos(lista);
        try {
          await quitarFavorito(destino.id);
          await reprogramar(lista);
        } catch (e) {
          await recargar().catch(() => undefined);
          throw new Error(mensajeDeError(e));
        }
        return;
      }
      const esPrimero = favoritosRef.current.length === 0;
      const nuevo = await agregarFavorito(destino.id);
      const lista = [nuevo, ...favoritosRef.current.filter((f) => f.idDestino !== destino.id)];
      setFavoritos(lista);
      if (esPrimero || (await estadoPermiso()) === 'sin_preguntar') {
        const concedido = await pedirPermisoConExplicacion();
        setAvisoPermiso(concedido ? null : SIN_PERMISO);
        if (concedido) setEstadoPush(await registrarTokenPush());
      }
      await reprogramar(lista);
    },
    [recargar, reprogramar],
  );

  const actualizarAvisos = useCallback(
    async (id: number, avisos: Partial<AvisosFavorito>) => {
      const lista = favoritosRef.current.map((f) => (f.idDestino === id ? { ...f, ...avisos } : f));
      setFavoritos(lista);
      try {
        await actualizarAvisosFavorito(id, avisos);
        await reprogramar(lista);
      } catch (e) {
        await recargar().catch(() => undefined);
        throw new Error(mensajeDeError(e));
      }
    },
    [recargar, reprogramar],
  );

  const valor = useMemo<ValorFavoritos>(
    () => ({ favoritos, cargando, esFavorito, avisosDe, alternar, actualizarAvisos, recargar, avisoPermiso, estadoPush }),
    [favoritos, cargando, esFavorito, avisosDe, alternar, actualizarAvisos, recargar, avisoPermiso, estadoPush],
  );
  return <FavoritosContext.Provider value={valor}>{children}</FavoritosContext.Provider>;
}

export function useFavoritos(): ValorFavoritos {
  const valor = useContext(FavoritosContext);
  if (!valor) throw new Error('useFavoritos debe usarse dentro de <FavoritosProvider>.');
  return valor;
}
