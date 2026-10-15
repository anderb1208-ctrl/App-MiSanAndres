/**
 * Elige el proveedor de predicción según PREDICCION_PROVEEDOR:
 *   heuristico  promedio histórico + factores (por defecto).
 *   ml          servicio de ML; si falla, la predicción responde 503.
 *   auto        servicio de ML y, si falla o no responde, el heurístico (la API no se rompe).
 */
import { env } from '../../config/env';
import type { Db } from '../../config/supabase';
import { servicioNoDisponible } from '../../utils/errores';
import { proveedorHeuristico } from './heuristicoProvider';
import { ErrorServicioMl, ProveedorMl } from './mlProvider';
import type { EntradaPrediccion, ProveedorPrediccion, ResultadoProveedor } from './tipos';

let ml: { clave: string; proveedor: ProveedorMl } | null = null;

/** Proveedor de ML con la configuración actual (se recrea si cambia la URL, la clave o el timeout). */
function proveedorMl(): ProveedorMl {
  const { ML_SERVICE_URL: url, ML_API_KEY: apiKey, ML_TIMEOUT_MS: timeoutMs } = env;
  if (!url || !apiKey) throw new ErrorServicioMl('Faltan ML_SERVICE_URL y ML_API_KEY.');
  const clave = `${url}|${apiKey}|${timeoutMs}`;
  if (ml?.clave !== clave) ml = { clave, proveedor: new ProveedorMl({ url, apiKey, timeoutMs }) };
  return ml.proveedor;
}

/** Olvida el estado del proveedor de ML (espera tras un fallo). Para las pruebas. */
export function reiniciarProveedores() {
  ml = null;
}

/** ML con respaldo heurístico. */
export const proveedorAuto: ProveedorPrediccion = {
  nombre: 'auto',
  async predecirVarios(db: Db, entradas: EntradaPrediccion[], fecha: string, hora: string) {
    try {
      return await proveedorMl().predecirVarios(db, entradas, fecha, hora);
    } catch (error) {
      if (!(error instanceof ErrorServicioMl)) throw error;
      if (env.NODE_ENV !== 'test') console.warn(`[predicción] ${error.message} Se usa el heurístico.`);
      const respaldo = await proveedorHeuristico.predecirVarios(db, entradas, fecha, hora);
      const marcado = new Map<number, ResultadoProveedor>();
      for (const [id, r] of respaldo) marcado.set(id, { ...r, respaldo: true });
      return marcado;
    }
  },
};

/** ML sin respaldo: si el servicio falla, 503. */
const proveedorSoloMl: ProveedorPrediccion = {
  nombre: 'ml',
  async predecirVarios(db, entradas, fecha, hora) {
    try {
      return await proveedorMl().predecirVarios(db, entradas, fecha, hora);
    } catch (error) {
      if (error instanceof ErrorServicioMl) {
        throw servicioNoDisponible(`El servicio de predicción no está disponible. ${error.message}`);
      }
      throw error;
    }
  },
};

/** Proveedor configurado en PREDICCION_PROVEEDOR. */
export function proveedorActual(): ProveedorPrediccion {
  switch (env.PREDICCION_PROVEEDOR) {
    case 'ml':
      return proveedorSoloMl;
    case 'auto':
      return proveedorAuto;
    default:
      return proveedorHeuristico;
  }
}
