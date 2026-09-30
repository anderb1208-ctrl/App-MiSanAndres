import type { ImageSourcePropType } from 'react-native';
import type { CategoriaDestino, Destino } from '../services/tipos';

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
 * Fotos locales para los destinos del seed mientras `destino.imagen_url` esté vacío.
 * Cuando la base tenga imágenes, `imagenDestino` usa la URL y esto deja de aplicarse.
 */
const POR_NOMBRE: Record<string, ImageSourcePropType> = {
  'Johnny Cay': IMAGENES.johnnyCay,
  'Acuario (Haynes Cay)': IMAGENES.acuario,
  'Hoyo Soplador': IMAGENES.hoyoSoplador,
  'West View': IMAGENES.westView,
  'La Piscinita': IMAGENES.piscinita,
  'Playa Spratt Bight': IMAGENES.loginBeach,
};

const POR_CATEGORIA: Record<CategoriaDestino, ImageSourcePropType> = {
  playa: IMAGENES.loginBeach,
  cayo: IMAGENES.johnnyCayHero,
  naturaleza: IMAGENES.hoyoSoplador,
  buceo_snorkel: IMAGENES.piscinita,
  cultura: IMAGENES.heroAerial,
  gastronomia: IMAGENES.westView,
};

export function imagenDestino(destino: Pick<Destino, 'nombre' | 'categoria' | 'imagenUrl'>): ImageSourcePropType {
  if (destino.imagenUrl) return { uri: destino.imagenUrl };
  return POR_NOMBRE[destino.nombre] ?? POR_CATEGORIA[destino.categoria];
}
