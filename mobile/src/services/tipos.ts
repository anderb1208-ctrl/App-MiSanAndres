/** Tipos de las respuestas del backend (/v1). */

export type NivelOcupacion = 'Bajo' | 'Medio' | 'Alto';
export type CategoriaDestino =
  | 'playa'
  | 'cayo'
  | 'naturaleza'
  | 'buceo_snorkel'
  | 'cultura'
  | 'gastronomia'
  | 'actividad';
export type RangoPrecio = 'Gratis' | '$' | '$$' | '$$$';
/** "Cerrado" fuera del horario del destino o si está cerrado temporalmente. */
export type EstadoAtencion = 'Abierto' | 'Cerrado';
export type EstadoDestino = 'abierto' | 'cerrado_temporal' | 'inactivo';
export type TipoInteraccion = 'vista' | 'favorito' | 'visita' | 'compartir';

export interface OcupacionActual {
  fecha: string;
  hora: string;
  estado: EstadoAtencion;
  porcentaje: number;
  /** null cuando está cerrado. */
  nivel: NivelOcupacion | null;
  personasEstimadas: number;
}

/** Horario en hora de Colombia (HH:MM; el cierre es exclusivo). */
export interface Horario {
  apertura: string;
  cierre: string;
}

export interface ImagenDestino {
  url: string;
  autor: string | null;
  licencia: string | null;
  /** Página de la foto (crédito). */
  fuente: string | null;
}

export interface Destino {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaDestino;
  ubicacion: string;
  latitud: number;
  longitud: number;
  capacidad: number;
  estado: EstadoDestino;
  /** null = sin horario (siempre accesible). */
  horario: Horario | null;
  rangoPrecio: RangoPrecio | null;
  comoLlegar: string | null;
  imagenUrl: string | null;
  imagen: ImagenDestino | null;
  ocupacionActual: OcupacionActual | null;
}

export interface Etiqueta {
  codigo: string;
  nombre: string;
}

export interface DestinoDetalle extends Destino {
  etiquetas: { experiencias: Etiqueta[]; grupos: Etiqueta[] };
}

export interface RegistroOcupacion {
  hora: string;
  fechaHora: string;
  cantidadPersonas: number;
  porcentaje: number;
  nivel: NivelOcupacion;
}

export interface OcupacionDelDia {
  destinoId: number;
  fecha: string;
  registros: RegistroOcupacion[];
}

export interface PuntoPrevision {
  hora: string;
  /** false si a esa hora el destino está fuera de su horario. */
  abierto: boolean;
  porcentaje: number;
  nivel: NivelOcupacion;
  personasEstimadas: number;
}

/** Ocupación típica de cada hora para el día de la semana de la fecha. */
export interface OcupacionTipicaDelDia {
  destinoId: number;
  fecha: string;
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  /** "martes". */
  nombreDia: string;
  /** Histórico usado: el de ese día de la semana o, como respaldo, el del tipo de día. */
  base: 'dia_semana' | 'entre_semana' | 'fin_de_semana';
  fuente: string;
  horas: PuntoPrevision[];
}

export interface ItemCatalogo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface Catalogo {
  categorias: ItemCatalogo[];
  experiencias: ItemCatalogo[];
  grupos: ItemCatalogo[];
}

export interface Preferencias {
  categorias: string[];
  tiposExperiencia: string[];
  tiposGrupo: string[];
  nivelOcupacion: NivelOcupacion | null;
}

export interface Perfil {
  id: string;
  nombre: string | null;
  correo: string | null;
  nivelOcupacionPreferido: NivelOcupacion | null;
  fechaRegistro: string;
}

export interface InteraccionHistorial {
  id: number;
  idDestino: number;
  tipo: TipoInteraccion;
  fechaHora: string;
  destino: { id: number; nombre: string; categoria: CategoriaDestino } | null;
}

export interface Recomendacion extends Destino {
  puntaje: number;
  coincidencias: string[];
  razon: string;
}

export interface ResultadoRecomendaciones {
  fecha: string;
  hora: string;
  nivelOcupacionPreferido: NivelOcupacion | null;
  tienePreferencias: boolean;
  recomendaciones: Recomendacion[];
}
