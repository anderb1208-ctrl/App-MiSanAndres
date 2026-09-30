import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, variablesFaltantes } from './config';

/**
 * Cliente de Supabase solo para autenticación (registro, login, logout y sesión).
 * Los datos de la app se piden al backend, nunca directo a las tablas.
 * La sesión se guarda de forma persistente en localStorage (expo-sqlite).
 */
export const supabase = createClient(
  // Valores de relleno para no romper el arranque si falta el .env; la app muestra el aviso.
  variablesFaltantes.length > 0 ? 'https://sin-configurar.supabase.co' : SUPABASE_URL,
  variablesFaltantes.length > 0 ? 'sin-configurar' : SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Renueva el token solo mientras la app está en primer plano.
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
