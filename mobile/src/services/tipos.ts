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

// ---- Mapa ----

/** Lo que necesitan el indicador y el marcador para pintar la ocupación. */
export type OcupacionResumida = Pick<OcupacionActual, 'estado' | 'porcentaje' | 'nivel'>;

export interface DestinoMapa {
  id: number;
  nombre: string;
  categoria: CategoriaDestino;
  latitud: number;
  longitud: number;
  imagenUrl: string | null;
  /** null si no hay historial para predecir. */
  ocupacion: OcupacionResumida | null;
}

export interface DatosMapa {
  fecha: string;
  hora: string;
  motivoSinClima: MotivoSinClima | null;
  destinos: DestinoMapa[];
}

// ---- Clima (Open-Meteo, CC BY 4.0) ----

/** Clima de una hora. Cualquier valor puede faltar. */
export interface ClimaHora {
  /** Hora local de Colombia: YYYY-MM-DDTHH:00 */
  fechaHora: string;
  temperatura: number | null;
  /** Probabilidad de lluvia, %. */
  probLluvia: number | null;
  /** mm en la hora. */
  precipitacion: number | null;
  /** Código WMO. */
  codigoClima: number | null;
  /** km/h */
  viento: number | null;
}

export type MotivoSinClima = 'fuera_de_rango' | 'proveedor_no_disponible' | 'sin_datos';

export interface AtribucionClima {
  texto: string;
  url: string;
  licencia: string;
  urlLicencia: string;
}

export interface PronosticoClima {
  disponible: boolean;
  motivoSinClima: MotivoSinClima | null;
  actual: ClimaHora | null;
  proximasHoras: ClimaHora[];
  atribucion: AtribucionClima;
}

export interface ClimaDestino extends PronosticoClima {
  destinoId: number;
  nombre: string;
}

export interface ClimaIsla extends PronosticoClima {
  lugar: string;
}

// ---- Predicción ----

export interface FactorPrediccion {
  codigo: 'tormenta' | 'lluvia' | 'festivo' | 'puente' | 'temporada_alta';
  multiplicador: number;
  /** Efecto en %: −20, +25. */
  efecto: number;
  /** "Lluvia probable: -20 %" */
  texto: string;
  detalle: string | null;
}

export interface PrediccionOcupacion {
  destinoId: number;
  fecha: string;
  hora: string;
  estado: EstadoAtencion;
  porcentaje: number;
  nivel: NivelOcupacion | null;
  personasEstimadas: number;
  /** Promedio histórico antes de los factores (null si está cerrado). */
  base: { porcentaje: number; origen: 'dia_semana' | 'entre_semana' | 'fin_de_semana'; muestras: number } | null;
  features: {
    hora: number;
    diaSemana: number;
    esFinDeSemana: boolean;
    esFestivo: boolean;
    esPuente: boolean;
    temporada: 'alta' | 'normal';
  };
  clima: ClimaHora | null;
  motivoSinClima: MotivoSinClima | null;
  factores: FactorPrediccion[];
}

export interface ResultadoRecomendaciones {
  fecha: string;
  hora: string;
  nivelOcupacionPreferido: NivelOcupacion | null;
  tienePreferencias: boolean;
  recomendaciones: Recomendacion[];
}
