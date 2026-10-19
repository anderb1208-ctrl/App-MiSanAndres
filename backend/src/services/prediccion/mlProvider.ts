/**
 * Proveedor de ML: llama al servicio de ml/ (POST /predict/lote) con las features de cada
 * destino abierto. Todos los destinos van en una sola petición.
 *
 * - Timeout corto (ML_TIMEOUT_MS, 2,5 s por defecto): una predicción lenta no debe frenar
 *   la lista de destinos.
 * - Si el servicio falla, no se vuelve a intentar durante ESPERA_TRAS_FALLO_ML_MS (así una
 *   caída no hace esperar el timeout en cada consulta) y se lanza ErrorServicioMl.
 * - La respuesta se valida: un formato inesperado cuenta como fallo.
 */
import { z } from 'zod';
import type { Db } from '../../config/supabase';
import type { EntradaPrediccion, ProveedorPrediccion, ResultadoProveedor } from './tipos';

export const ESPERA_TRAS_FALLO_ML_MS = 30 * 1000;

export interface ConfigMl {
  url: string;
  apiKey: string;
  timeoutMs: number;
}

export class ErrorServicioMl extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorServicioMl';
  }
}

/** Los servicios anteriores a la comparación de modelos no enviaban el nombre: eran Random Forest. */
export const MODELO_ML_POR_DEFECTO = 'Random Forest';

const esquemaRespuesta = z.object({
  // "mock" es el nombre anterior de "simulado".
  origen_modelo: z.enum(['simulado', 'mock', 'real']),
  modelo: z.string().min(1).optional(),
  datos_sinteticos: z.boolean(),
  resultados: z.array(
    z.object({
      id_destino: z.number().int(),
      estado: z.enum(['Abierto', 'Cerrado']),
      porcentaje: z.number().min(0).max(100),
    }),
  ),
});

const redondear = (n: number) => Math.round(n * 10) / 10;

export class ProveedorMl implements ProveedorPrediccion {
  readonly nombre = 'ml' as const;
  private sinServicioHasta = 0;

  constructor(
    private readonly config: ConfigMl,
    private readonly ahora: () => number = Date.now,
  ) {}

  async predecirVarios(_db: Db, entradas: EntradaPrediccion[], fecha: string, hora: string) {
    const resultado = new Map<number, ResultadoProveedor>();
    if (entradas.length === 0) return resultado;
    if (this.ahora() < this.sinServicioHasta) {
      throw new ErrorServicioMl('El servicio de ML falló hace poco; se reintentará en unos segundos.');
    }
    try {
      const datos = await this.pedirLote(entradas, fecha, hora);
      const sintetico = datos.datos_sinteticos;
      for (const r of datos.resultados) {
        resultado.set(r.id_destino, {
          porcentaje: r.estado === 'Cerrado' ? 0 : redondear(r.porcentaje),
          base: null,
          muestras: 0,
          factores: [],
          fuente: 'modelo_ml',
          proveedor: 'ml',
          modelo: datos.modelo ?? MODELO_ML_POR_DEFECTO,
          origenDatos: sintetico ? 'sintetico' : 'real',
          respaldo: false,
        });
      }
      return resultado;
    } catch (error) {
      this.sinServicioHasta = this.ahora() + ESPERA_TRAS_FALLO_ML_MS;
      throw error instanceof ErrorServicioMl ? error : new ErrorServicioMl(`No se pudo consultar el servicio de ML: ${(error as Error).message}`);
    }
  }

  private async pedirLote(entradas: EntradaPrediccion[], fecha: string, hora: string) {
    const consultas = entradas.map(({ destino, clima }) => ({
      id_destino: destino.id_destino,
      fecha,
      hora,
      clima: clima ? { temperatura: clima.temperatura, precipitacion: clima.precipitacion, viento: clima.viento } : null,
    }));
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.config.url.replace(/\/+$/, '')}/predict/lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-API-Key': this.config.apiKey },
        body: JSON.stringify({ consultas }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const tiempo = (error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError';
      throw new ErrorServicioMl(tiempo ? `El servicio de ML no respondió en ${this.config.timeoutMs} ms.` : `Sin conexión con el servicio de ML (${(error as Error).message}).`);
    }
    if (!respuesta.ok) {
      throw new ErrorServicioMl(`El servicio de ML respondió ${respuesta.status}.`);
    }
    const datos = esquemaRespuesta.safeParse(await respuesta.json().catch(() => null));
    if (!datos.success) throw new ErrorServicioMl('El servicio de ML devolvió una respuesta con formato inesperado.');
    return datos.data;
  }
}
