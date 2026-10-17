import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { mensajeDeError } from '../services/api';
import * as authService from '../services/auth';
import { obtenerMe } from '../services/perfil';
import { obtenerPreferencias } from '../services/preferencias';
import type { Rol } from '../services/tipos';

/**
 * - cargando: leyendo la sesión guardada.
 * - sin_sesion: flujo de autenticación.
 * - verificando: hay sesión; se consulta si el usuario ya configuró preferencias.
 * - onboarding: primera vez (sin preferencias) → Configuración de preferencias.
 * - lista: app principal.
 * - error: no se pudo verificar (sin conexión, backend caído…).
 */
export type EstadoAuth = 'cargando' | 'sin_sesion' | 'verificando' | 'onboarding' | 'lista' | 'error';

interface ValorAuth {
  estado: EstadoAuth;
  sesion: Session | null;
  correo: string | null;
  /**
   * Rol del usuario según el backend (null hasta verificarlo). Solo decide qué pantallas
   * se muestran: la seguridad real está en el backend y en RLS.
   */
  rol: Rol | null;
  mensajeError: string | null;
  reintentar: () => void;
  /** Llamar al guardar las preferencias del onboarding. */
  completarOnboarding: () => void;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null);
  const [estado, setEstado] = useState<EstadoAuth>('cargando');
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [rol, setRol] = useState<Rol | null>(null);
  const idUsuario = sesion?.user.id ?? null;

  useEffect(() => {
    let activo = true;
    authService.obtenerSesion().then((s) => {
      if (!activo) return;
      setSesion(s);
      if (!s) setEstado('sin_sesion');
    });
    const cancelar = authService.escucharSesion((s) => {
      setSesion(s);
      if (!s) setEstado('sin_sesion');
    });
    return () => {
      activo = false;
      cancelar();
    };
  }, []);

  // Al cambiar de usuario (login o sesión restaurada), decide si toca el onboarding.
  useEffect(() => {
    if (!idUsuario) return;
    let activo = true;
    setEstado('verificando');
    setMensajeError(null);
    (async () => {
      const me = await obtenerMe();
      if (!activo) return;
      setRol(me.rol);
      // Técnicos y administradores trabajan sin preferencias de viaje: no pasan por el onboarding.
      if (me.rol !== 'turista') return setEstado('lista');
      const p = await obtenerPreferencias();
      if (activo) setEstado(p.categorias.length === 0 ? 'onboarding' : 'lista');
    })()
      .catch((e: unknown) => {
        if (!activo) return;
        setMensajeError(mensajeDeError(e));
        setEstado('error');
      });
    return () => {
      activo = false;
    };
  }, [idUsuario, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  const completarOnboarding = useCallback(() => setEstado('lista'), []);
  const cerrarSesion = useCallback(() => authService.cerrarSesion(), []);

  const valor = useMemo<ValorAuth>(
    () => ({
      estado,
      sesion,
      correo: sesion?.user.email ?? null,
      rol: sesion ? rol : null,
      mensajeError,
      reintentar,
      completarOnboarding,
      cerrarSesion,
    }),
    [estado, sesion, rol, mensajeError, reintentar, completarOnboarding, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return valor;
}
