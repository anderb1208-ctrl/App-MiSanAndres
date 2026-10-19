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
export type Rol = 'turista' | 'tecnico' | 'administrador';
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
  /** Cierre temporal vigente (motivo y fin previsto), o null. */
  cierre: { motivo: string | null; hasta: string | null } | null;
  /** null = sin horario (siempre accesible). */
  horario: Horario | null;
  rangoPrecio: RangoPrecio | null;
  /** Costo por persona por visita (COP); estimado = aún sin confirmar. */
  precio: PrecioDestino | null;
  comoLlegar: string | null;
  imagenUrl: string | null;
  imagen: ImagenDestino | null;
  ocupacionActual: OcupacionActual | null;
}

export interface PrecioDestino {
  minCop: number;
  maxCop: number;
  estimado: boolean;
}

export interface Calificacion {
  promedio: number;
  cantidad: number;
}

export interface Etiqueta {
  codigo: string;
  nombre: string;
}

export interface DestinoDetalle extends Destino {
  etiquetas: { experiencias: Etiqueta[]; grupos: Etiqueta[] };
  calificacion: Calificacion | null;
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
  /** Por persona por visita (COP); ambos null si no lo definió. */
  presupuestoMin: number | null;
  presupuestoMax: number | null;
}

export interface Perfil {
  id: string;
  nombre: string | null;
  correo: string | null;
  nivelOcupacionPreferido: NivelOcupacion | null;
  fechaRegistro: string;
  rol: Rol;
}

/** Filtros del historial (chips). */
export type FiltroHistorial = 'recientes' | 'semana' | 'mes' | 'mas_vistos' | 'populares';

export interface ItemHistorial {
  idDestino: number;
  destino: { id: number; nombre: string; categoria: CategoriaDestino; imagenUrl: string | null } | null;
  /** Interacciones juntadas ("Visto 3 veces"). */
  veces: number;
  tipos: TipoInteraccion[];
  /** null en populares. */
  ultimaVez: string | null;
  /** Día en Colombia (YYYY-MM-DD) para los encabezados; null en más vistos y populares. */
  dia: string | null;
  /** Solo en populares: personas distintas que lo consultaron. */
  personas?: number;
}

export interface PaginaHistorial {
  filtro: FiltroHistorial;
  pagina: number;
  tamano: number;
  total: number;
  hayMas: boolean;
  items: ItemHistorial[];
}

export interface Insignia {
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  /** null en las de avance general (Primeros pasos, Medio camino, Isleño). */
  categoria: CategoriaDestino | null;
  meta: number;
  progreso: number;
  desbloqueada: boolean;
  /** Destinos que faltan por explorar. */
  pendientes: number[];
}

export interface Pasaporte {
  explorados: number;
  total: number;
  porcentaje: number;
  favoritos: number;
  diasActivos: number;
  porCategoria: { categoria: CategoriaDestino; explorados: number; total: number }[];
  insignias: Insignia[];
}

export interface Razon {
  codigo: 'preferencias' | 'presupuesto' | 'grupo' | 'ocupacion' | 'clima' | 'horario' | 'calificacion';
  texto: string;
  tipo: 'positiva' | 'advertencia';
}

export interface Recomendacion extends Destino {
  puntaje: number;
  coincidencias: string[];
  razon: string;
  /** Frase corta con lo más importante. */
  porQue: string;
  /** Positivas primero y advertencias después. */
  razones: Razon[];
  calificacion: Calificacion | null;
}

export interface Presupuesto {
  minCop: number;
  maxCop: number;
}

// ---- Reseñas ----

export interface Resena {
  id: number;
  idDestino: number;
  estrellas: number;
  comentario: string | null;
  fecha: string;
  autor: string | null;
  esMia: boolean;
  oculta: boolean;
}

export interface ResenasDestino {
  calificacion: Calificacion | null;
  resenas: Resena[];
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

/** Por qué no hay clima (ver backend/src/services/clima/climaService.ts). */
export type MotivoSinClima =
  | 'fuera_de_rango'
  | 'sin_datos'
  | 'no_configurado'
  | 'timeout'
  | 'error_red'
  | 'limite_excedido'
  | 'error_http'
  | 'respuesta_invalida';

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
  /** Quién la generó: cálculo heurístico, modelo de ML u "horario" (cerrado). */
  proveedor: 'heuristico' | 'ml' | 'horario';
  /** Modelo que calculó el porcentaje ("HistGradientBoosting", "promedio histórico"); null si está cerrado. */
  modelo?: string | null;
  /** true si se pidió el modelo de ML y respondió el heurístico porque el servicio falló. */
  proveedorRespaldo: boolean;
  /** Datos en que se basa la estimación; null si está cerrado. */
  origenDatos: 'sintetico' | 'real' | null;
  datosSimulados: boolean;
  /** "Estimación basada en datos simulados" mientras los datos sean sintéticos; si no, null. */
  mensajeOrigen: string | null;
  /** Promedio histórico antes de los factores (null si está cerrado o la generó el modelo de ML). */
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
  presupuesto: Presupuesto | null;
  tienePreferencias: boolean;
  recomendaciones: Recomendacion[];
}

// ---- Tickets de soporte ----

export type CategoriaTicket = 'informacion_incorrecta' | 'destino' | 'app' | 'sugerencia' | 'otro';
export type PrioridadTicket = 'baja' | 'media' | 'alta';
export type EstadoTicket = 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';

export interface Ticket {
  id: number;
  categoria: CategoriaTicket;
  asunto: string;
  descripcion: string;
  prioridad: PrioridadTicket;
  estado: EstadoTicket;
  destino: { id: number; nombre: string } | null;
  creador: { id: string; nombre: string | null };
  tecnico: { id: string; nombre: string | null } | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaCierre: string | null;
  esPropio: boolean;
}

export interface ComentarioTicket {
  id: number;
  comentario: string;
  fecha: string;
  /** nombre y rol son null si no se pueden ver (el turista ve "Equipo de soporte"). */
  autor: { id: string; nombre: string | null; rol: Rol | null; esYo: boolean };
}

export interface TicketDetalle extends Ticket {
  comentarios: ComentarioTicket[];
}

export interface NuevoTicket {
  categoria: CategoriaTicket;
  asunto: string;
  descripcion: string;
  prioridad: PrioridadTicket;
  idDestino: number | null;
}

// ---- Administración ----

export interface UsuarioAdmin {
  id: string;
  nombre: string | null;
  correo: string | null;
  rol: Rol;
  fechaRegistro: string;
}

export interface MetricasAdmin {
  usuarios: { total: number; porRol: Partial<Record<Rol, number>>; ultimos30Dias: number };
  interacciones: { total: number; ultimos7Dias: number; porTipo: Partial<Record<TipoInteraccion, number>> };
  ticketsPorEstado: Partial<Record<EstadoTicket, number>>;
  destinosMasVistos: { idDestino: number; nombre: string; vistas: number }[];
}

export interface CamposDestino {
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaDestino;
  latitud: number;
  longitud: number;
  ubicacion: string;
  capacidad: number;
  horarioApertura: string | null;
  horarioCierre: string | null;
  rangoPrecio: RangoPrecio | null;
  comoLlegar: string | null;
}

// ---- Favoritos y alertas ----

export interface AvisosFavorito {
  avisarApertura: boolean;
  avisarCierre: boolean;
}

export interface Favorito extends AvisosFavorito {
  idDestino: number;
  fechaCreacion: string;
  /** null si el destino se ocultó. */
  destino: Destino | null;
}

export interface ResultadoAviso {
  tipo: 'cierre' | 'apertura';
  destinatarios: number;
  enviados: number;
  fallidos: number;
  tokensDesactivados: number;
  error: string | null;
}
