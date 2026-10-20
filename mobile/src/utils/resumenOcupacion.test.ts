import type { Destino, OcupacionActual } from '../services/tipos';
import { distribuirPorNivel, grupoOcupacion, horaPrevision, masTranquilos, segmentosDistribucion } from './resumenOcupacion';

type D = Pick<Destino, 'id' | 'nombre' | 'estado' | 'ocupacionActual'>;

const ocupacion = (o: Partial<OcupacionActual>): OcupacionActual => ({
  fecha: '2026-10-19',
  hora: '19:07',
  estado: 'Abierto',
  porcentaje: 30,
  nivel: 'Bajo',
  personasEstimadas: 10,
  ...o,
});

let siguienteId = 1;
const destino = (nombre: string, o: Partial<OcupacionActual> | null, estado: Destino['estado'] = 'abierto'): D => ({
  id: siguienteId++,
  nombre,
  estado,
  ocupacionActual: o === null ? null : ocupacion(o),
});

describe('distribuirPorNivel', () => {
  it('cuenta cada nivel y los cerrados (fuera de horario y cierre temporal)', () => {
    const d = distribuirPorNivel([
      destino('Spratt Bight', { nivel: 'Bajo', porcentaje: 20 }),
      destino('Johnny Cay', { nivel: 'Alto', porcentaje: 85 }),
      destino('Rocky Cay', { nivel: 'Medio', porcentaje: 50 }),
      destino('Hoyo Soplador', { nivel: 'Bajo', porcentaje: 10 }),
      destino('Museo', { estado: 'Cerrado', nivel: null, porcentaje: 0 }),
      destino('Acuario', { nivel: 'Medio', porcentaje: 45 }, 'cerrado_temporal'),
    ]);
    expect(d.conteo).toEqual({ Bajo: 2, Medio: 1, Alto: 1, Cerrado: 2 });
    expect(d.total).toBe(6);
    expect(d.sinDatos).toBe(0);
  });

  it('separa los datos faltantes y no cuenta los inactivos', () => {
    const d = distribuirPorNivel([
      destino('Sin previsión', null),
      destino('Abierto sin nivel', { nivel: null }),
      destino('Nivel raro', { nivel: 'Desconocido' as never }),
      destino('Inactivo', { nivel: 'Alto' }, 'inactivo'),
      destino('Bien', { nivel: 'Alto' }),
    ]);
    expect(d.conteo).toEqual({ Bajo: 0, Medio: 0, Alto: 1, Cerrado: 0 });
    expect(d.total).toBe(1);
    expect(d.sinDatos).toBe(3);
  });

  it('acepta una lista vacía o ausente', () => {
    expect(distribuirPorNivel(undefined)).toEqual({ conteo: { Bajo: 0, Medio: 0, Alto: 0, Cerrado: 0 }, total: 0, sinDatos: 0 });
    expect(distribuirPorNivel([]).total).toBe(0);
  });

  it('el cierre temporal cuenta como cerrado aunque no haya previsión', () => {
    expect(grupoOcupacion(destino('Cerrado sin datos', null, 'cerrado_temporal'))).toBe('Cerrado');
  });
});

describe('segmentosDistribucion', () => {
  it('devuelve solo los grupos con destinos, en orden, con fracciones que suman 1', () => {
    const s = segmentosDistribucion({ conteo: { Bajo: 3, Medio: 0, Alto: 1, Cerrado: 4 }, total: 8, sinDatos: 2 });
    expect(s.map((x) => x.grupo)).toEqual(['Bajo', 'Alto', 'Cerrado']);
    expect(s.map((x) => x.fraccion)).toEqual([0.375, 0.125, 0.5]);
    expect(s.reduce((a, x) => a + x.fraccion, 0)).toBeCloseTo(1);
  });

  it('sin destinos no hay segmentos (evita dividir por cero)', () => {
    expect(segmentosDistribucion({ conteo: { Bajo: 0, Medio: 0, Alto: 0, Cerrado: 0 }, total: 0, sinDatos: 5 })).toEqual([]);
  });
});

describe('masTranquilos', () => {
  it('elige los 3 abiertos con menor porcentaje, sin cerrados', () => {
    const lista = [
      destino('Johnny Cay', { nivel: 'Alto', porcentaje: 85 }),
      destino('West View', { nivel: 'Bajo', porcentaje: 12 }),
      destino('Museo', { estado: 'Cerrado', nivel: null, porcentaje: 0 }),
      destino('Acuario', { nivel: 'Bajo', porcentaje: 5 }, 'cerrado_temporal'),
      destino('Rocky Cay', { nivel: 'Medio', porcentaje: 48 }),
      destino('La Piscinita', { nivel: 'Bajo', porcentaje: 25 }),
    ];
    expect(masTranquilos(lista).map((d) => d.nombre)).toEqual(['West View', 'La Piscinita', 'Rocky Cay']);
  });

  it('desempata por nombre y no modifica la lista original', () => {
    const lista = [destino('Zeta', { porcentaje: 20 }), destino('Alfa', { porcentaje: 20 })];
    const copia = [...lista];
    expect(masTranquilos(lista).map((d) => d.nombre)).toEqual(['Alfa', 'Zeta']);
    expect(lista).toEqual(copia);
  });

  it('descarta datos faltantes o inválidos y devuelve menos de 3 si no alcanzan', () => {
    const lista = [
      destino('Sin previsión', null),
      destino('Sin nivel', { nivel: null, porcentaje: 3 }),
      destino('Porcentaje inválido', { porcentaje: Number.NaN }),
      destino('Válido', { porcentaje: 40, nivel: 'Medio' }),
    ];
    expect(masTranquilos(lista).map((d) => d.nombre)).toEqual(['Válido']);
    expect(masTranquilos(null)).toEqual([]);
    expect(masTranquilos(lista, 0)).toEqual([]);
  });
});

describe('horaPrevision', () => {
  it('toma la hora del primer destino con previsión (HH:MM)', () => {
    expect(horaPrevision([destino('A', null), destino('B', { hora: '19:07:00' })])).toBe('19:07');
  });

  it('es null sin datos', () => {
    expect(horaPrevision([destino('A', null)])).toBeNull();
    expect(horaPrevision(undefined)).toBeNull();
  });
});
