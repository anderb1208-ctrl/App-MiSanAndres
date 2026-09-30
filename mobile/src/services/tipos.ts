/** Tipos de las respuestas del backend (/v1). */

export type NivelOcupacion = 'Bajo' | 'Medio' | 'Alto';
export type CategoriaDestino = 'playa' | 'cayo' | 'naturaleza' | 'buceo_snorkel' | 'cultura' | 'gastronomia';
export type EstadoDestino = 'abierto' | 'cerrado_temporal' | 'inactivo';
export type TipoInteraccion = 'vista' | 'favorito' | 'visita' | 'compartir';

export interface OcupacionActual {
  fecha: string;
  hora: string;
  porcentaje: number;
  nivel: NivelOcupacion;
  personasEstimadas: number;
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
  imagenUrl: string | null;
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
  porcentaje: number;
  nivel: NivelOcupacion;
  personasEstimadas: number;
}

export interface PrediccionDelDia {
  destinoId: number;
  fecha: string;
  tipoDia: 'entre_semana' | 'fin_de_semana';
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
