/**
 * Aplica las correcciones de ubicación hechas a mano en docs/revision-ubicaciones.html.
 *
 * Uso (desde backend/):  npm run ubicaciones:corregir -- ruta/correcciones.json [--forzar]
 *
 * El JSON es el que copia el botón "Copiar correcciones". Los destinos incluidos
 * quedan con ubicacion_fuente = 'manual' y ubicacion_verificada = true. Genera una
 * migración nueva en supabase/migrations y actualiza el seed, la página de revisión
 * y la tabla de docs/datos-por-verificar.md. Rechaza puntos en el agua o fuera del
 * cuadro de San Andrés (--forzar admite los que caen en el agua).
 */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import {
  escribirDoc,
  escribirMigracion,
  escribirRevision,
  escribirSeed,
  guardarUbicaciones,
  leerTierra,
  leerUbicaciones,
} from './ubicaciones/publicar';
import { aplicarCorrecciones, leerCorrecciones } from './ubicaciones/validacion';

function main() {
  const ruta = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!ruta) throw new Error('Uso: npm run ubicaciones:corregir -- ruta/correcciones.json [--forzar]');
  const correcciones = leerCorrecciones(JSON.parse(readFileSync(resolve(process.cwd(), ruta), 'utf8')));

  const tierra = leerTierra();
  const fecha = new Date().toISOString().slice(0, 10);
  const { ubicaciones, corregidas, errores, avisos } = aplicarCorrecciones(leerUbicaciones(), correcciones, tierra, {
    forzar: process.argv.includes('--forzar'),
    fecha,
  });

  avisos.forEach((a) => console.warn(`Aviso: ${a}`));
  if (errores.length > 0) {
    errores.forEach((e) => console.error(`✘ ${e}`));
    throw new Error(`No se aplicó ninguna corrección: ${errores.length} con problemas. Corrígelas en la página y vuelve a copiar.`);
  }
  if (corregidas.length === 0) throw new Error('El archivo no tiene correcciones.');

  guardarUbicaciones(ubicaciones);
  const { ruta: migracion } = escribirMigracion(
    'ubicaciones_manual',
    `-- Ubicaciones revisadas a mano en docs/revision-ubicaciones.html (${fecha}).
-- Generado por backend/scripts/corregir-ubicaciones.ts. Marca los destinos como
-- 'manual' y verificados. Solo actualiza filas existentes (por nombre).`,
    corregidas,
  );
  escribirSeed(ubicaciones);
  escribirDoc(ubicaciones);
  escribirRevision(ubicaciones, tierra);

  corregidas.forEach((u) => console.log(`✔ ${u.nombre}: ${u.latitud}, ${u.longitud}`));
  console.log(`\n${corregidas.length} destino(s) corregidos y verificados.`);
  console.log(`Migración: ${relative(process.cwd(), migracion)} — aplícala en Supabase y luego corre npm run verificar:ubicaciones.`);
}

try {
  main();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
