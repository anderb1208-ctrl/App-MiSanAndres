import { ahoraEnColombia, diaSemanaIso, esFinDeSemana, nombreDia, rangoDelDia } from '../utils/fecha';
import { escaparLike } from '../models/destinoModel';
import { estaEnHorario, horarioDe } from '../utils/horario';
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

  it('calcula el día de la semana ISO y su nombre', () => {
    expect(diaSemanaIso('2026-09-28')).toBe(1); // lunes
    expect(diaSemanaIso('2026-09-29')).toBe(2);
    expect(diaSemanaIso('2026-09-27')).toBe(7); // domingo
    expect(nombreDia(2)).toBe('martes');
    expect(nombreDia(6)).toBe('sábado');
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

describe('horario', () => {
  const cayo = { horario_apertura: '09:00:00', horario_cierre: '16:00:00' };

  it('expone el horario en HH:MM', () => {
    expect(horarioDe(cayo)).toEqual({ apertura: '09:00', cierre: '16:00' });
    expect(horarioDe({ horario_apertura: null, horario_cierre: null })).toBeNull();
  });

  it.each([
    ['08:59', false],
    ['09:00', true],
    ['15:59', true],
    ['16:00', false],
  ])('a las %s está en horario: %p', (hora, esperado) => {
    expect(estaEnHorario(cayo, hora)).toBe(esperado);
  });

  it('sin horario siempre está en horario', () => {
    expect(estaEnHorario({}, '03:00')).toBe(true);
  });
});

describe('escaparLike', () => {
  it('escapa los comodines para buscar el texto literal', () => {
    expect(escaparLike('50%_off\\')).toBe('50\\%\\_off\\\\');
    expect(escaparLike('Johnny')).toBe('Johnny');
  });
});
