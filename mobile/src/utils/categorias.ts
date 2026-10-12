import type { ComponentProps } from 'react';
import type { MaterialIcons } from '@expo/vector-icons';
import type { CategoriaDestino } from '../services/tipos';

export type NombreIcono = ComponentProps<typeof MaterialIcons>['name'];

interface InfoCategoria {
  /** Etiqueta en singular para metadatos ("Playa • North End"). */
  singular: string;
  /** Etiqueta en plural para filtros ("Playas"). */
  plural: string;
  icono: NombreIcono;
}

export const CATEGORIAS: Record<CategoriaDestino, InfoCategoria> = {
  playa: { singular: 'Playa', plural: 'Playas', icono: 'beach-access' },
  cayo: { singular: 'Cayo', plural: 'Cayos', icono: 'sailing' },
  gastronomia: { singular: 'Restaurante', plural: 'Restaurantes', icono: 'restaurant' },
  actividad: { singular: 'Actividad', plural: 'Actividades', icono: 'kayaking' },
  naturaleza: { singular: 'Naturaleza', plural: 'Naturaleza', icono: 'eco' },
  cultura: { singular: 'Cultura', plural: 'Cultura', icono: 'museum' },
  // Ya no tiene destinos (las actividades usan 'actividad'); sigue en la base por compatibilidad.
  buceo_snorkel: { singular: 'Buceo y snorkel', plural: 'Buceo y snorkel', icono: 'scuba-diving' },
};

/** Categorías de los filtros, en el orden en que se muestran. */
export const LISTA_CATEGORIAS: CategoriaDestino[] = ['playa', 'cayo', 'gastronomia', 'actividad', 'naturaleza', 'cultura'];

/** Iconos de las experiencias y grupos del catálogo (por código). */
export const ICONOS_PREFERENCIA: Record<string, NombreIcono> = {
  relax: 'spa',
  aventura: 'kayaking',
  familiar: 'family-restroom',
  romantica: 'favorite-border',
  cultural: 'account-balance',
  fotografia: 'photo-camera',
  gastronomica: 'restaurant-menu',
  solo: 'person',
  pareja: 'people',
  familia_ninos: 'child-friendly',
  amigos: 'groups',
  adulto_mayor: 'elderly',
};
