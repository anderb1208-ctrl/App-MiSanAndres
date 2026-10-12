/**
 * Genera supabase/clima_hora.sql con el clima real por hora de las últimas semanas
 * para cada destino (Open-Meteo con past_days; datos CC BY 4.0, "Weather data by
 * Open-Meteo.com"). Es la variable de clima con la que se entrenará el modelo.
 *
 * Uso (desde backend/):  npm run clima:historico [-- --dias 28]
 *
 * - Lee los destinos (nombre y coordenadas) con la clave publicable: solo lectura.
 * - Pide todos los destinos en una sola llamada a Open-Meteo.
 * - Solo guarda horas ya transcurridas (no pronósticos).
 * - El SQL identifica los destinos por nombre (no por id) y es re-ejecutable:
 *   actualiza las horas que ya existan. Se aplica en el editor SQL de Supabase.
 * - Formato compacto: cada serie horaria distinta se escribe una sola vez (varios
 *   destinos comparten celda del modelo de clima), con decimales en décimas enteras.
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { OpenMeteoProvider } from '../src/services/clima/openMeteoProvider';
import type { ClimaHora } from '../src/services/clima/tipos';
import { ahoraEnColombia } from '../src/utils/fecha';

const ARCHIVO = resolve(__dirname, '../../supabase/clima_hora.sql');

function leerDias(): number {
  const i = process.argv.indexOf('--dias');
  const dias = i >= 0 ? Number(process.argv[i + 1]) : 28;
  if (!Number.isInteger(dias) || dias < 1 || dias > 92) throw new Error('--dias debe ser un entero entre 1 y 92.');
  return dias;
}

const texto = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const dias = leerDias();
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) throw new Error('Faltan SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en backend/.env.');

  const { data: destinos, error } = await createClient(url, clave)
    .from('destino')
    .select('nombre, latitud, longitud')
    .order('id_destino');
  if (error) throw new Error(`No se pudieron leer los destinos: ${error.message}`);
  if (!destinos?.length) throw new Error('No hay destinos.');

  const series = await new OpenMeteoProvider({ timeoutMs: 30_000 }).pronostico(
    destinos.map((d) => ({ latitud: Number(d.latitud), longitud: Number(d.longitud) })),
    { diasPasados: dias, diasPronostico: 1 },
  );

  // Solo horas ya transcurridas en Colombia.
  const { fecha, hora } = ahoraEnColombia();
  const horaActual = `${fecha}T${hora.slice(0, 2)}:00`;
  const pasadas = series.map((s) => s.filter((c) => c.fechaHora < horaActual));

  const horas = pasadas[0]?.length ?? 0;
  if (horas === 0 || pasadas.some((serie) => serie.length !== horas)) {
    throw new Error('Open-Meteo devolvió series de distinto largo.');
  }
  const inicio = `${pasadas[0]![0]!.fechaHora}:00-05:00`;

  // Cada variable se guarda en décimas enteras (28,6 °C → 286) y cada arreglo distinto
  // una sola vez: varios destinos comparten celda del modelo y la probabilidad de
  // lluvia suele ser la misma en toda la isla.
  const arreglos: string[] = [];
  const idDe = new Map<string, number>();
  const idArreglo = (valores: (number | null)[], escala: number) => {
    const literal = `'{${valores.map((v) => (v === null ? 'NULL' : String(Math.round(v * escala)))).join(',')}}'`;
    let id = idDe.get(literal);
    if (id === undefined) {
      id = arreglos.push(literal);
      idDe.set(literal, id);
    }
    return id;
  };

  const filasDestinos = destinos.map((d, i) => {
    const serie = pasadas[i]!;
    const col = (k: Exclude<keyof ClimaHora, 'fechaHora'>) => serie.map((c) => c[k]);
    const ids = [
      idArreglo(col('temperatura'), 10),
      idArreglo(col('probLluvia'), 1),
      idArreglo(col('precipitacion'), 10),
      idArreglo(col('codigoClima'), 1),
      idArreglo(col('viento'), 10),
    ];
    return `  (${texto(d.nombre)}, ${ids.join(', ')})`;
  });
  const filasArreglos = arreglos.map((literal, i) => `  (${i + 1}, ${literal}::int[])`);

  const sql = `-- ============================================================================
-- Clima real por hora de cada destino: ${horas} horas (${dias} días) hasta ${horaActual} (Colombia).
-- Generado por backend/scripts/generarClimaHistorico.ts el ${new Date().toISOString()}.
-- Datos: Open-Meteo.com (https://open-meteo.com/), licencia CC BY 4.0.
--
-- Re-ejecutable: inserta o actualiza (id_destino, fecha_hora). Identifica los destinos
-- por nombre: correr después de supabase/seed.sql.
-- Formato compacto: "arreglos" tiene cada serie horaria distinta una sola vez (temperatura,
-- precipitación y viento en décimas); "destinos" indica qué arreglo usa cada variable.
-- ============================================================================

with arreglos (id, v) as (values
${filasArreglos.join(',\n')}
),
destinos (nombre, temperatura, prob_lluvia, precipitacion, codigo_clima, viento) as (values
${filasDestinos.join(',\n')}
)
insert into public.clima_hora (id_destino, fecha_hora, temperatura, prob_lluvia, precipitacion, codigo_clima, viento)
select
  d.id_destino,
  ${texto(inicio)}::timestamptz + (h.n - 1) * interval '1 hour',
  t.v[h.n] / 10.0, p.v[h.n], r.v[h.n] / 10.0, c.v[h.n], w.v[h.n] / 10.0
from destinos m
join public.destino d on d.nombre = m.nombre
join arreglos t on t.id = m.temperatura
join arreglos p on p.id = m.prob_lluvia
join arreglos r on r.id = m.precipitacion
join arreglos c on c.id = m.codigo_clima
join arreglos w on w.id = m.viento
cross join lateral generate_series(1, ${horas}) as h (n)
on conflict (id_destino, fecha_hora) do update set
  temperatura = excluded.temperatura,
  prob_lluvia = excluded.prob_lluvia,
  precipitacion = excluded.precipitacion,
  codigo_clima = excluded.codigo_clima,
  viento = excluded.viento;
`;

  writeFileSync(ARCHIVO, sql, 'utf8');
  console.log(
    `Listo: ${ARCHIVO}\n${destinos.length} destinos, ${horas} horas, ${arreglos.length} arreglos distintos (${(sql.length / 1024).toFixed(0)} KB).`,
  );
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
