import type { DestinoRow, PreferenciaRow } from '../models/database.types';
import type { EtiquetaDestino } from '../models/destinoModel';
import type { PromedioHora } from '../models/ocupacionModel';

export const johnnyCay: DestinoRow = {
  id_destino: 1,
  nombre: 'Johnny Cay',
  descripcion: 'Cayo con playa de arena blanca, palmeras y música en vivo.',
  categoria: 'cayo',
  latitud: 12.6019,
  longitud: -81.6893,
  ubicacion_texto: 'A 15 minutos en lancha desde el muelle de North End',
  capacidad: 800,
  estado: 'abierto',
  imagen_url: null,
};

export const hoyoSoplador: DestinoRow = {
  id_destino: 3,
  nombre: 'Hoyo Soplador',
  descripcion: 'Géiser natural que expulsa agua de mar entre las rocas de coral.',
  categoria: 'naturaleza',
  latitud: 12.4838,
  longitud: -81.7327,
  ubicacion_texto: 'Extremo sur de la isla, vía circunvalar',
  capacidad: 300,
  estado: 'abierto',
  imagen_url: null,
};

export const sprattBight: DestinoRow = {
  id_destino: 6,
  nombre: 'Playa Spratt Bight',
  descripcion: 'Playa principal de la isla, junto al paseo peatonal.',
  categoria: 'playa',
  latitud: 12.5842,
  longitud: -81.6996,
  ubicacion_texto: 'North End, frente a la Avenida Colombia',
  capacidad: 1500,
  estado: 'abierto',
  imagen_url: null,
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
