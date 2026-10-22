/**
 * Estado de las ubicaciones (ubicaciones.json) y archivos que se generan a partir
 * de él: migración SQL, seed, página de revisión y tabla de datos por verificar.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Categoria, Confianza, Fuente, Punto, Tierra } from './geo';
import { paginaRevision } from './revisionHtml';

export interface Ubicacion {
  nombre: string;
  categoria: Categoria;
  latitud: number;
  longitud: number;
  fuente: Fuente;
  confianza: Confianza;
  verificada: boolean;
  /** Objeto de OSM usado ("way/123"), o null. */
  osm: string | null;
  /** Cómo se obtuvo el punto, en palabras. */
  metodo: string;
  nota: string | null;
  /** Coordenada aproximada de partida. */
  aprox: Punto;
}

const RAIZ = resolve(__dirname, '../../..');
export const RUTAS = {
  ubicaciones: resolve(__dirname, 'ubicaciones.json'),
  tierra: resolve(__dirname, 'tierra.geojson'),
  entrada: resolve(__dirname, 'destinos.json'),
  cacheOverpass: resolve(__dirname, '.cache/overpass.json'),
  seed: resolve(RAIZ, 'supabase/seed.sql'),
  migraciones: resolve(RAIZ, 'supabase/migrations'),
  revision: resolve(RAIZ, 'docs/revision-ubicaciones.html'),
  datosPorVerificar: resolve(RAIZ, 'docs/datos-por-verificar.md'),
};

export const leerJson = <T>(ruta: string): T => JSON.parse(readFileSync(ruta, 'utf8')) as T;
export const leerUbicaciones = () => leerJson<Ubicacion[]>(RUTAS.ubicaciones);
export const leerTierra = () => leerJson<Tierra>(RUTAS.tierra);

export function guardarUbicaciones(ubicaciones: Ubicacion[]) {
  writeFileSync(RUTAS.ubicaciones, `${JSON.stringify(ubicaciones, null, 2)}\n`, 'utf8');
}

const texto = (s: string) => `'${s.replace(/'/g, "''")}'`;
const num = (n: number) => n.toFixed(6);

/** UPDATE de coordenadas, fuente y verificación, identificando los destinos por nombre. */
export function sqlActualizacion(ubicaciones: Ubicacion[]): string {
  const filas = ubicaciones.map(
    (u) => `  (${texto(u.nombre)}, ${num(u.latitud)}, ${num(u.longitud)}, '${u.fuente}', ${u.verificada})`,
  );
  return `update public.destino as d
set latitud = v.latitud,
    longitud = v.longitud,
    ubicacion_fuente = v.fuente::public.ubicacion_fuente,
    ubicacion_verificada = v.verificada
from (values
${filas.join(',\n')}
) as v (nombre, latitud, longitud, fuente, verificada)
where d.nombre = v.nombre;`;
}

/** Versión de migración (YYYYMMDDHHMMSS) posterior a la última existente y a `ahora`. */
export function siguienteVersion(versiones: string[], ahora: Date): string {
  const formato = (d: Date) => d.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const ultima = versiones.filter((v) => /^\d{14}$/.test(v)).sort().at(-1);
  if (!ultima) return formato(ahora);
  const d = new Date(
    Date.UTC(+ultima.slice(0, 4), +ultima.slice(4, 6) - 1, +ultima.slice(6, 8), +ultima.slice(8, 10), +ultima.slice(10, 12), +ultima.slice(12, 14)),
  );
  d.setUTCMinutes(d.getUTCMinutes() + 1);
  return formato(d > ahora ? d : ahora);
}

/** Escribe supabase/migrations/<version>_<nombre>.sql y devuelve su ruta. */
export function escribirMigracion(nombre: string, encabezado: string, ubicaciones: Ubicacion[], ahora = new Date()) {
  const versiones = readdirSync(RUTAS.migraciones).map((f) => f.slice(0, 14));
  const version = siguienteVersion(versiones, ahora);
  const ruta = resolve(RUTAS.migraciones, `${version}_${nombre}.sql`);
  writeFileSync(ruta, `${encabezado}\n\n${sqlActualizacion(ubicaciones)}\n`, 'utf8');
  return { ruta, version };
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const INICIO_SEED = '-- <ubicaciones> (generado por backend/scripts/ubicaciones; no editar a mano)';
const FIN_SEED = '-- </ubicaciones>';
const ANCLA_SEED = '-- ------------------------------------------------------------\n-- Etiquetas de experiencia y grupo por destino';

/**
 * Pone las coordenadas en el INSERT de destinos del seed y mantiene un bloque que
 * fija ubicacion_fuente y ubicacion_verificada (y las coordenadas, por si el
 * INSERT cambia de forma). Devuelve el seed nuevo y los nombres que no encontró.
 */
export function actualizarSeed(seed: string, ubicaciones: Ubicacion[]): { seed: string; sinInsert: string[] } {
  let resultado = seed.replace(/\r\n/g, '\n');
  const sinInsert: string[] = [];

  for (const u of ubicaciones) {
    const inicio = resultado.indexOf(`(${texto(u.nombre)},\n`);
    if (inicio < 0) {
      sinInsert.push(u.nombre);
      continue;
    }
    const patron = /'(playa|cayo|gastronomia|actividad|naturaleza|cultura|buceo_snorkel)', (-?\d+\.\d+), (-?\d+\.\d+),/g;
    patron.lastIndex = inicio;
    const m = patron.exec(resultado);
    if (!m) {
      sinInsert.push(u.nombre);
      continue;
    }
    const nuevo = `'${m[1]}', ${num(u.latitud)}, ${num(u.longitud)},`;
    resultado = resultado.slice(0, m.index) + nuevo + resultado.slice(m.index + m[0].length);
  }

  // El bloque conserva todas las ubicaciones conocidas: se fusiona con el existente.
  const previas = leerBloqueSeed(resultado);
  const porNombre = new Map(previas.map((u) => [u.nombre, u]));
  for (const u of ubicaciones) porNombre.set(u.nombre, u);
  const bloque = `${INICIO_SEED}\n-- Punto de acceso (en tierra), origen y revisión de las coordenadas.\n${sqlActualizacion([...porNombre.values()])}\n${FIN_SEED}\n\n`;

  const i = resultado.indexOf(INICIO_SEED);
  if (i >= 0) {
    const f = resultado.indexOf(FIN_SEED, i) + FIN_SEED.length;
    resultado = resultado.slice(0, i) + bloque.trimEnd() + resultado.slice(f);
  } else {
    const ancla = resultado.indexOf(ANCLA_SEED);
    if (ancla < 0) throw new Error('No se encontró en el seed la sección de etiquetas para insertar el bloque de ubicaciones.');
    resultado = resultado.slice(0, ancla) + bloque + resultado.slice(ancla);
  }
  return { seed: resultado, sinInsert };
}

/** Ubicaciones del bloque generado en el seed (solo los campos que guarda). */
function leerBloqueSeed(seed: string): Ubicacion[] {
  const i = seed.indexOf(INICIO_SEED);
  if (i < 0) return [];
  const bloque = seed.slice(i, seed.indexOf(FIN_SEED, i));
  const fila = /\('((?:[^']|'')+)', (-?\d+\.\d+), (-?\d+\.\d+), '(osm|manual|aproximada)', (true|false)\)/g;
  return [...bloque.matchAll(fila)].map((m) => ({
    nombre: m[1]!.replace(/''/g, "'"),
    latitud: Number(m[2]),
    longitud: Number(m[3]),
    fuente: m[4] as Fuente,
    verificada: m[5] === 'true',
    categoria: 'playa',
    confianza: 'media',
    osm: null,
    metodo: '',
    nota: null,
    aprox: { lat: Number(m[2]), lon: Number(m[3]) },
  }));
}

export function escribirSeed(ubicaciones: Ubicacion[]) {
  const original = readFileSync(RUTAS.seed, 'utf8');
  const { seed, sinInsert } = actualizarSeed(original, ubicaciones);
  writeFileSync(RUTAS.seed, original.includes('\r\n') ? seed.replace(/\n/g, '\r\n') : seed, 'utf8');
  return sinInsert;
}

// ---------------------------------------------------------------------------
// Documentación y página de revisión
// ---------------------------------------------------------------------------

const INICIO_DOC = '<!-- ubicaciones:inicio (generado por backend/scripts/ubicaciones) -->';
const FIN_DOC = '<!-- ubicaciones:fin -->';

export function tablaUbicaciones(ubicaciones: Ubicacion[]): string {
  const orden: Record<Confianza, number> = { baja: 0, media: 1, alta: 2 };
  const filas = [...ubicaciones]
    .sort((a, b) => Number(a.verificada) - Number(b.verificada) || orden[a.confianza] - orden[b.confianza] || a.nombre.localeCompare(b.nombre, 'es'))
    .map((u) => {
      const estado = u.verificada ? '✅ verificada' : u.confianza;
      const osm = u.osm ? `[${u.osm}](https://www.openstreetmap.org/${u.osm})` : '—';
      return `| ${u.nombre} | ${num(u.latitud)}, ${num(u.longitud)} | ${u.fuente} | ${estado} | ${osm} | ${u.metodo}${u.nota ? `. ${u.nota}` : ''} |`;
    });
  return `${INICIO_DOC}
| Destino | Punto de acceso | Fuente | Confianza | OSM | Cómo se obtuvo |
| --- | --- | --- | --- | --- | --- |
${filas.join('\n')}
${FIN_DOC}`;
}

/**
 * docs/ es material local (no está en el repositorio): si datos-por-verificar.md no existe en
 * esta copia, se avisa y se sigue; la base, el seed y las migraciones se actualizan igual.
 */
export function escribirDoc(ubicaciones: Ubicacion[]) {
  if (!existsSync(RUTAS.datosPorVerificar)) {
    console.warn('Aviso: no existe docs/datos-por-verificar.md en esta copia; no se actualiza su tabla de ubicaciones.');
    return;
  }
  const doc = readFileSync(RUTAS.datosPorVerificar, 'utf8').replace(/\r\n/g, '\n');
  const i = doc.indexOf(INICIO_DOC);
  if (i < 0) throw new Error(`Falta el marcador ${INICIO_DOC} en docs/datos-por-verificar.md.`);
  const f = doc.indexOf(FIN_DOC, i) + FIN_DOC.length;
  writeFileSync(RUTAS.datosPorVerificar, doc.slice(0, i) + tablaUbicaciones(ubicaciones) + doc.slice(f), 'utf8');
}

export function escribirRevision(ubicaciones: Ubicacion[], tierra: Tierra, ahora = new Date()) {
  const generado = ahora.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
  mkdirSync(dirname(RUTAS.revision), { recursive: true }); // docs/ puede no existir (no está en el repositorio)
  writeFileSync(RUTAS.revision, paginaRevision(ubicaciones, tierra, generado), 'utf8');
}
