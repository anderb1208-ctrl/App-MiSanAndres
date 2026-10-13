/**
 * Clientes de Nominatim y Overpass (OpenStreetMap, datos © colaboradores de
 * OpenStreetMap, licencia ODbL).
 *
 * Política de uso de Nominatim: User-Agent identificable y máximo 1 petición por
 * segundo. Overpass: una sola consulta por ejecución (se guarda en caché).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Geometry, Position } from 'geojson';
import { CUADRO_SAN_ANDRES, VIEWBOX_NOMINATIM } from './geo';

export const USER_AGENT = 'MiSanAndres/1.0 (app de turismo de San Andres; proyecto academico; geolocalizacion de destinos)';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ResultadoNominatim {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  category: string;
  type: string;
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  geojson?: Geometry;
}

let ultimaPeticion = 0;

/** Búsqueda por nombre dentro del cuadro de San Andrés (máximo 1 petición por segundo). */
export async function buscarNominatim(texto: string): Promise<ResultadoNominatim[]> {
  const espera = ultimaPeticion + 1100 - Date.now();
  if (espera > 0) await esperar(espera);
  ultimaPeticion = Date.now();

  const params = new URLSearchParams({
    q: texto,
    format: 'jsonv2',
    viewbox: VIEWBOX_NOMINATIM,
    bounded: '1',
    limit: '10',
    polygon_geojson: '1',
    'accept-language': 'es',
  });
  const res = await fetch(`${NOMINATIM}?${params}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status} para "${texto}".`);
  return (await res.json()) as ResultadoNominatim[];
}

// ---------------------------------------------------------------------------
// Overpass
// ---------------------------------------------------------------------------

export interface ElementoOverpass {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; role: string; geometry?: { lat: number; lon: number }[] }[];
}

const { sur, oeste, norte, este } = CUADRO_SAN_ANDRES;
const BBOX = `${sur},${oeste},${norte},${este}`;

/** Todo lo que hace falta en una sola consulta: costa, islas, playas, caminos, muelles y entradas. */
export const CONSULTA_OVERPASS = `[out:json][timeout:180];
(
  way["natural"="coastline"](${BBOX});
  way["place"~"^(island|islet)$"](${BBOX});
  relation["place"~"^(island|islet)$"](${BBOX});
  way["natural"="beach"](${BBOX});
  relation["natural"="beach"](${BBOX});
  way["highway"](${BBOX});
  way["man_made"~"^(pier|quay|breakwater)$"](${BBOX});
  node["entrance"](${BBOX});
);
out geom;`;

/** Respuesta de Overpass, desde la caché si existe (usar `forzar` para volver a pedirla). */
export async function consultarOverpass(rutaCache: string, forzar = false): Promise<ElementoOverpass[]> {
  if (!forzar && existsSync(rutaCache)) {
    return (JSON.parse(readFileSync(rutaCache, 'utf8')) as { elements: ElementoOverpass[] }).elements;
  }
  let ultimoError: unknown;
  for (const url of OVERPASS) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ data: CONSULTA_OVERPASS }),
        });
        const texto = await res.text();
        if (!res.ok || !texto.trimStart().startsWith('{')) throw new Error(`${url} respondió ${res.status}`);
        const datos = JSON.parse(texto) as { elements: ElementoOverpass[] };
        mkdirSync(dirname(rutaCache), { recursive: true });
        writeFileSync(rutaCache, texto, 'utf8');
        return datos.elements;
      } catch (e) {
        ultimoError = e;
        await esperar(5000);
      }
    }
  }
  throw new Error(`Overpass no respondió: ${(ultimoError as Error)?.message}`);
}

export const posiciones = (g: { lat: number; lon: number }[] | undefined): Position[] =>
  (g ?? []).map((p) => [p.lon, p.lat]);
