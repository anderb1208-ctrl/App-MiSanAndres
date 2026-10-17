import type { DestinoRow, PreferenciaRow } from '../models/database.types';
import type { EtiquetaDestino } from '../models/destinoModel';
import type { PromedioHora } from '../models/ocupacionModel';

/** Campos de contenido vacíos (destinos sin horario, precio ni imagen). */
const sinContenido = {
  horario_apertura: null,
  horario_cierre: null,
  rango_precio: null,
  como_llegar: null,
  imagen_url: null,
  imagen_autor: null,
  imagen_licencia: null,
  imagen_fuente: null,
  ubicacion_fuente: 'aproximada',
  ubicacion_verificada: false,
  motivo_cierre: null,
  cierre_hasta: null,
} satisfies Partial<DestinoRow>;

/** Cayo con horario 09:00–16:00 e imagen con crédito. */
export const johnnyCay: DestinoRow = {
  ...sinContenido,
  id_destino: 1,
  nombre: 'Johnny Cay',
  descripcion: 'Cayo con playa de arena blanca, palmeras y música en vivo.',
  categoria: 'cayo',
  latitud: 12.6005,
  longitud: -81.6899,
  ubicacion_texto: 'A 15 minutos en lancha desde el muelle de North End',
  capacidad: 800,
  estado: 'abierto',
  horario_apertura: '09:00:00',
  horario_cierre: '16:00:00',
  rango_precio: '$',
  como_llegar: 'En lancha desde el muelle de North End.',
  imagen_url: 'https://upload.wikimedia.org/johnny-cay-960.jpg',
  imagen_autor: 'EASLYHAKS',
  imagen_licencia: 'CC BY-SA 4.0',
  imagen_fuente: 'https://commons.wikimedia.org/wiki/File:Isla_Johnny_Cay.jpg',
  ubicacion_fuente: 'osm',
};

/** Sin horario: siempre accesible. */
export const hoyoSoplador: DestinoRow = {
  ...sinContenido,
  id_destino: 3,
  nombre: 'Hoyo Soplador',
  descripcion: 'Géiser natural que expulsa agua de mar entre las rocas de coral.',
  categoria: 'naturaleza',
  latitud: 12.4822,
  longitud: -81.7316,
  ubicacion_texto: 'Extremo sur de la isla, vía circunvalar',
  capacidad: 300,
  estado: 'abierto',
  rango_precio: 'Gratis',
};

export const sprattBight: DestinoRow = {
  ...sinContenido,
  id_destino: 6,
  nombre: 'Playa de Spratt Bight',
  descripcion: 'Playa principal de la isla, junto al paseo peatonal.',
  categoria: 'playa',
  latitud: 12.5843,
  longitud: -81.6988,
  ubicacion_texto: 'North End, frente a la Avenida Colombia',
  capacidad: 1500,
  estado: 'abierto',
};

export const destinos = [hoyoSoplador, johnnyCay, sprattBight];

/** Promedios a una hora: Johnny Cay alto, Hoyo Soplador bajo, Spratt Bight medio. */
export const promediosHora: PromedioHora[] = [
  { id_destino: 1, hora: 12, promedio: 82.4, muestras: 16 },
  { id_destino: 3, hora: 12, promedio: 25.06, muestras: 16 },
  { id_destino: 6, hora: 12, promedio: 55, muestras: 16 },
];

export const catalogo: PreferenciaRow[] = [
  { id_preferencia: 1, tipo: 'categoria', codigo: 'playa', nombre: 'Playas', descripcion: null },
  { id_preferencia: 2, tipo: 'categoria', codigo: 'cayo', nombre: 'Cayos', descripcion: null },
  { id_preferencia: 3, tipo: 'categoria', codigo: 'naturaleza', nombre: 'Naturaleza', descripcion: null },
  { id_preferencia: 7, tipo: 'experiencia', codigo: 'relax', nombre: 'Relax', descripcion: null },
  { id_preferencia: 8, tipo: 'experiencia', codigo: 'aventura', nombre: 'Aventura', descripcion: null },
  { id_preferencia: 12, tipo: 'experiencia', codigo: 'fotografia', nombre: 'Fotografía', descripcion: null },
  { id_preferencia: 14, tipo: 'grupo', codigo: 'pareja', nombre: 'En pareja', descripcion: null },
  { id_preferencia: 15, tipo: 'grupo', codigo: 'familia_ninos', nombre: 'En familia con niños', descripcion: null },
];

export const etiquetas: EtiquetaDestino[] = [
  { id_destino: 1, id_preferencia: 7, tipo: 'experiencia', codigo: 'relax', nombre: 'Relax' },
  { id_destino: 1, id_preferencia: 12, tipo: 'experiencia', codigo: 'fotografia', nombre: 'Fotografía' },
  { id_destino: 1, id_preferencia: 14, tipo: 'grupo', codigo: 'pareja', nombre: 'En pareja' },
  { id_destino: 3, id_preferencia: 8, tipo: 'experiencia', codigo: 'aventura', nombre: 'Aventura' },
  { id_destino: 3, id_preferencia: 12, tipo: 'experiencia', codigo: 'fotografia', nombre: 'Fotografía' },
  { id_destino: 3, id_preferencia: 15, tipo: 'grupo', codigo: 'familia_ninos', nombre: 'En familia con niños' },
  { id_destino: 6, id_preferencia: 7, tipo: 'experiencia', codigo: 'relax', nombre: 'Relax' },
  { id_destino: 6, id_preferencia: 15, tipo: 'grupo', codigo: 'familia_ninos', nombre: 'En familia con niños' },
];
