/**
 * Geometría de la geolocalización de destinos (funciones puras, sin red).
 *
 * Convención: latitud/longitud de un destino son su PUNTO DE ACCESO y siempre
 * caen en tierra (playas: acceso desde la calle; cayos: muelle o desembarque;
 * el resto: entrada o ubicación del lugar). Ver docs/cambios-al-diseno.md.
 *
 * GeoJSON usa [longitud, latitud]; `Punto` usa nombres explícitos para evitar
 * confundirlos.
 */
import * as turf from '@turf/turf';
import type { Feature, FeatureCollection, LineString, MultiPolygon, Point, Polygon, Position } from 'geojson';

export type Categoria = 'playa' | 'cayo' | 'gastronomia' | 'actividad' | 'naturaleza' | 'cultura' | 'buceo_snorkel';
export type Confianza = 'alta' | 'media' | 'baja';
export type Fuente = 'osm' | 'manual' | 'aproximada';

export interface Punto {
  lat: number;
  lon: number;
}

/** Propiedades de cada polígono de tierra (isla o cayo). */
export interface PropsTierra {
  nombre: string | null;
  /** true solo para la isla de San Andrés. */
  principal: boolean;
}

export type Tierra = FeatureCollection<Polygon | MultiPolygon, PropsTierra>;
export type Linea = Feature<LineString>;

/**
 * Cuadro de San Andrés: la isla, sus cayos cercanos y los Cayos del Este-Sudeste
 * (Cayo Bolívar). No incluye Providencia ni los cayos del norte.
 */
export const CUADRO_SAN_ANDRES = { sur: 12.38, oeste: -81.76, norte: 12.62, este: -81.44 } as const;

/** Lado del cuadro como viewbox de Nominatim: oeste,norte,este,sur. */
export const VIEWBOX_NOMINATIM = `${CUADRO_SAN_ANDRES.oeste},${CUADRO_SAN_ANDRES.norte},${CUADRO_SAN_ANDRES.este},${CUADRO_SAN_ANDRES.sur}`;

const M = { units: 'meters' } as const;

export const aPosicion = (p: Punto): Position => [p.lon, p.lat];
export const aPunto = (pos: Position): Punto => ({ lat: pos[1]!, lon: pos[0]! });
const pt = (p: Punto) => turf.point(aPosicion(p));

/** Redondea a 6 decimales (≈ 0,1 m), la precisión de la columna NUMERIC(9,6). */
export const redondear = (p: Punto): Punto => ({
  lat: Math.round(p.lat * 1e6) / 1e6,
  lon: Math.round(p.lon * 1e6) / 1e6,
});

export const distanciaM = (a: Punto, b: Punto) => turf.distance(pt(a), pt(b), M);

export function enCuadro(p: Punto): boolean {
  const c = CUADRO_SAN_ANDRES;
  return p.lat >= c.sur && p.lat <= c.norte && p.lon >= c.oeste && p.lon <= c.este;
}

/** Polígono de tierra que contiene el punto, o null si cae en el agua. */
export function tierraQueContiene(p: Punto, tierra: Tierra): Feature<Polygon | MultiPolygon, PropsTierra> | null {
  const punto = pt(p);
  return tierra.features.find((f) => turf.booleanPointInPolygon(punto, f)) ?? null;
}

export const enTierra = (p: Punto, tierra: Tierra) => tierraQueContiene(p, tierra) !== null;

/** Bordes de un polígono (o multipolígono) como líneas. */
function bordes(f: Feature<Polygon | MultiPolygon>): Linea[] {
  const anillos = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
  return anillos.map((anillo) => turf.lineString(anillo));
}

/** Punto del borde más cercano y su distancia en metros. */
function masCercanoEnBorde(p: Punto, f: Feature<Polygon | MultiPolygon>): { punto: Punto; distancia: number } {
  let mejor = { punto: p, distancia: Infinity };
  for (const borde of bordes(f)) {
    const cercano = turf.nearestPointOnLine(borde, pt(p), M);
    const distancia = cercano.properties.dist ?? Infinity;
    if (distancia < mejor.distancia) mejor = { punto: aPunto(cercano.geometry.coordinates), distancia };
  }
  return mejor;
}

/** Distancia (m) de un punto al polígono: 0 si está dentro. */
export function distanciaATierra(p: Punto, f: Feature<Polygon | MultiPolygon>): number {
  return turf.booleanPointInPolygon(pt(p), f) ? 0 : masCercanoEnBorde(p, f).distancia;
}

/**
 * Si el punto cae en el agua, lo lleva al punto de tierra más cercano (un par de
 * metros hacia adentro, para que no quede justo sobre la línea de costa).
 */
export function llevarATierra(p: Punto, tierra: Tierra): { punto: Punto; movidoM: number } {
  if (enTierra(p, tierra)) return { punto: p, movidoM: 0 };

  let mejor: { punto: Punto; distancia: number; poligono: Feature<Polygon | MultiPolygon, PropsTierra> } | null = null;
  for (const f of tierra.features) {
    const c = masCercanoEnBorde(p, f);
    if (!mejor || c.distancia < mejor.distancia) mejor = { ...c, poligono: f };
  }
  if (!mejor) return { punto: p, movidoM: 0 };

  // Se adentra en la misma dirección en que venía; si no basta, prueba alrededor.
  const rumbo = turf.bearing(pt(p), pt(mejor.punto));
  const candidatos = [
    ...[2, 4, 8].map((d) => turf.destination(pt(mejor.punto), d, rumbo, M)),
    ...[3, 6].flatMap((d) => [0, 45, 90, 135, 180, 225, 270, 315].map((r) => turf.destination(pt(mejor.punto), d, r, M))),
  ];
  const dentro = candidatos.find((c) => turf.booleanPointInPolygon(c, mejor.poligono));
  const punto = dentro ? aPunto(dentro.geometry.coordinates) : mejor.punto;
  return { punto, movidoM: distanciaM(p, punto) };
}

/** Punto de la costa de la isla principal más cercano a `p`. */
export function costaMasCercana(p: Punto, tierra: Tierra): Punto | null {
  const principal = islaPrincipal(tierra);
  return principal ? masCercanoEnBorde(p, principal).punto : null;
}

/** Isla principal (San Andrés). */
export function islaPrincipal(tierra: Tierra) {
  return tierra.features.find((f) => f.properties.principal) ?? null;
}

/** Cayo (polígono de tierra que no es la isla principal) que contiene el punto o está más cerca, hasta `maxM`. */
export function cayoCercano(p: Punto, tierra: Tierra, maxM = 500) {
  let mejor: { f: Feature<Polygon | MultiPolygon, PropsTierra>; d: number } | null = null;
  for (const f of tierra.features) {
    if (f.properties.principal) continue;
    const d = distanciaATierra(p, f);
    if (d <= maxM && (!mejor || d < mejor.d)) mejor = { f, d };
  }
  return mejor?.f ?? null;
}

/** Vértices de una geometría, más puntos intermedios cada `pasoM` metros sobre sus líneas. */
export function puntosDe(geom: Polygon | MultiPolygon | LineString | Point, pasoM = 10): Punto[] {
  if (geom.type === 'Point') return [aPunto(geom.coordinates)];
  const lineas: Position[][] =
    geom.type === 'LineString'
      ? [geom.coordinates]
      : geom.type === 'Polygon'
        ? geom.coordinates
        : geom.coordinates.flat();
  const puntos: Punto[] = [];
  for (const coords of lineas) {
    if (coords.length < 2) {
      puntos.push(...coords.map(aPunto));
      continue;
    }
    const linea = turf.lineString(coords);
    const largo = turf.length(linea, M);
    for (let d = 0; d <= largo; d += pasoM) puntos.push(aPunto(turf.along(linea, d, M).geometry.coordinates));
    puntos.push(aPunto(coords[coords.length - 1]!));
  }
  return puntos;
}

/** Distancia (m) del punto a la línea más cercana; Infinity si no hay líneas. */
export function distanciaALineas(p: Punto, lineas: Linea[]): number {
  let mejor = Infinity;
  const punto = pt(p);
  for (const l of lineas) {
    const d = turf.pointToLineDistance(punto, l, M);
    if (d < mejor) mejor = d;
  }
  return mejor;
}

/** Líneas con algún vértice a menos de `radioM` del punto (filtro previo barato). */
export function lineasCerca(p: Punto, lineas: Linea[], radioM: number): Linea[] {
  const gradosLat = radioM / 111_000;
  const gradosLon = radioM / (111_000 * Math.cos((p.lat * Math.PI) / 180));
  return lineas.filter((l) => {
    const [oeste, sur, este, norte] = turf.bbox(l);
    return !(este < p.lon - gradosLon || oeste > p.lon + gradosLon || norte < p.lat - gradosLat || sur > p.lat + gradosLat);
  });
}

/**
 * Punto de una geometría más cercano a una calle o camino.
 * `cercaDe`/`radioM` limitan los candidatos (p. ej., la parte de la playa frente a un cayo).
 */
export function puntoMasCercanoACamino(
  geom: Polygon | MultiPolygon | LineString | Point,
  caminos: Linea[],
  opciones: { cercaDe?: Punto; radioM?: number } = {},
): { punto: Punto; distanciaCamino: number } | null {
  let candidatos = puntosDe(geom);
  if (opciones.cercaDe && opciones.radioM) {
    const filtrados = candidatos.filter((c) => distanciaM(c, opciones.cercaDe!) <= opciones.radioM!);
    if (filtrados.length > 0) candidatos = filtrados;
  }
  if (candidatos.length === 0) return null;
  const centro = candidatos[Math.floor(candidatos.length / 2)]!;
  const cercanos = lineasCerca(centro, caminos, 1500);
  let mejor: { punto: Punto; distanciaCamino: number } | null = null;
  for (const c of candidatos) {
    const d = distanciaALineas(c, cercanos);
    if (!mejor || d < mejor.distanciaCamino) mejor = { punto: c, distanciaCamino: d };
  }
  return mejor;
}

/**
 * Punto de acceso de un cayo: extremo de tierra del muelle si hay uno que toque el
 * cayo; si no, el punto de su orilla más cercano a la isla principal.
 */
export function puntoDeCayo(
  cayo: Feature<Polygon | MultiPolygon, PropsTierra>,
  muelles: Linea[],
  principal: Feature<Polygon | MultiPolygon, PropsTierra> | null,
): { punto: Punto; metodo: 'muelle' | 'orilla_hacia_la_isla' | 'orilla' } {
  const TOLERANCIA_M = 15;
  let mejorMuelle: { punto: Punto; d: number } | null = null;
  for (const muelle of muelles) {
    for (const v of muelle.geometry.coordinates.map(aPunto)) {
      const d = distanciaATierra(v, cayo);
      if (d <= TOLERANCIA_M && (!mejorMuelle || d < mejorMuelle.d)) mejorMuelle = { punto: v, d };
    }
  }
  if (mejorMuelle) return { punto: mejorMuelle.punto, metodo: 'muelle' };

  const orilla = puntosDe(cayo.geometry, 5);
  if (!principal) return { punto: aPunto(turf.pointOnFeature(cayo).geometry.coordinates), metodo: 'orilla' };
  let mejor: { punto: Punto; d: number } | null = null;
  for (const o of orilla) {
    const d = masCercanoEnBorde(o, principal).distancia;
    if (!mejor || d < mejor.d) mejor = { punto: o, d };
  }
  return { punto: mejor!.punto, metodo: 'orilla_hacia_la_isla' };
}

/** Punto dentro de un polígono (centroide si cae adentro). */
export function puntoInterior(geom: Polygon | MultiPolygon): Punto {
  const f = turf.feature(geom);
  const c = turf.centroid(f);
  return aPunto((turf.booleanPointInPolygon(c, f) ? c : turf.pointOnFeature(f)).geometry.coordinates);
}

/** Baja un nivel la confianza. */
export const bajarConfianza = (c: Confianza): Confianza => (c === 'alta' ? 'media' : 'baja');

// ---------------------------------------------------------------------------
// Construcción de la tierra a partir de la línea de costa de OSM
// ---------------------------------------------------------------------------

const clave = (pos: Position) => `${pos[0]!.toFixed(7)},${pos[1]!.toFixed(7)}`;

/**
 * Une tramos de línea de costa (que comparten extremos) en anillos cerrados.
 * Los tramos que no logran cerrarse se descartan.
 */
export function unirAnillos(tramos: Position[][]): Position[][] {
  const pendientes = tramos.filter((t) => t.length >= 2).map((t) => [...t]);
  const anillos: Position[][] = [];
  while (pendientes.length > 0) {
    let actual = pendientes.pop()!;
    let cambio = true;
    while (clave(actual[0]!) !== clave(actual[actual.length - 1]!) && cambio) {
      cambio = false;
      const fin = clave(actual[actual.length - 1]!);
      const inicio = clave(actual[0]!);
      for (let i = 0; i < pendientes.length; i++) {
        const t = pendientes[i]!;
        if (clave(t[0]!) === fin) actual = [...actual, ...t.slice(1)];
        else if (clave(t[t.length - 1]!) === fin) actual = [...actual, ...[...t].reverse().slice(1)];
        else if (clave(t[t.length - 1]!) === inicio) actual = [...t, ...actual.slice(1)];
        else if (clave(t[0]!) === inicio) actual = [...[...t].reverse(), ...actual.slice(1)];
        else continue;
        pendientes.splice(i, 1);
        cambio = true;
        break;
      }
    }
    if (actual.length >= 4 && clave(actual[0]!) === clave(actual[actual.length - 1]!)) anillos.push(actual);
  }
  return anillos;
}

/** Tierra a partir de anillos: la de mayor área es la isla principal; se quitan duplicados. */
export function construirTierra(anillos: { coords: Position[]; nombre: string | null }[]): Tierra {
  const poligonos = anillos
    .map((a) => ({ f: turf.polygon([a.coords]), nombre: a.nombre }))
    .map((a) => ({ ...a, area: turf.area(a.f) }))
    .sort((x, y) => y.area - x.area);

  const unicos: typeof poligonos = [];
  for (const p of poligonos) {
    const c = turf.centroid(p.f);
    const repetido = unicos.some((u) => Math.abs(u.area - p.area) / u.area < 0.05 && turf.booleanPointInPolygon(c, u.f));
    if (repetido) {
      const previo = unicos.find((u) => turf.booleanPointInPolygon(c, u.f));
      if (previo && !previo.nombre) previo.nombre = p.nombre;
      continue;
    }
    unicos.push(p);
  }

  return turf.featureCollection(
    unicos.map((u, i) =>
      turf.feature(
        { type: 'Polygon', coordinates: u.f.geometry.coordinates.map((r) => r.map((pos) => [round6(pos[0]!), round6(pos[1]!)])) },
        { nombre: u.nombre, principal: i === 0 },
      ),
    ),
  ) as Tierra;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
