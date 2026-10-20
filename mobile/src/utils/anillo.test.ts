import { calcularAnillo, descripcionAnillo, etiquetaAnillo, filasLeyenda, trazoSegmento } from './anillo';
import type { DistribucionOcupacion } from './resumenOcupacion';

const dist = (Bajo: number, Medio: number, Alto: number, Cerrado: number, sinDatos = 0): DistribucionOcupacion => ({
  conteo: { Bajo, Medio, Alto, Cerrado },
  total: Bajo + Medio + Alto + Cerrado,
  sinDatos,
});

describe('calcularAnillo', () => {
  it('cada nivel ocupa su parte del total; los cerrados quedan como pista', () => {
    const a = calcularAnillo(dist(0, 3, 1, 26), 0);
    expect(a.abiertos).toBe(4);
    expect(a.total).toBe(30);
    expect(a.segmentos.map((s) => s.grupo)).toEqual(['Medio', 'Alto']);
    expect(a.segmentos[0]!).toMatchObject({ inicio: 0, fin: 0.1, cantidad: 3 });
    expect(a.segmentos[1]!.inicio).toBeCloseTo(0.1);
    expect(a.segmentos[1]!.fin).toBeCloseTo(4 / 30);
  });

  it('deja una separación entre segmentos seguidos, pero no después del último si hay cerrados', () => {
    const a = calcularAnillo(dist(5, 5, 0, 10), 0.01);
    expect(a.segmentos[0]!.fin).toBeCloseTo(0.25 - 0.01);
    expect(a.segmentos[1]!.inicio).toBeCloseTo(0.25);
    expect(a.segmentos[1]!.fin).toBeCloseTo(0.5);
  });

  it('con todo abierto llena la vuelta y separa también el cierre', () => {
    const a = calcularAnillo(dist(1, 1, 2, 0), 0.01);
    expect(a.segmentos.at(-1)!.fin).toBeCloseTo(1 - 0.01);
    const solo = calcularAnillo(dist(4, 0, 0, 0), 0.01);
    expect(solo.segmentos).toEqual([{ grupo: 'Bajo', cantidad: 4, inicio: 0, fin: 1 }]);
  });

  it('un segmento muy corto no se recorta (no desaparece)', () => {
    const a = calcularAnillo(dist(1, 1, 0, 198), 0.012);
    expect(a.segmentos[0]!.fin - a.segmentos[0]!.inicio).toBeCloseTo(1 / 200);
  });

  it('sin abiertos o sin destinos no hay segmentos', () => {
    expect(calcularAnillo(dist(0, 0, 0, 30)).segmentos).toEqual([]);
    expect(calcularAnillo(dist(0, 0, 0, 0))).toEqual({ abiertos: 0, total: 0, segmentos: [] });
  });

  it('ignora los destinos sin previsión (no están en el total)', () => {
    const a = calcularAnillo(dist(2, 0, 0, 2, 6), 0);
    expect(a.total).toBe(4);
    expect(a.segmentos[0]!.fin).toBe(0.5);
  });
});

describe('trazoSegmento', () => {
  const c = 100;
  it('acorta y desplaza medio grosor en cada extremo cuando es redondeado', () => {
    const t = trazoSegmento({ inicio: 0.2, fin: 0.5 }, c, 10);
    expect(t.dasharray).toBe('20 100');
    expect(t.dashoffset).toBeCloseTo(-25);
  });

  it('sin extremos redondeados usa el largo exacto', () => {
    const t = trazoSegmento({ inicio: 0.2, fin: 0.5 }, c, 10, false);
    expect(t.dasharray).toBe('30 100');
    expect(t.dashoffset).toBeCloseTo(-20);
  });

  it('un segmento más corto que el grosor queda como un punto centrado', () => {
    const t = trazoSegmento({ inicio: 0.5, fin: 0.54 }, c, 10);
    expect(Number(t.dasharray.split(' ')[0])).toBeLessThan(0.1);
    expect(t.dashoffset).toBeCloseTo(-52);
  });
});

describe('leyenda y descripción hablada', () => {
  it('siempre trae las cuatro filas en orden, con sus cifras', () => {
    expect(filasLeyenda(dist(0, 3, 1, 26))).toEqual([
      { grupo: 'Bajo', etiqueta: 'Baja', cantidad: 0 },
      { grupo: 'Medio', etiqueta: 'Media', cantidad: 3 },
      { grupo: 'Alto', etiqueta: 'Alta', cantidad: 1 },
      { grupo: 'Cerrado', etiqueta: 'Cerrados', cantidad: 26 },
    ]);
  });

  it('describe el anillo sin los grupos en cero', () => {
    expect(descripcionAnillo(dist(0, 3, 1, 26))).toBe('3 media, 1 alta, 26 cerrados');
    expect(descripcionAnillo(dist(2, 0, 0, 1))).toBe('2 baja, 1 cerrado');
    expect(descripcionAnillo(dist(0, 0, 0, 0))).toBe('sin destinos con previsión');
  });

  it('la etiqueta completa empieza por los abiertos', () => {
    expect(etiquetaAnillo(dist(0, 3, 1, 26))).toBe('4 abiertos: 3 media, 1 alta, 26 cerrados');
    expect(etiquetaAnillo(dist(1, 0, 0, 0))).toBe('1 abierto: 1 baja');
  });
});
