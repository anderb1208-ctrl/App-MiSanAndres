import { ahoraEnColombia, esFinDeSemana, rangoDelDia } from '../utils/fecha';
import { distanciaNiveles, nivelDesdePorcentaje } from '../utils/nivelOcupacion';

describe('nivelDesdePorcentaje', () => {
  it.each([
    [0, 'Bajo'],
    [39.9, 'Bajo'],
    [40, 'Medio'],
    [70, 'Medio'],
    [70.1, 'Alto'],
    [100, 'Alto'],
  ])('%p %% → %s', (porcentaje, nivel) => {
    expect(nivelDesdePorcentaje(porcentaje)).toBe(nivel);
  });

  it('mide la distancia entre niveles', () => {
    expect(distanciaNiveles('Bajo', 'Bajo')).toBe(0);
    expect(distanciaNiveles('Bajo', 'Medio')).toBe(1);
    expect(distanciaNiveles('Alto', 'Bajo')).toBe(2);
  });
});

describe('fechas en hora de Colombia', () => {
  it('convierte un instante UTC a fecha y hora de Bogotá', () => {
    expect(ahoraEnColombia(new Date('2026-09-29T03:30:00Z'))).toEqual({ fecha: '2026-09-28', hora: '22:30' });
  });

  it('distingue fin de semana', () => {
    expect(esFinDeSemana('2026-09-26')).toBe(true); // sábado
    expect(esFinDeSemana('2026-09-27')).toBe(true); // domingo
    expect(esFinDeSemana('2026-09-28')).toBe(false); // lunes
  });

  it('calcula el rango UTC de un día de Colombia', () => {
    expect(rangoDelDia('2026-09-28')).toEqual({
      desde: '2026-09-28T05:00:00.000Z',
      hasta: '2026-09-29T05:00:00.000Z',
    });
  });
});
