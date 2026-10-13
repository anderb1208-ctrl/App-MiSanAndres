/**
 * Geolocaliza los destinos con OpenStreetMap y calcula su PUNTO DE ACCESO en tierra.
 *
 * Uso (desde backend/):
 *   npm run ubicaciones:geolocalizar [-- --overpass] [-- --incluir-verificados]
 *
 *   --overpass              vuelve a descargar los datos de Overpass (si no, usa la caché)
 *   --incluir-verificados   recalcula también los destinos corregidos a mano
 *
 * Entrada: scripts/ubicaciones/destinos.json (nombre, categoría, coordenada
 * aproximada y términos de búsqueda). Para agregar un destino basta con añadirlo
 * allí; no hace falta tocar este código.
 *
 * Por cada destino:
 *   1. Busca el lugar por nombre en Nominatim, dentro del cuadro de San Andrés
 *      (máximo 1 petición por segundo, User-Agent identificable).
 *   2. Calcula el punto de acceso según la categoría, con la geometría de OSM y los
 *      datos de Overpass (costa, playas, caminos y muelles):
 *        playa  → punto de la playa más cercano a una calle o camino
 *        cayo   → extremo del muelle si existe; si no, la orilla más cercana a la isla
 *        resto  → ubicación del elemento o su entrada (lagunas: orilla junto al camino)
 *   3. Comprueba que el punto cae en tierra (contorno de la isla o del cayo en OSM);
 *      si cae en el agua, lo lleva al punto de tierra más cercano.
 *   4. Asigna confianza (alta, media, baja) y fuente (osm o aproximada). Si OSM no
 *      tiene el lugar, deja la coordenada aproximada con confianza baja.
 *
 * Salida: scripts/ubicaciones/ubicaciones.json y tierra.geojson, una migración en
 * supabase/migrations, el seed, docs/revision-ubicaciones.html y la tabla de
 * docs/datos-por-verificar.md.
 *
 * Datos © colaboradores de OpenStreetMap (ODbL), https://www.openstreetmap.org/copyright
 */
import { existsSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import type { Geometry, LineString, MultiPolygon, Polygon, Position } from 'geojson';
import * as turf from '@turf/turf';
import {
  aPunto,
  bajarConfianza,
  type Categoria,
  type Confianza,
  cayoCercano,
  construirTierra,
  costaMasCercana,
  distanciaATierra,
  distanciaM,
  enCuadro,
  enTierra as enTierraDe,
  islaPrincipal,
  type Linea,
  llevarATierra,
  type Punto,
  puntoDeCayo,
  puntoInterior,
  puntoMasCercanoACamino,
  redondear,
  type Tierra,
  unirAnillos,
} from './ubicaciones/geo';
import { buscarNominatim, consultarOverpass, type ElementoOverpass, posiciones, type ResultadoNominatim } from './ubicaciones/osm';
import {
  escribirDoc,
  escribirMigracion,
  escribirRevision,
  escribirSeed,
  guardarUbicaciones,
  leerJson,
  leerUbicaciones,
  RUTAS,
  type Ubicacion,
} from './ubicaciones/publicar';

interface DestinoEntrada {
  nombre: string;
  categoria: Categoria;
  aprox: Punto;
  /** Términos de búsqueda; por defecto el nombre. Vacío = sin objeto en OSM. */
  buscar?: string[];
  /** Tipos de OSM aceptados ("categoria/tipo" o "categoria/*"). Si se indican, no se aceptan otros. */
  tipos?: string[];
  /** Distancia máxima (km) entre la coordenada aproximada y el resultado. */
  maxKm?: number;
  /** Lugar de referencia (nombre en OSM) para elegir qué parte de una playa larga es el acceso. */
  cerca?: string;
  /** Destino que funciona en el mismo lugar (no se marca como coincidencia sospechosa). */
  mismoLugarQue?: string;
  nota?: string;
}

const TIPOS_POR_CATEGORIA: Record<Categoria, string[]> = {
  playa: ['natural/beach'],
  cayo: ['place/islet', 'place/island'],
  gastronomia: ['amenity/restaurant', 'amenity/cafe', 'amenity/fast_food', 'amenity/bar', 'amenity/pub'],
  actividad: ['tourism/attraction', 'tourism/viewpoint', 'leisure/*', 'amenity/dive_centre', 'shop/scuba_diving'],
  buceo_snorkel: ['tourism/attraction', 'amenity/dive_centre', 'shop/scuba_diving'],
  naturaleza: ['natural/*', 'water/*', 'tourism/attraction', 'tourism/viewpoint', 'leisure/park', 'leisure/nature_reserve'],
  cultura: ['tourism/museum', 'tourism/attraction', 'amenity/place_of_worship', 'historic/*', 'tourism/artwork'],
};

/** Palabras que no sirven para decidir si un resultado es el lugar buscado. */
const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'the', 'san', 'andres', 'playa', 'cayo', 'isla']);
const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
const palabras = (s: string) => normalizar(s).split(/\s+/).filter((p) => p.length > 2 && !VACIAS.has(p));

/** El nombre del resultado comparte alguna palabra significativa con el término. */
function nombreCoincide(r: ResultadoNominatim, termino: string): boolean {
  const deResultado = new Set(palabras(r.name || r.display_name.split(',')[0] || ''));
  return palabras(termino).some((p) => deResultado.has(p));
}

const tipoDe = (r: ResultadoNominatim) => `${r.category}/${r.type}`;
const coincideTipo = (r: ResultadoNominatim, tipos: string[]) =>
  tipos.some((t) => (t.endsWith('/*') ? r.category === t.slice(0, -2) : tipoDe(r) === t));
const puntoDe = (r: ResultadoNominatim): Punto => ({ lat: Number(r.lat), lon: Number(r.lon) });
const refOsm = (r: ResultadoNominatim) => `${r.osm_type}/${r.osm_id}`;
const m = (n: number) => `${Math.round(n)} m`;

// ---------------------------------------------------------------------------
// Datos de Overpass
// ---------------------------------------------------------------------------

interface DatosOsm {
  tierra: Tierra;
  caminos: Linea[];
  muelles: Linea[];
  playas: { geom: Polygon | LineString; nombre: string | null; ref: string }[];
  entradas: Punto[];
}

const EXCLUIR_CAMINOS = new Set(['proposed', 'construction', 'platform', 'bus_stop', 'elevator', 'raceway', 'abandoned']);

function prepararDatos(elementos: ElementoOverpass[]): DatosOsm {
  const ways = elementos.filter((e) => e.type === 'way' && e.geometry && e.geometry.length >= 2);
  const cerrado = (c: Position[]) => c.length >= 4 && c[0]![0] === c.at(-1)![0] && c[0]![1] === c.at(-1)![1];

  // Tierra: costa (tramos unidos en anillos) + islas e islotes dibujados como área.
  const costa = ways.filter((w) => w.tags?.natural === 'coastline');
  const anillos: { coords: Position[]; nombre: string | null }[] = [];
  for (const w of costa) {
    const c = posiciones(w.geometry);
    if (cerrado(c)) anillos.push({ coords: c, nombre: w.tags?.name ?? null });
  }
  for (const a of unirAnillos(costa.map((w) => posiciones(w.geometry)).filter((c) => !cerrado(c)))) {
    anillos.push({ coords: a, nombre: null });
  }
  for (const w of ways.filter((w) => /^(island|islet)$/.test(w.tags?.place ?? '') && w.tags?.natural !== 'coastline')) {
    const c = posiciones(w.geometry);
    if (cerrado(c)) anillos.push({ coords: c, nombre: w.tags?.name ?? null });
  }
  for (const r of elementos.filter((e) => e.type === 'relation' && /^(island|islet)$/.test(e.tags?.place ?? ''))) {
    const exteriores = (r.members ?? []).filter((mm) => mm.role === 'outer' && mm.geometry).map((mm) => posiciones(mm.geometry));
    for (const a of unirAnillos(exteriores)) anillos.push({ coords: a, nombre: r.tags?.name ?? null });
  }
  const tierra = construirTierra(anillos);

  const caminos = ways
    .filter((w) => w.tags?.highway && !EXCLUIR_CAMINOS.has(w.tags.highway))
    .map((w) => turf.lineString(posiciones(w.geometry)));
  const muelles = ways
    .filter((w) => /^(pier|quay|breakwater)$/.test(w.tags?.man_made ?? ''))
    .map((w) => turf.lineString(posiciones(w.geometry)));

  const playas: DatosOsm['playas'] = [];
  for (const w of ways.filter((w) => w.tags?.natural === 'beach')) {
    const c = posiciones(w.geometry);
    playas.push({
      geom: cerrado(c) ? { type: 'Polygon', coordinates: [c] } : { type: 'LineString', coordinates: c },
      nombre: w.tags?.name ?? null,
      ref: `way/${w.id}`,
    });
  }
  for (const r of elementos.filter((e) => e.type === 'relation' && e.tags?.natural === 'beach')) {
    const exteriores = (r.members ?? []).filter((mm) => mm.role === 'outer' && mm.geometry).map((mm) => posiciones(mm.geometry));
    for (const a of unirAnillos(exteriores)) playas.push({ geom: { type: 'Polygon', coordinates: [a] }, nombre: r.tags?.name ?? null, ref: `relation/${r.id}` });
  }

  const entradas = elementos
    .filter((e) => e.type === 'node' && e.tags?.entrance && e.lat !== undefined && e.lon !== undefined)
    .map((e) => ({ lat: e.lat!, lon: e.lon! }));

  return { tierra, caminos, muelles, playas, entradas };
}

/** Distancia (m) de un punto a una geometría de playa (0 si está dentro). */
function distanciaAGeom(p: Punto, geom: Polygon | LineString): number {
  if (geom.type === 'Polygon') return distanciaATierra(p, turf.feature(geom));
  return turf.pointToLineDistance(turf.point([p.lon, p.lat]), turf.lineString(geom.coordinates), { units: 'meters' });
}

function playaCercana(p: Punto, playas: DatosOsm['playas'], maxM: number, soloSinNombre = false) {
  let mejor: { playa: DatosOsm['playas'][number]; d: number } | null = null;
  for (const playa of playas) {
    if (soloSinNombre && playa.nombre) continue;
    const d = distanciaAGeom(p, playa.geom);
    if (d <= maxM && (!mejor || d < mejor.d)) mejor = { playa, d };
  }
  return mejor?.playa ?? null;
}

// ---------------------------------------------------------------------------
// Búsqueda en Nominatim
// ---------------------------------------------------------------------------

interface Encontrado {
  r: ResultadoNominatim;
  /** El tipo de OSM es uno de los esperados para la categoría. */
  tipoOk: boolean;
}

async function buscar(d: DestinoEntrada): Promise<Encontrado | null> {
  const terminos = d.buscar ?? [d.nombre];
  const tipos = d.tipos ?? TIPOS_POR_CATEGORIA[d.categoria];
  const maxM = (d.maxKm ?? 6) * 1000;
  let respaldo: ResultadoNominatim | null = null;
  const masCercano = (lista: ResultadoNominatim[]) =>
    lista.sort((a, b) => distanciaM(d.aprox, puntoDe(a)) - distanciaM(d.aprox, puntoDe(b)))[0] ?? null;

  for (const termino of terminos) {
    const resultados = (await buscarNominatim(termino)).filter(
      (r) => r.category !== 'highway' && nombreCoincide(r, termino) && distanciaM(d.aprox, puntoDe(r)) <= maxM,
    );
    const preferido = masCercano(resultados.filter((r) => coincideTipo(r, tipos)));
    if (preferido) return { r: preferido, tipoOk: true };
    // Sin tipos explícitos se acepta, como respaldo, otro tipo de objeto con ese nombre.
    if (!d.tipos && !respaldo) respaldo = masCercano(resultados.filter((r) => r.category !== 'boundary'));
  }
  return respaldo ? { r: respaldo, tipoOk: false } : null;
}

// ---------------------------------------------------------------------------
// Punto de acceso
// ---------------------------------------------------------------------------

interface Calculo {
  punto: Punto;
  confianza: Confianza;
  metodo: string;
  osm: string | null;
}

const esGeomArea = (g: Geometry | undefined): g is Polygon | MultiPolygon => g?.type === 'Polygon' || g?.type === 'MultiPolygon';
const esLinea = (g: Geometry | undefined): g is LineString => g?.type === 'LineString';

function accesoPlaya(d: DestinoEntrada, e: Encontrado | null, osm: DatosOsm, referencia: Encontrado | null): Calculo {
  if (e && e.r.category === 'natural' && e.r.type === 'beach') {
    const g = e.r.geojson;
    if (esGeomArea(g) || esLinea(g)) {
      const cerca = referencia ? { cercaDe: puntoDe(referencia.r), radioM: 150 } : {};
      const acceso = puntoMasCercanoACamino(g, osm.caminos, cerca)!;
      const junto = referencia ? ` junto a "${referencia.r.name}"` : '';
      return {
        punto: acceso.punto,
        confianza: acceso.distanciaCamino <= 150 ? 'alta' : 'media',
        metodo: `Playa "${e.r.name}" de OSM: punto${junto} más cercano a una calle o camino (a ${m(acceso.distanciaCamino)})`,
        osm: refOsm(e.r),
      };
    }
    const geom = playaCercana(puntoDe(e.r), osm.playas, 150);
    if (geom) {
      const acceso = puntoMasCercanoACamino(geom.geom, osm.caminos, { cercaDe: puntoDe(e.r), radioM: 150 })!;
      return { punto: acceso.punto, confianza: 'media', metodo: `Playa "${e.r.name}" (punto en OSM) y contorno de playa vecino: punto más cercano a un camino`, osm: refOsm(e.r) };
    }
    return { punto: puntoDe(e.r), confianza: 'media', metodo: `Playa "${e.r.name}" de OSM, que solo la tiene como punto`, osm: refOsm(e.r) };
  }

  if (e) {
    // El nombre corresponde a otra cosa (p. ej., el cayo frente a la playa): se usa la playa más cercana a ese objeto.
    const ref = puntoDe(e.r);
    const geom = playaCercana(ref, osm.playas, 500);
    if (geom) {
      const acceso = puntoMasCercanoACamino(geom.geom, osm.caminos, { cercaDe: ref, radioM: 350 })!;
      return {
        punto: acceso.punto,
        confianza: 'media',
        metodo: `Playa de OSM (${geom.ref}) junto a "${e.r.name}" (${tipoDe(e.r)}): punto más cercano a un camino`,
        osm: geom.ref,
      };
    }
    if (e.r.category === 'place') {
      // El nombre es el del sector (p. ej., San Luis): la costa más cercana a su centro.
      const costa = costaMasCercana(ref, osm.tierra);
      if (costa) {
        return { punto: costa, confianza: 'baja', metodo: `OSM no tiene la playa: costa más cercana al centro del sector "${e.r.name}"`, osm: refOsm(e.r) };
      }
    }
    return { punto: ref, confianza: 'media', metodo: `"${e.r.name}" (${tipoDe(e.r)}) de OSM; no hay contorno de playa cerca`, osm: refOsm(e.r) };
  }

  const sinNombre = playaCercana(d.aprox, osm.playas, 300, true);
  if (sinNombre) {
    const acceso = puntoMasCercanoACamino(sinNombre.geom, osm.caminos)!;
    return { punto: acceso.punto, confianza: 'media', metodo: `Playa sin nombre de OSM (${sinNombre.ref}) junto a la coordenada aproximada: punto más cercano a un camino`, osm: sinNombre.ref };
  }
  return { punto: d.aprox, confianza: 'baja', metodo: 'OSM no tiene esta playa: coordenada aproximada', osm: null };
}

function accesoCayo(d: DestinoEntrada, e: Encontrado | null, osm: DatosOsm): Calculo {
  if (!e) return { punto: d.aprox, confianza: 'baja', metodo: 'OSM no tiene este cayo: coordenada aproximada', osm: null };
  const ref = puntoDe(e.r);
  const cayo = cayoCercano(ref, osm.tierra, 500);
  if (!cayo) return { punto: ref, confianza: 'media', metodo: `"${e.r.name}" de OSM, sin contorno del cayo`, osm: refOsm(e.r) };
  const acceso = puntoDeCayo(cayo, osm.muelles, islaPrincipal(osm.tierra));
  return acceso.metodo === 'muelle'
    ? { punto: acceso.punto, confianza: 'alta', metodo: `Muelle del cayo en OSM ("${e.r.name}")`, osm: refOsm(e.r) }
    : { punto: acceso.punto, confianza: 'media', metodo: `Sin muelle en OSM: orilla de "${e.r.name}" más cercana a la isla principal`, osm: refOsm(e.r) };
}

function accesoElemento(d: DestinoEntrada, e: Encontrado | null, osm: DatosOsm): Calculo {
  if (!e) return { punto: d.aprox, confianza: 'baja', metodo: 'Sin objeto en OSM: coordenada aproximada', osm: null };
  const base = e.tipoOk ? 'alta' : 'media';
  const g = e.r.geojson;
  const nombre = `"${e.r.name}" (${tipoDe(e.r)})`;

  if (esGeomArea(g)) {
    const esAgua = e.r.category === 'water' || ['water', 'pond', 'lake', 'reservoir'].includes(e.r.type);
    if (esAgua) {
      const acceso = puntoMasCercanoACamino(g, osm.caminos)!;
      return { punto: acceso.punto, confianza: 'media', metodo: `${nombre} de OSM: orilla más cercana a un camino (a ${m(acceso.distanciaCamino)})`, osm: refOsm(e.r) };
    }
    const area = turf.feature(g);
    const entrada = osm.entradas.find((p) => turf.booleanPointInPolygon(turf.point([p.lon, p.lat]), area) || distanciaATierra(p, area) <= 20);
    if (entrada) return { punto: entrada, confianza: base, metodo: `Entrada de ${nombre} en OSM`, osm: refOsm(e.r) };
    const grande = turf.area(area) > 5000;
    return {
      punto: puntoInterior(g),
      confianza: grande ? bajarConfianza(base) : base,
      metodo: `Centro de ${nombre} en OSM${grande ? ' (área grande sin entrada marcada)' : ''}`,
      osm: refOsm(e.r),
    };
  }
  if (esLinea(g)) {
    const linea = turf.lineString(g.coordinates);
    const medio = turf.along(linea, turf.length(linea) / 2);
    return { punto: aPunto(medio.geometry.coordinates), confianza: 'media', metodo: `Punto medio de ${nombre} en OSM`, osm: refOsm(e.r) };
  }
  return { punto: puntoDe(e.r), confianza: base, metodo: `Ubicación de ${nombre} en OSM`, osm: refOsm(e.r) };
}

async function geolocalizar(d: DestinoEntrada, osm: DatosOsm): Promise<Ubicacion> {
  const e = d.buscar && d.buscar.length === 0 ? null : await buscar(d);
  const referencia = d.cerca ? await buscar({ ...d, buscar: [d.cerca], tipos: undefined }) : null;
  const calculo =
    d.categoria === 'playa' ? accesoPlaya(d, e, osm, referencia) : d.categoria === 'cayo' ? accesoCayo(d, e, osm) : accesoElemento(d, e, osm);

  const notas: string[] = [];
  if (d.nota) notas.push(d.nota);
  let confianza = calculo.confianza;

  // Solo los cayos quedan en otro polígono: el resto, si cae en el agua, va a la isla principal.
  const principal = islaPrincipal(osm.tierra)!;
  const tierraDestino =
    d.categoria === 'cayo' || enTierraDe(calculo.punto, osm.tierra)
      ? osm.tierra
      : { ...osm.tierra, features: [principal] };
  const enTierra = llevarATierra(calculo.punto, tierraDestino);
  if (enTierra.movidoM > 30) {
    confianza = bajarConfianza(confianza);
    notas.push(`Caía en el agua: se movió ${m(enTierra.movidoM)} a tierra`);
  } else if (enTierra.movidoM > 0) {
    notas.push(`Ajustado ${m(enTierra.movidoM)} a tierra`);
  }
  const punto = redondear(enTierra.punto);

  const desplazamiento = distanciaM(d.aprox, punto);
  if (calculo.osm && desplazamiento > 4000) {
    confianza = bajarConfianza(confianza);
    notas.push(`Queda a ${(desplazamiento / 1000).toFixed(1)} km de la coordenada aproximada: confirmar que es el mismo lugar`);
  } else if (desplazamiento > 500) {
    notas.push(`A ${(desplazamiento / 1000).toFixed(1)} km de la coordenada anterior`);
  }
  if (!enCuadro(punto)) {
    confianza = 'baja';
    notas.push('Fuera del cuadro de San Andrés');
  }

  return {
    nombre: d.nombre,
    categoria: d.categoria,
    latitud: punto.lat,
    longitud: punto.lon,
    // Sin el lugar en OSM (aunque se haya usado un objeto vecino como referencia) la fuente es aproximada.
    fuente: calculo.osm && calculo.confianza !== 'baja' ? 'osm' : 'aproximada',
    confianza,
    verificada: false,
    osm: calculo.osm,
    metodo: calculo.metodo,
    nota: notas.length > 0 ? notas.map((n) => n.replace(/.$/, '')).join('. ') : null,
    aprox: d.aprox,
  };
}

// ---------------------------------------------------------------------------

/** Dos destinos a menos de 25 m: probablemente uno de los dos está mal. Se anota y baja la confianza. */
function marcarCoincidencias(ubicaciones: Ubicacion[], entrada: DestinoEntrada[]) {
  const permitido = (a: string, b: string) =>
    entrada.some((d) => (d.nombre === a && d.mismoLugarQue === b) || (d.nombre === b && d.mismoLugarQue === a));
  for (const a of ubicaciones) {
    if (a.verificada) continue;
    const otros = ubicaciones.filter(
      (b) => b !== a && !permitido(a.nombre, b.nombre) && distanciaM({ lat: a.latitud, lon: a.longitud }, { lat: b.latitud, lon: b.longitud }) < 25,
    );
    if (otros.length === 0) continue;
    a.confianza = bajarConfianza(a.confianza);
    a.nota = [a.nota, `Casi en el mismo punto que ${otros.map((o) => o.nombre).join(', ')}: revisar`].filter(Boolean).join('. ');
  }
}

async function main() {
  const forzarOverpass = process.argv.includes('--overpass');
  const incluirVerificados = process.argv.includes('--incluir-verificados');
  const { destinos } = leerJson<{ destinos: DestinoEntrada[] }>(RUTAS.entrada);
  const previas = new Map((existsSync(RUTAS.ubicaciones) ? leerUbicaciones() : []).map((u) => [u.nombre, u]));

  console.log('Descargando datos de OpenStreetMap (Overpass)…');
  const osm = prepararDatos(await consultarOverpass(RUTAS.cacheOverpass, forzarOverpass));
  if (!islaPrincipal(osm.tierra)) throw new Error('No se pudo armar el contorno de la isla con la costa de OSM.');
  writeFileSync(RUTAS.tierra, `${JSON.stringify(osm.tierra)}\n`, 'utf8');
  console.log(`Tierra: ${osm.tierra.features.length} polígonos · caminos: ${osm.caminos.length} · muelles: ${osm.muelles.length} · playas: ${osm.playas.length}`);

  const resultado: Ubicacion[] = [];
  const recalculadas: Ubicacion[] = [];
  for (const d of destinos) {
    const previa = previas.get(d.nombre);
    if (previa && (previa.verificada || previa.fuente === 'manual') && !incluirVerificados) {
      resultado.push(previa);
      console.log(`= ${d.nombre}: verificada a mano, se conserva`);
      continue;
    }
    const u = await geolocalizar(d, osm);
    resultado.push(u);
    recalculadas.push(u);
    console.log(`${u.confianza === 'alta' ? '✔' : u.confianza === 'media' ? '~' : '✘'} ${u.nombre}: ${u.latitud}, ${u.longitud} [${u.fuente}, ${u.confianza}] ${u.metodo}${u.nota ? ` — ${u.nota}` : ''}`);
  }

  marcarCoincidencias(resultado, destinos);
  guardarUbicaciones(resultado);
  if (recalculadas.length > 0) {
    const { ruta } = escribirMigracion(
      'ubicaciones_osm',
      `-- Punto de acceso (en tierra) de los destinos, calculado con OpenStreetMap.
-- Generado por backend/scripts/geolocalizar-destinos.ts el ${new Date().toISOString()}.
-- Datos © colaboradores de OpenStreetMap (ODbL). Detalle por destino: docs/datos-por-verificar.md.
-- Solo actualiza filas existentes (por nombre): no borra nada.`,
      recalculadas,
    );
    console.log(`Migración: ${relative(process.cwd(), ruta)}`);
  }
  const sinInsert = escribirSeed(resultado);
  if (sinInsert.length > 0) console.warn(`Aviso: no se encontró en el INSERT del seed: ${sinInsert.join(', ')}`);
  escribirDoc(resultado);
  escribirRevision(resultado, osm.tierra);

  const cuenta = (c: Confianza) => resultado.filter((u) => !u.verificada && u.confianza === c).length;
  console.log(`\nListo: ${resultado.length} destinos · alta ${cuenta('alta')} · media ${cuenta('media')} · baja ${cuenta('baja')} · verificados ${resultado.filter((u) => u.verificada).length}`);
  console.log('Revisa los puntos en docs/revision-ubicaciones.html.');
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});

