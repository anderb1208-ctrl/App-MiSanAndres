import type { ImageSourcePropType, ImageURISource } from 'react-native';
import { API_ORIGEN } from '../config/env';

/** Fotos locales de las pantallas de bienvenida, autenticación e inicio. */
export const IMAGENES = {
  acuario: require('../assets/images/acuario.jpg'),
  heroAerial: require('../assets/images/hero-aerial.jpg'),
  hoyoSoplador: require('../assets/images/hoyo-soplador.jpg'),
  johnnyCay: require('../assets/images/johnny-cay.jpg'),
  johnnyCayHero: require('../assets/images/johnny-cay-hero.jpg'),
  loginBeach: require('../assets/images/login-beach.jpg'),
  piscinita: require('../assets/images/piscinita.jpg'),
  westView: require('../assets/images/west-view.jpg'),
} satisfies Record<string, ImageSourcePropType>;

/**
 * Wikimedia responde 403 a las peticiones sin un User-Agent identificable, como el
 * `okhttp` por defecto de Android. Su política pide uno con nombre y contacto.
 */
const USER_AGENT = 'MiSanAndres/1.0 (app de turismo de San Andres; proyecto academico)';

// `URL.hostname` no está implementado en React Native: se compara el texto.
const ES_WIKIMEDIA = /^https?:\/\/([\w-]+\.)*wikimedia\.org\//i;

/**
 * URL completa de la foto de un destino. El backend guarda rutas relativas
 * ("/destinos/johnny-cay.jpg") que sirve él mismo; se completan con
 * EXPO_PUBLIC_API_URL. Las URL absolutas se usan tal cual.
 */
export function urlImagenDestino(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGEN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Fuente remota de la foto de un destino, con las cabeceras que exige el servidor. */
export function fuenteImagenRemota(url: string): ImageURISource {
  const completa = urlImagenDestino(url);
  return ES_WIKIMEDIA.test(completa)
    ? { uri: completa, headers: { 'User-Agent': USER_AGENT } }
    : { uri: completa };
}
