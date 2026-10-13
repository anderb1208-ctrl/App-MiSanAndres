/**
 * Falla si algún destino activo cae fuera de tierra o fuera del cuadro de San Andrés.
 *
 * Uso (desde backend/):
 *   npm run verificar:ubicaciones             destinos de la base (clave publicable, solo lectura)
 *   npm run verificar:ubicaciones -- --local  scripts/ubicaciones/ubicaciones.json (sin red)
 *
 * "Tierra" es el contorno de la isla y los cayos de OpenStreetMap guardado en
 * scripts/ubicaciones/tierra.geojson (lo genera npm run ubicaciones:geolocalizar).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { leerTierra, leerUbicaciones } from './ubicaciones/publicar';
import { MENSAJE_PROBLEMA, type PuntoNombrado, verificarPuntos } from './ubicaciones/validacion';

async function destinosDeLaBase(): Promise<PuntoNombrado[]> {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) throw new Error('Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en backend/.env (o usa --local).');
  const { data, error } = await createClient(url, clave)
    .from('destino')
    .select('nombre, latitud, longitud')
    .neq('estado', 'inactivo')
    .order('id_destino');
  if (error) throw new Error(`No se pudieron leer los destinos: ${error.message}`);
  return (data ?? []).map((d) => ({ nombre: d.nombre, latitud: Number(d.latitud), longitud: Number(d.longitud) }));
}

async function main() {
  const local = process.argv.includes('--local');
  const puntos = local
    ? leerUbicaciones().map((u) => ({ nombre: u.nombre, latitud: u.latitud, longitud: u.longitud }))
    : await destinosDeLaBase();
  if (puntos.length === 0) throw new Error('No hay destinos para verificar.');

  const problemas = verificarPuntos(puntos, leerTierra());
  const origen = local ? 'ubicaciones.json' : 'la base';
  if (problemas.length > 0) {
    problemas.forEach((p) => console.error(`✘ ${p.nombre} (${p.latitud}, ${p.longitud}): ${MENSAJE_PROBLEMA[p.problema]}`));
    console.error(`\n${problemas.length} de ${puntos.length} destinos activos de ${origen} con problemas.`);
    process.exit(1);
  }
  console.log(`✔ Los ${puntos.length} destinos activos de ${origen} están en tierra y dentro del cuadro de San Andrés.`);
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
