import { useEffect, useState } from 'react';

/** Devuelve `valor` cuando deja de cambiar durante `espera` ms (p. ej. texto de búsqueda). */
export function useValorDiferido<T>(valor: T, espera = 300): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDiferido(valor), espera);
    return () => clearTimeout(id);
  }, [valor, espera]);
  return diferido;
}
