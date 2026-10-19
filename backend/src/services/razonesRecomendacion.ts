/**
 * Razones de una recomendación ("Por qué es para ti"), calculadas de forma determinista con
 * los mismos datos y reglas del puntaje. Nunca se inventa nada: si falta un dato (precio,
 * presupuesto, clima, horario, reseñas), esa razón se omite.
 *
 * Cada razón es positiva (✓) o una advertencia real (⚠), con valores concretos:
 * "Ocupación alta a las 12:00 (82 %)", "Dentro de tu presupuesto: $20.000 – $40.000".
 */
import type { CategoriaDestino, NivelOcupacion } from '../models/database.types';
import type { Calificacion } from '../models/resenaModel';
import { ADJETIVO_OCUPACION } from '../utils/nivelOcupacion';
import type { Prediccion } from './prediccionService';

export type TipoRazon = 'positiva' | 'advertencia';

export type CodigoRazon =
  | 'preferencias'
  | 'presupuesto'
  | 'grupo'
  | 'ocupacion'
  | 'clima'
  | 'horario'
  | 'calificacion';

export interface Razon {
  codigo: CodigoRazon;
  texto: string;
  tipo: TipoRazon;
}

/** Razón con la frase que arma "porQue" y la versión de una línea que arma "porQueCorto". */
interface RazonInterna extends Razon {
  frase: string;
  corta: string;
}

/** Largo máximo de porQueCorto (una línea en la tarjeta de Inicio, también en un iPhone SE). */
export const MAX_POR_QUE_CORTO = 44;

export interface Presupuesto {
  minCop: number;
  maxCop: number;
}

export interface DatosRazones {
  categoria: CategoriaDestino;
  horario: { apertura: string; cierre: string } | null;
  /** Hora planeada (HH:MM). */
  hora: string;
  /** Nombres de las preferencias que coinciden (categorías y experiencias). */
  gustos: string[];
  /** Códigos de grupo del usuario que el destino admite. */
  grupos: string[];
  precio: { minCop: number; maxCop: number; estimado: boolean } | null;
  presupuesto: Presupuesto | null;
  prediccion: Prediccion | undefined;
  /** Motivo del cierre temporal, si lo hay. */
  motivoCierre: string | null;
  calificacion: Calificacion | null;
  nivelPreferido: NivelOcupacion | null;
}

/** Con menos reseñas que esto, la calificación no se usa como razón. */
export const MINIMO_RESENAS = 3;
const AIRE_LIBRE: CategoriaDestino[] = ['playa', 'cayo', 'actividad', 'naturaleza', 'buceo_snorkel'];
const CODIGOS_TORMENTA = new Set([95, 96, 99]);

export const formatearCop = (n: number) => (n === 0 ? '$0' : `$${n.toLocaleString('es-CO')}`);
const rango = (min: number, max: number) =>
  max === 0 ? 'gratis' : min === max ? formatearCop(min) : `${formatearCop(min)} – ${formatearCop(max)}`;
const decimal = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const listar = (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`);

const FRASE_GRUPO: Record<string, string> = {
  solo: 'viajar solo',
  pareja: 'ir en pareja',
  familia_ninos: 'ir en familia con niños',
  amigos: 'ir con amigos',
  adulto_mayor: 'ir con adultos mayores',
};

export type EncajePresupuesto = 'dentro' | 'parcial' | 'debajo' | 'encima';

/** Cómo encaja el rango de precio del destino en el presupuesto del usuario. */
export function encajePresupuesto(precio: { minCop: number; maxCop: number }, p: Presupuesto): EncajePresupuesto {
  if (precio.minCop > p.maxCop) return 'encima';
  if (precio.maxCop < p.minCop) return 'debajo';
  if (precio.minCop >= p.minCop && precio.maxCop <= p.maxCop) return 'dentro';
  return 'parcial';
}

/** Ajuste del puntaje por presupuesto (mismas reglas que las razones). */
export const AJUSTE_PRESUPUESTO: Record<EncajePresupuesto, number> = { dentro: 5, debajo: 5, parcial: 2, encima: -10 };
/** Ajuste por calificación (solo con al menos MINIMO_RESENAS reseñas). */
export const ajusteCalificacion = (c: Calificacion | null) =>
  !c || c.cantidad < MINIMO_RESENAS ? 0 : c.promedio >= 4 ? 3 : c.promedio < 3 ? -3 : 0;

function razonesInternas(d: DatosRazones): RazonInterna[] {
  const r: RazonInterna[] = [];
  const p = d.prediccion;
  const cerrado = p?.estado === 'Cerrado';

  if (d.gustos.length > 0) {
    r.push({ codigo: 'preferencias', tipo: 'positiva', texto: `Coincide con tus gustos: ${listar(d.gustos)}`, frase: `coincide con ${listar(d.gustos)}`, corta: `Coincide con ${d.gustos[0]}` });
  }

  if (d.precio && d.presupuesto) {
    const encaje = encajePresupuesto(d.precio, d.presupuesto);
    const estimado = d.precio.estimado ? ' (estimado)' : '';
    const valores = `${rango(d.precio.minCop, d.precio.maxCop)} por persona${estimado}`;
    if (encaje === 'dentro') r.push({ codigo: 'presupuesto', tipo: 'positiva', texto: `Dentro de tu presupuesto: ${valores}`, frase: 'está dentro de tu presupuesto', corta: 'Dentro de tu presupuesto' });
    if (encaje === 'debajo') r.push({ codigo: 'presupuesto', tipo: 'positiva', texto: `Más económico que tu presupuesto: ${valores}`, frase: 'es más económico que tu presupuesto', corta: 'Más económico que tu presupuesto' });
    if (encaje === 'parcial') r.push({ codigo: 'presupuesto', tipo: 'positiva', texto: `Parte del rango está en tu presupuesto: ${valores}`, frase: 'parte de su precio está en tu presupuesto', corta: 'Cerca de tu presupuesto' });
    if (encaje === 'encima') {
      r.push({
        codigo: 'presupuesto',
        tipo: 'advertencia',
        texto: `Por encima de tu presupuesto: desde ${formatearCop(d.precio.minCop)} por persona${estimado}`,
        frase: 'se sale de tu presupuesto',
        corta: 'Por encima de tu presupuesto',
      });
    }
  }

  const grupo = d.grupos.find((g) => FRASE_GRUPO[g]);
  if (grupo) r.push({ codigo: 'grupo', tipo: 'positiva', texto: `Apto para ${FRASE_GRUPO[grupo]}`, frase: `es apto para ${FRASE_GRUPO[grupo]}`, corta: `Apto para ${FRASE_GRUPO[grupo]}` });

  if (cerrado) {
    const texto = d.motivoCierre
      ? `Cerrado temporalmente: ${d.motivoCierre}`
      : d.horario
        ? `Cerrado a las ${d.hora} (horario: ${d.horario.apertura} – ${d.horario.cierre})`
        : `Cerrado a las ${d.hora}`;
    r.push({ codigo: 'horario', tipo: 'advertencia', texto, frase: d.motivoCierre ? 'está cerrado temporalmente' : `estará cerrado a las ${d.hora}`, corta: d.motivoCierre ? 'Cerrado temporalmente' : `Cerrado a las ${d.hora}` });
  } else if (p && d.horario) {
    r.push({ codigo: 'horario', tipo: 'positiva', texto: `Abierto a las ${d.hora} (hasta las ${d.horario.cierre})`, frase: 'estará abierto a esa hora', corta: `Abierto hasta las ${d.horario.cierre}` });
  }

  if (p && !cerrado && p.nivel) {
    const valor = `${ADJETIVO_OCUPACION[p.nivel]} a las ${d.hora} (${Math.round(p.porcentaje)} %)`;
    if (p.nivel === 'Bajo') r.push({ codigo: 'ocupacion', tipo: 'positiva', texto: `Ocupación ${valor}`, frase: `tendrá poca gente a las ${d.hora}`, corta: `Poca gente a las ${d.hora}` });
    if (p.nivel === 'Alto') r.push({ codigo: 'ocupacion', tipo: 'advertencia', texto: `Ocupación ${valor}`, frase: `habrá mucha gente a las ${d.hora}`, corta: `Mucha gente a las ${d.hora}` });
    if (p.nivel === 'Medio' && d.nivelPreferido === 'Medio') {
      r.push({ codigo: 'ocupacion', tipo: 'positiva', texto: `Ocupación ${valor}, como prefieres`, frase: 'tendrá la ocupación media que prefieres', corta: 'La ocupación media que prefieres' });
    }
  }

  const clima = p?.clima;
  if (clima && !cerrado && AIRE_LIBRE.includes(d.categoria)) {
    const tormenta = clima.codigoClima !== null && CODIGOS_TORMENTA.has(clima.codigoClima);
    const lluvia = (clima.probLluvia ?? 0) >= 60 || (clima.precipitacion ?? 0) >= 0.5;
    if (tormenta) {
      r.push({ codigo: 'clima', tipo: 'advertencia', texto: `Tormenta prevista a las ${d.hora}`, frase: `se prevé tormenta a las ${d.hora}`, corta: `Tormenta prevista a las ${d.hora}` });
    } else if (lluvia) {
      const prob = clima.probLluvia !== null ? ` (${clima.probLluvia} % de probabilidad)` : '';
      r.push({ codigo: 'clima', tipo: 'advertencia', texto: `Lluvia probable a las ${d.hora}${prob}`, frase: `puede llover a las ${d.hora}`, corta: `Puede llover a las ${d.hora}` });
    } else if (clima.probLluvia !== null || clima.temperatura !== null) {
      const partes = [
        clima.temperatura !== null ? `${Math.round(clima.temperatura)} °C` : null,
        clima.probLluvia !== null ? `${clima.probLluvia} % de probabilidad de lluvia` : null,
      ].filter(Boolean);
      r.push({ codigo: 'clima', tipo: 'positiva', texto: `Buen clima a las ${d.hora}: ${partes.join(' y ')}`, frase: 'se espera buen clima', corta: 'Buen clima previsto' });
    }
  }

  const c = d.calificacion;
  if (c && c.cantidad >= MINIMO_RESENAS) {
    const valor = `${decimal(c.promedio)} ★ (${c.cantidad} reseñas)`;
    if (c.promedio >= 4) r.push({ codigo: 'calificacion', tipo: 'positiva', texto: `Buena calificación: ${valor}`, frase: 'tiene buenas reseñas', corta: `Bien calificado: ${decimal(c.promedio)} ★` });
    if (c.promedio < 3) r.push({ codigo: 'calificacion', tipo: 'advertencia', texto: `Calificación baja: ${valor}`, frase: 'tiene reseñas bajas', corta: 'Calificación baja' });
  }

  // Primero las positivas y luego las advertencias, conservando el orden de importancia.
  return [...r.filter((x) => x.tipo === 'positiva'), ...r.filter((x) => x.tipo === 'advertencia')];
}

const mayuscula = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** Recorta a MAX_POR_QUE_CORTO caracteres sin partir palabras. */
export function recortar(texto: string, max = MAX_POR_QUE_CORTO): string {
  if (texto.length <= max) return texto;
  const corte = texto.slice(0, max - 1);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > max / 2 ? corte.slice(0, espacio) : corte).replace(/[,:;]$/, '')}…`;
}

/**
 * Razones, frase "porQue" ("Coincide con Cayos y está dentro de tu presupuesto, aunque…") y
 * "porQueCorto": UNA razón breve para las tarjetas de Inicio (la primera positiva o, si no hay,
 * la primera advertencia), de una línea.
 */
export function explicar(d: DatosRazones): { razones: Razon[]; porQue: string; porQueCorto: string } {
  const internas = razonesInternas(d);
  const positivas = internas.filter((x) => x.tipo === 'positiva').slice(0, 2).map((x) => x.frase);
  const advertencia = internas.find((x) => x.tipo === 'advertencia')?.frase;
  let porQue = positivas.length > 0 ? listar(positivas) : '';
  if (advertencia) porQue = porQue ? `${porQue}, aunque ${advertencia}` : advertencia;
  return {
    razones: internas.map(({ codigo, texto, tipo }) => ({ codigo, texto, tipo })),
    porQue: porQue ? `${mayuscula(porQue)}.` : '',
    porQueCorto: internas[0] ? recortar(internas[0].corta) : '',
  };
}
