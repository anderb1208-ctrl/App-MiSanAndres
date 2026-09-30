import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

interface EstadoAsync<T> {
  datos: T | undefined;
  error: unknown;
  /** Primera carga (sin datos todavía). */
  cargando: boolean;
  /** Recarga con datos ya visibles (pull-to-refresh o al volver a la pantalla). */
  refrescando: boolean;
  recargar: () => void;
}

interface Opciones {
  /** Vuelve a cargar en silencio cada vez que la pantalla recupera el foco. */
  recargarAlEnfocar?: boolean;
}

/**
 * Ejecuta una función asíncrona y expone carga, error y recarga.
 * Ignora respuestas que llegan tarde (si cambian las dependencias o se desmonta).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList, opciones: Opciones = {}): EstadoAsync<T> {
  const [datos, setDatos] = useState<T>();
  const [error, setError] = useState<unknown>();
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const ultimaPeticion = useRef(0);
  const hayDatos = useRef(false);
  const primerFoco = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ejecutar = useCallback(fn, deps);

  const cargar = useCallback(
    async (silencioso: boolean) => {
      const id = ++ultimaPeticion.current;
      if (silencioso && hayDatos.current) setRefrescando(true);
      else setCargando(true);
      setError(undefined);
      try {
        const resultado = await ejecutar();
        if (id !== ultimaPeticion.current) return;
        hayDatos.current = true;
        setDatos(resultado);
      } catch (e) {
        if (id !== ultimaPeticion.current) return;
        setError(e);
      } finally {
        if (id === ultimaPeticion.current) {
          setCargando(false);
          setRefrescando(false);
        }
      }
    },
    [ejecutar],
  );

  useEffect(() => {
    hayDatos.current = false;
    setDatos(undefined);
    void cargar(false);
    return () => {
      ultimaPeticion.current++;
    };
  }, [cargar]);

  useFocusEffect(
    useCallback(() => {
      if (primerFoco.current) {
        primerFoco.current = false;
        return;
      }
      if (opciones.recargarAlEnfocar) void cargar(true);
    }, [cargar, opciones.recargarAlEnfocar]),
  );

  const recargar = useCallback(() => void cargar(true), [cargar]);

  return { datos, error, cargando: cargando && datos === undefined, refrescando, recargar };
}
