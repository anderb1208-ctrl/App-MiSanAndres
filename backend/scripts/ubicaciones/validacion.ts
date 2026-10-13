/**
 * Validación de puntos (en tierra y dentro del cuadro de San Andrés) y aplicación
 * de las correcciones hechas a mano en docs/revision-ubicaciones.html.
 */
import { enCuadro, enTierra, redondear, type Tierra } from './geo';
import type { Ubicacion } from './publicar';

export interface PuntoNombrado {
  nombre: string;
  latitud: number;
  longitud: number;
}

export type Problema = 'fuera_del_cuadro' | 'en_el_agua' | 'coordenada_invalida';

export const MENSAJE_PROBLEMA: Record<Problema, string> = {
  fuera_del_cuadro: 'fuera del cuadro de San Andrés',
  en_el_agua: 'cae en el agua (fuera de la isla y de los cayos)',
  coordenada_invalida: 'coordenada inválida',
};

/** Problema del punto, o null si está bien. */
export function problemaDe(p: PuntoNombrado, tierra: Tierra): Problema | null {
  if (!Number.isFinite(p.latitud) || !Number.isFinite(p.longitud)) return 'coordenada_invalida';
  const punto = { lat: p.latitud, lon: p.longitud };
  if (!enCuadro(punto)) return 'fuera_del_cuadro';
  if (!enTierra(punto, tierra)) return 'en_el_agua';
  return null;
}

export function verificarPuntos(puntos: PuntoNombrado[], tierra: Tierra) {
  return puntos.flatMap((p) => {
    const problema = problemaDe(p, tierra);
    return problema ? [{ ...p, problema }] : [];
  });
}

/** Lee el JSON copiado de la página de revisión ({ correcciones: [...] } o una lista). */
export function leerCorrecciones(datos: unknown): PuntoNombrado[] {
  const lista = Array.isArray(datos) ? datos : (datos as { correcciones?: unknown })?.correcciones;
  if (!Array.isArray(lista)) throw new Error('El archivo no tiene la lista "correcciones".');
  return lista.map((c, i) => {
    const { nombre, latitud, longitud } = (c ?? {}) as Record<string, unknown>;
    if (typeof nombre !== 'string' || typeof latitud !== 'number' || typeof longitud !== 'number') {
      throw new Error(`Corrección ${i + 1}: se esperaba { nombre, latitud, longitud }.`);
    }
    return { nombre, latitud, longitud };
  });
}

/**
 * Aplica las correcciones: los destinos quedan con fuente "manual", verificados y
 * confianza alta. Rechaza nombres desconocidos y puntos fuera de tierra o del
 * cuadro (salvo `forzar`, que solo admite los que caen en el agua).
 */
export function aplicarCorrecciones(
  ubicaciones: Ubicacion[],
  correcciones: PuntoNombrado[],
  tierra: Tierra,
  opciones: { forzar?: boolean; fecha: string },
): { ubicaciones: Ubicacion[]; corregidas: Ubicacion[]; errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];
  const porNombre = new Map(ubicaciones.map((u) => [u.nombre, u]));
  const cambios = new Map<string, Ubicacion>();

  for (const c of correcciones) {
    const actual = porNombre.get(c.nombre);
    if (!actual) {
      errores.push(`"${c.nombre}" no está en scripts/ubicaciones/ubicaciones.json.`);
      continue;
    }
    const problema = problemaDe(c, tierra);
    if (problema === 'en_el_agua' && opciones.forzar) {
      avisos.push(`"${c.nombre}" ${MENSAJE_PROBLEMA[problema]}; se aplica igual (--forzar).`);
    } else if (problema) {
      errores.push(`"${c.nombre}" ${MENSAJE_PROBLEMA[problema]} (${c.latitud}, ${c.longitud}).`);
      continue;
    }
    const p = redondear({ lat: c.latitud, lon: c.longitud });
    cambios.set(c.nombre, {
      ...actual,
      latitud: p.lat,
      longitud: p.lon,
      fuente: 'manual',
      confianza: 'alta',
      verificada: true,
      metodo: `Revisado a mano en docs/revision-ubicaciones.html (${opciones.fecha})`,
      nota: null,
    });
  }

  const nuevas = ubicaciones.map((u) => cambios.get(u.nombre) ?? u);
  return { ubicaciones: nuevas, corregidas: [...cambios.values()], errores, avisos };
}
