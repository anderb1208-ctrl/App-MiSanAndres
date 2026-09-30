import { ErrorBaseDatos } from '../utils/errores';

interface Resultado<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

/** Devuelve `data` o lanza ErrorBaseDatos si la consulta falló. */
export function verificar<T>(resultado: Resultado<T>, operacion: string): T | null {
  if (resultado.error) throw new ErrorBaseDatos(operacion, resultado.error);
  return resultado.data;
}

/** Igual que `verificar`, pero para listas: `null` se convierte en []. */
export function verificarLista<T>(resultado: Resultado<T[]>, operacion: string): T[] {
  return verificar(resultado, operacion) ?? [];
}

/** Para escrituras sin datos de retorno: lanza ErrorBaseDatos si hubo error. */
export function verificarOperacion(
  error: { message: string; code?: string } | null,
  operacion: string,
): void {
  if (error) throw new ErrorBaseDatos(operacion, error);
}
