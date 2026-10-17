import type { Favorito } from '../services/tipos';

/** iOS admite como máximo 64 notificaciones locales pendientes; se deja margen. */
export const MAX_AVISOS_LOCALES = 60;
export const DIAS_A_PROGRAMAR = 7;
/** El aviso de cierre llega un poco antes, para alcanzar a ir o salir con tiempo. */
export const MINUTOS_ANTES_DEL_CIERRE = 30;

export interface AvisoLocal {
  idDestino: number;
  tipo: 'apertura' | 'cierre';
  fecha: Date;
  titulo: string;
  cuerpo: string;
}

const COLOMBIA_UTC = -5; // Colombia no tiene horario de verano

/** "YYYY-MM-DD" de hoy en Colombia. */
function hoyColombia(ahora: Date): string {
  return new Date(ahora.getTime() + COLOMBIA_UTC * 3600_000).toISOString().slice(0, 10);
}

/** Fecha (YYYY-MM-DD) + hora (HH:MM) en hora de Colombia → instante. */
function enColombia(fecha: string, hora: string, minutosExtra = 0): Date {
  const [y, m, d] = fecha.split('-').map(Number) as [number, number, number];
  const [hh, mm] = hora.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, d, hh - COLOMBIA_UTC, mm + minutosExtra));
}

function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

/**
 * Avisos de apertura y cierre según el HORARIO NORMAL de cada favorito, para los próximos
 * días, ordenados del más próximo al más lejano y limitados a `max` (límite de iOS).
 * - Solo los favoritos con el aviso activo y con horario.
 * - Durante un cierre temporal no se avisa (la reapertura llega por push); si el cierre
 *   tiene fecha de fin, se avisa solo después de esa fecha.
 */
export function calcularAvisosLocales(
  favoritos: Favorito[],
  ahora: Date = new Date(),
  dias = DIAS_A_PROGRAMAR,
  max = MAX_AVISOS_LOCALES,
): AvisoLocal[] {
  const avisos: AvisoLocal[] = [];
  const hoy = hoyColombia(ahora);
  const limiteInferior = ahora.getTime() + 60_000;

  for (const f of favoritos) {
    const d = f.destino;
    if (!d?.horario || d.estado === 'inactivo' || (!f.avisarApertura && !f.avisarCierre)) continue;
    let desde = limiteInferior;
    if (d.estado === 'cerrado_temporal') {
      if (!d.cierre?.hasta) continue;
      desde = Math.max(desde, new Date(d.cierre.hasta).getTime());
    }
    const { apertura, cierre } = d.horario;
    for (let i = 0; i < dias; i++) {
      const fecha = sumarDias(hoy, i);
      if (f.avisarApertura) {
        const cuando = enColombia(fecha, apertura);
        if (cuando.getTime() >= desde) {
          avisos.push({
            idDestino: d.id,
            tipo: 'apertura',
            fecha: cuando,
            titulo: `${d.nombre} ya abrió`,
            cuerpo: `Horario de hoy: ${apertura} – ${cierre}.`,
          });
        }
      }
      if (f.avisarCierre) {
        const cuando = enColombia(fecha, cierre, -MINUTOS_ANTES_DEL_CIERRE);
        if (cuando.getTime() >= desde) {
          avisos.push({
            idDestino: d.id,
            tipo: 'cierre',
            fecha: cuando,
            titulo: `${d.nombre} cierra en ${MINUTOS_ANTES_DEL_CIERRE} minutos`,
            cuerpo: `Cierra a las ${cierre} (hora de Colombia).`,
          });
        }
      }
    }
  }
  return avisos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime()).slice(0, max);
}
