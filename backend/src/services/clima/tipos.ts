/** Tipos comunes del clima, independientes del proveedor. */

export interface Coordenada {
  latitud: number;
  longitud: number;
}

/** Clima de una hora en un punto. Los valores pueden faltar (null) si el proveedor no los tiene. */
export interface ClimaHora {
  /** Hora local de Colombia: YYYY-MM-DDTHH:00 */
  fechaHora: string;
  /** °C a 2 m. */
  temperatura: number | null;
  /** Probabilidad de precipitación, %. */
  probLluvia: number | null;
  /** Precipitación de la hora, mm. */
  precipitacion: number | null;
  /** Código WMO del estado del tiempo. */
  codigoClima: number | null;
  /** Velocidad del viento a 10 m, km/h. */
  viento: number | null;
}

export interface OpcionesPronostico {
  /** Días hacia atrás (datos ya observados/analizados). */
  diasPasados?: number;
  /** Días hacia adelante, contando hoy. */
  diasPronostico?: number;
}

export interface Atribucion {
  texto: string;
  url: string;
  licencia: string;
  urlLicencia: string;
}

/**
 * Por qué falló una consulta al proveedor de clima:
 * - timeout: no respondió a tiempo.
 * - error_red: no se pudo conectar (DNS, conexión rechazada, sin red).
 * - limite_excedido: HTTP 429 (límite de peticiones; p. ej. el de Open-Meteo por IP).
 * - error_http: otro código HTTP de error.
 * - respuesta_invalida: respondió, pero con un formato inesperado.
 */
export type FallaClima = 'timeout' | 'error_red' | 'limite_excedido' | 'error_http' | 'respuesta_invalida';

/** Error de un proveedor de clima, con su tipo de falla y un mensaje sin datos sensibles. */
export class ErrorProveedorClima extends Error {
  override name = 'ErrorProveedorClima';
  constructor(
    public readonly tipo: FallaClima,
    mensaje: string,
    /** Código HTTP, si hubo respuesta. */
    public readonly estadoHttp?: number,
  ) {
    super(mensaje);
  }
}

/**
 * Proveedor de clima. Para cambiar de servicio basta con otra implementación de
 * esta interfaz (y registrarla en climaService); nada más del backend cambia.
 */
export interface ProveedorClima {
  readonly nombre: string;
  readonly atribucion: Atribucion;
  /**
   * Clima por hora de cada punto, en hora de Colombia y en el mismo orden de `puntos`.
   * Lanza un error si el servicio no responde o responde mal.
   */
  pronostico(puntos: Coordenada[], opciones?: OpcionesPronostico): Promise<ClimaHora[][]>;
}
