import * as turf from '@turf/turf';
import {
  construirTierra,
  enCuadro,
  enTierra,
  llevarATierra,
  puntoDeCayo,
  puntoMasCercanoACamino,
  type Tierra,
  unirAnillos,
} from '../../scripts/ubicaciones/geo';
import { actualizarSeed, siguienteVersion, sqlActualizacion, type Ubicacion } from '../../scripts/ubicaciones/publicar';
import { aplicarCorrecciones, leerCorrecciones, verificarPuntos } from '../../scripts/ubicaciones/validacion';

/** Cuadrado [lon, lat] de lado `lado` grados con esquina suroeste en (lon, lat). */
const cuadrado = (lon: number, lat: number, lado: number) => [
  [lon, lat],
  [lon + lado, lat],
  [lon + lado, lat + lado],
  [lon, lat + lado],
  [lon, lat],
];

// Isla "principal" grande y un cayo pequeño al este, dentro del cuadro de San Andrés.
const isla = cuadrado(-81.73, 12.5, 0.04);
const cayo = cuadrado(-81.68, 12.52, 0.002);
const tierra: Tierra = construirTierra([
  { coords: isla, nombre: 'San Andrés' },
  { coords: cayo, nombre: 'Cayo' },
]);

const ubicacion = (nombre: string, lat: number, lon: number): Ubicacion => ({
  nombre,
  categoria: 'playa',
  latitud: lat,
  longitud: lon,
  fuente: 'osm',
  confianza: 'media',
  verificada: false,
  osm: 'way/1',
  metodo: 'prueba',
  nota: null,
  aprox: { lat, lon },
});

describe('geometría de la geolocalización', () => {
  test('la isla de mayor área es la principal', () => {
    expect(tierra.features).toHaveLength(2);
    expect(tierra.features[0]!.properties).toEqual({ nombre: 'San Andrés', principal: true });
    expect(tierra.features[1]!.properties.principal).toBe(false);
  });

  test('une tramos de costa en un anillo cerrado aunque vengan desordenados o invertidos', () => {
    const tramos = [
      [isla[0]!, isla[1]!],
      [isla[3]!, isla[2]!], // invertido
      [isla[1]!, isla[2]!],
      [isla[3]!, isla[4]!],
    ];
    const anillos = unirAnillos(tramos);
    expect(anillos).toHaveLength(1);
    expect(anillos[0]).toHaveLength(5);
  });

  test('en tierra y en el cuadro', () => {
    expect(enTierra({ lat: 12.52, lon: -81.71 }, tierra)).toBe(true);
    expect(enTierra({ lat: 12.52, lon: -81.685 }, tierra)).toBe(false);
    expect(enCuadro({ lat: 12.52, lon: -81.71 })).toBe(true);
    expect(enCuadro({ lat: 13.35, lon: -81.37 })).toBe(false); // Providencia
  });

  test('un punto en el agua se lleva a la tierra más cercana, un poco adentro', () => {
    const agua = { lat: 12.52, lon: -81.6895 }; // ~55 m al este de la isla
    const { punto, movidoM } = llevarATierra(agua, tierra);
    expect(enTierra(punto, tierra)).toBe(true);
    expect(movidoM).toBeGreaterThan(50);
    expect(movidoM).toBeLessThan(70);
  });

  test('un punto en tierra no se mueve', () => {
    const p = { lat: 12.51, lon: -81.72 };
    expect(llevarATierra(p, tierra)).toEqual({ punto: p, movidoM: 0 });
  });

  test('playa: elige el punto más cercano a un camino', () => {
    const playa = turf.lineString([
      [-81.72, 12.501],
      [-81.71, 12.501],
    ]).geometry;
    const camino = turf.lineString([
      [-81.711, 12.503],
      [-81.711, 12.51],
    ]);
    const acceso = puntoMasCercanoACamino(playa, [camino])!;
    expect(acceso.punto.lon).toBeCloseTo(-81.711, 3);
    expect(acceso.distanciaCamino).toBeLessThan(230);
  });

  test('cayo: usa el extremo del muelle que toca el cayo', () => {
    const muelle = turf.lineString([
      [-81.6801, 12.521], // dentro del cayo
      [-81.6825, 12.521], // mar adentro
    ]);
    const acceso = puntoDeCayo(tierra.features[1]!, [muelle], tierra.features[0]!);
    expect(acceso.metodo).toBe('muelle');
    expect(acceso.punto).toEqual({ lat: 12.521, lon: -81.6801 });
  });

  test('cayo sin muelle: la orilla más cercana a la isla principal', () => {
    const acceso = puntoDeCayo(tierra.features[1]!, [], tierra.features[0]!);
    expect(acceso.metodo).toBe('orilla_hacia_la_isla');
    expect(acceso.punto.lon).toBeCloseTo(-81.68, 4); // lado oeste del cayo, hacia la isla
  });
});

describe('verificación y correcciones', () => {
  test('verificarPuntos señala los puntos en el agua y fuera del cuadro', () => {
    const problemas = verificarPuntos(
      [
        { nombre: 'Bien', latitud: 12.52, longitud: -81.71 },
        { nombre: 'Agua', latitud: 12.52, longitud: -81.685 },
        { nombre: 'Lejos', latitud: 13.35, longitud: -81.37 },
      ],
      tierra,
    );
    expect(problemas.map((p) => [p.nombre, p.problema])).toEqual([
      ['Agua', 'en_el_agua'],
      ['Lejos', 'fuera_del_cuadro'],
    ]);
  });

  test('leerCorrecciones acepta el formato de la página y rechaza datos incompletos', () => {
    const json = { formato: 'misanandres-ubicaciones/1', correcciones: [{ nombre: 'A', latitud: 12.5, longitud: -81.7 }] };
    expect(leerCorrecciones(json)).toEqual([{ nombre: 'A', latitud: 12.5, longitud: -81.7 }]);
    expect(() => leerCorrecciones({})).toThrow('correcciones');
    expect(() => leerCorrecciones([{ nombre: 'A', latitud: '12.5' }])).toThrow('Corrección 1');
  });

  test('aplicarCorrecciones marca los destinos como manuales y verificados', () => {
    const actuales = [ubicacion('Playa A', 12.51, -81.72), ubicacion('Playa B', 12.52, -81.72)];
    const r = aplicarCorrecciones(actuales, [{ nombre: 'Playa A', latitud: 12.5150001, longitud: -81.7200004 }], tierra, {
      fecha: '2026-10-14',
    });
    expect(r.errores).toEqual([]);
    expect(r.corregidas).toHaveLength(1);
    expect(r.ubicaciones[0]).toMatchObject({
      latitud: 12.515,
      longitud: -81.72,
      fuente: 'manual',
      verificada: true,
      confianza: 'alta',
    });
    expect(r.ubicaciones[1]).toBe(actuales[1]);
  });

  test('aplicarCorrecciones rechaza nombres desconocidos y puntos en el agua (salvo --forzar)', () => {
    const actuales = [ubicacion('Playa A', 12.51, -81.72)];
    const enAgua = { nombre: 'Playa A', latitud: 12.52, longitud: -81.685 };
    const r = aplicarCorrecciones(actuales, [enAgua, { nombre: 'Otra', latitud: 12.51, longitud: -81.72 }], tierra, {
      fecha: 'x',
    });
    expect(r.corregidas).toEqual([]);
    expect(r.errores).toHaveLength(2);

    const forzado = aplicarCorrecciones(actuales, [enAgua], tierra, { fecha: 'x', forzar: true });
    expect(forzado.corregidas).toHaveLength(1);
    expect(forzado.avisos).toHaveLength(1);
  });
});

describe('archivos generados', () => {
  test('sqlActualizacion identifica por nombre, escapa comillas y castea la fuente', () => {
    const sql = sqlActualizacion([ubicacion("Fishermen's Place", 12.5904031, -81.700637)]);
    expect(sql).toContain("('Fishermen''s Place', 12.590403, -81.700637, 'osm', false)");
    expect(sql).toContain('ubicacion_fuente = v.fuente::public.ubicacion_fuente');
    expect(sql).toContain('where d.nombre = v.nombre');
  });

  test('siguienteVersion queda después de la última migración aunque el reloj vaya atrás', () => {
    expect(siguienteVersion(['20261014120100', '20261013120000'], new Date('2026-10-12T20:00:00Z'))).toBe('20261014120200');
    expect(siguienteVersion(['20261014120100'], new Date('2026-11-01T08:30:15Z'))).toBe('20261101083015');
  });

  test('actualizarSeed cambia las coordenadas del INSERT y agrega el bloque de ubicaciones', () => {
    const seed = `insert into public.destino (...) values
  ('Rocky Cay',
   'Playa frente a un cayo; la descripción tiene ''comillas''.',
   'playa', 12.512500, -81.704500, 'Costa oriental', 400, 'abierto');

-- ------------------------------------------------------------
-- Etiquetas de experiencia y grupo por destino
insert into public.destino_preferencia values (1, 1);
`;
    const primera = actualizarSeed(seed, [ubicacion('Rocky Cay', 12.543624, -81.703992)]);
    expect(primera.sinInsert).toEqual([]);
    expect(primera.seed).toContain("'playa', 12.543624, -81.703992, 'Costa oriental'");
    expect(primera.seed).toContain("('Rocky Cay', 12.543624, -81.703992, 'osm', false)");
    expect(primera.seed.indexOf('-- <ubicaciones>')).toBeLessThan(primera.seed.indexOf('-- Etiquetas'));

    // Una segunda corrección reemplaza el bloque (no lo duplica) y conserva los demás destinos.
    const segunda = actualizarSeed(primera.seed, [{ ...ubicacion('Otro', 12.5, -81.7), fuente: 'manual', verificada: true }]);
    expect(segunda.sinInsert).toEqual(['Otro']);
    expect(segunda.seed.match(/-- <ubicaciones>/g)).toHaveLength(1);
    expect(segunda.seed).toContain("('Rocky Cay', 12.543624, -81.703992, 'osm', false)");
    expect(segunda.seed).toContain("('Otro', 12.500000, -81.700000, 'manual', true)");
  });
});
