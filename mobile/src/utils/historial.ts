import type { FiltroHistorial, ItemHistorial } from '../services/tipos';
import type { NombreIcono } from './categorias';
import { hoyEnColombia } from './fecha';

export const FILTROS_HISTORIAL: { valor: FiltroHistorial; etiqueta: string; icono: NombreIcono }[] = [
  { valor: 'recientes', etiqueta: 'Recientes', icono: 'history' },
  { valor: 'semana', etiqueta: 'Última semana', icono: 'date-range' },
  { valor: 'mes', etiqueta: 'Último mes', icono: 'calendar-month' },
  { valor: 'mas_vistos', etiqueta: 'Más vistos', icono: 'repeat' },
  { valor: 'populares', etiqueta: 'Populares', icono: 'local-fire-department' },
];

export interface SeccionHistorial {
  /** YYYY-MM-DD, o "todos" cuando el filtro no agrupa por día. */
  clave: string;
  titulo: string | null;
  items: ItemHistorial[];
}

const DIA_MS = 24 * 60 * 60 * 1000;

const restarDia = (fecha: string) => new Date(Date.parse(`${fecha}T12:00:00Z`) - DIA_MS).toISOString().slice(0, 10);

/** "Hoy", "Ayer" o "Lunes 12 de octubre" (con el año si no es el actual). */
export function tituloDia(dia: string, hoy = hoyEnColombia()): string {
  if (dia === hoy) return 'Hoy';
  if (dia === restarDia(hoy)) return 'Ayer';
  const fecha = new Date(`${dia}T12:00:00Z`);
  const texto = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(dia.slice(0, 4) !== hoy.slice(0, 4) && { year: 'numeric' }),
  }).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(',', '');
}

/** Agrupa los ítems seguidos del mismo día bajo un encabezado (los ítems ya vienen ordenados). */
export function seccionesPorDia(items: ItemHistorial[], hoy = hoyEnColombia()): SeccionHistorial[] {
  const secciones: SeccionHistorial[] = [];
  for (const item of items) {
    const clave = item.dia ?? 'todos';
    const ultima = secciones[secciones.length - 1];
    if (ultima && ultima.clave === clave) ultima.items.push(item);
    else secciones.push({ clave, titulo: item.dia ? tituloDia(item.dia, hoy) : null, items: [item] });
  }
  return secciones;
}

/** Une páginas sin repetir ítems (al recargar, la primera página reemplaza todo). */
export function unirPaginas(actuales: ItemHistorial[], nuevos: ItemHistorial[]): ItemHistorial[] {
  const clave = (i: ItemHistorial) => `${i.dia ?? ''}|${i.idDestino}`;
  const vistos = new Set(actuales.map(clave));
  return [...actuales, ...nuevos.filter((i) => !vistos.has(clave(i)))];
}

/** Texto secundario del ítem: "Visto 3 veces", "2 actividades · Guardado en favoritos", "42 consultas · 17 personas en 30 días". */
export function textoItem(item: ItemHistorial, filtro: FiltroHistorial): string {
  if (filtro === 'populares') {
    const personas = item.personas ?? 0;
    return `${item.veces} ${item.veces === 1 ? 'consulta' : 'consultas'} · ${personas} ${personas === 1 ? 'persona' : 'personas'} en 30 días`;
  }
  const soloVistas = item.tipos.every((t) => t === 'vista');
  const partes: string[] = [];
  if (soloVistas) partes.push(item.veces === 1 ? 'Visto' : `Visto ${item.veces} veces`);
  else if (item.veces > 1) partes.push(`${item.veces} actividades`);
  if (item.tipos.includes('favorito')) partes.push('Guardado en favoritos');
  if (item.tipos.includes('compartir')) partes.push('Compartido');
  if (item.tipos.includes('visita')) partes.push('Marcado como visitado');
  return partes.join(' · ') || 'Visto';
}
