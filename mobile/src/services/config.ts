/**
 * Configuración leída de variables EXPO_PUBLIC_ (ver mobile/.env.example).
 * Expo las reemplaza en tiempo de compilación, por eso se leen una por una.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const faltantes = [
  !apiUrl && 'EXPO_PUBLIC_API_URL',
  !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
  !supabasePublishableKey && 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
].filter((v): v is string => Boolean(v));

/** Variables que faltan en mobile/.env (la app muestra un aviso si hay alguna). */
export const variablesFaltantes = faltantes;

/** Origen del backend (sin /v1 ni barra final); sirve también los archivos estáticos. */
export const API_ORIGEN = (apiUrl ?? '').replace(/\/+$/, '').replace(/\/v1$/, '');

/** Base de la API con /v1, acepte o no el .env la barra final o el /v1. */
export const API_BASE_URL = `${API_ORIGEN}/v1`;

export const SUPABASE_URL = supabaseUrl ?? '';
export const SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey ?? '';
