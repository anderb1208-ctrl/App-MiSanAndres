import type { ImageSourcePropType, ImageURISource } from 'react-native';

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

/** Fuente remota de la foto de un destino, con las cabeceras que exige el servidor. */
export function fuenteImagenRemota(url: string): ImageURISource {
  return ES_WIKIMEDIA.test(url)
    ? { uri: url, headers: { 'User-Agent': USER_AGENT } }
    : { uri: url };
}
