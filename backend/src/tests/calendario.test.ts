import {
  domingoDePascua,
  esPuente,
  festivoDe,
  festivosDelAnio,
  infoDelDia,
  sumarDias,
  temporadaDe,
  trasladarALunes,
} from '../services/calendarioService';

describe('festivos fijos', () => {
  it.each([
    ['2026-01-01', 'Año Nuevo'],
    ['2026-05-01', 'Día del Trabajo'],
    ['2026-07-20', 'Día de la Independencia'],
    ['2026-08-07', 'Batalla de Boyacá'],
    ['2026-12-25', 'Navidad'],
    // No se trasladan aunque caigan en fin de semana o a mitad de semana.
    ['2027-08-07', 'Batalla de Boyacá'],
    ['2027-12-25', 'Navidad'],
    ['2028-01-01', 'Año Nuevo'],
    ['2029-05-01', 'Día del Trabajo'],
    ['2029-07-20', 'Día de la Independencia'],
  ])('%s es festivo (%s)', (fecha, nombre) => {
    expect(festivoDe(fecha)).toEqual({ fecha, nombre });
  });

  it('un día cualquiera no es festivo', () => {
    expect(festivoDe('2026-09-30')).toBeNull();
    expect(festivoDe('2026-07-13')).toBeNull(); // date-holidays lo marca como festivo; no lo es.
  });
});

describe('Ley Emiliani', () => {
  it('traslada al lunes siguiente', () => {
    expect(trasladarALunes('2026-01-06')).toBe('2026-01-12'); // martes → lunes
    expect(trasladarALunes('2026-11-01')).toBe('2026-11-02'); // domingo → lunes
    expect(trasladarALunes('2025-01-06')).toBe('2025-01-06'); // ya es lunes
  });

  it('el 6 de enero de 2026 no es festivo; el lunes 12 sí', () => {
    expect(festivoDe('2026-01-06')).toBeNull();
    expect(festivoDe('2026-01-12')?.nombre).toBe('Día de los Reyes Magos');
  });
});

describe('Pascua y festivos que dependen de ella', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('Pascua de %i: %s', (anio, fecha) => {
    expect(domingoDePascua(anio)).toBe(fecha);
  });

  it('el domingo de Pascua no es festivo', () => {
    expect(festivoDe('2026-04-05')).toBeNull();
  });
});

describe('festivos de 2026 (calendario oficial)', () => {
  it('son exactamente los 18 del año', () => {
    expect(festivosDelAnio(2026).map((f) => f.fecha)).toEqual([
      '2026-01-01',
      '2026-01-12',
      '2026-03-23',
      '2026-04-02',
      '2026-04-03',
      '2026-05-01',
      '2026-05-18',
      '2026-06-08',
      '2026-06-15',
      '2026-06-29',
      '2026-07-20',
      '2026-08-07',
      '2026-08-17',
      '2026-10-12',
      '2026-11-02',
      '2026-11-16',
      '2026-12-08',
      '2026-12-25',
    ]);
  });
});

describe('puentes', () => {
  it.each([
    ['2026-10-10', true], // sábado antes del lunes festivo
    ['2026-10-11', true],
    ['2026-10-12', true], // lunes festivo
    ['2026-10-09', false], // viernes laboral
    ['2026-10-13', false],
    ['2026-10-03', false], // fin de semana normal
    ['2026-04-02', true], // Jueves Santo: jueves a domingo
    ['2026-04-05', true],
    ['2026-12-25', true], // viernes festivo
    ['2026-01-01', false], // jueves festivo con viernes laboral
  ])('%s → %p', (fecha, esperado) => {
    expect(esPuente(fecha)).toBe(esperado);
  });
});

describe('temporadas', () => {
  it.each([
    ['2026-12-14', 'normal', null],
    ['2026-12-15', 'alta', 'Fin y comienzo de año'],
    ['2026-12-31', 'alta', 'Fin y comienzo de año'],
    ['2027-01-15', 'alta', 'Fin y comienzo de año'],
    ['2027-01-16', 'normal', null],
    ['2026-06-14', 'normal', null],
    ['2026-06-15', 'alta', 'Vacaciones de mitad de año'],
    ['2026-07-15', 'alta', 'Vacaciones de mitad de año'],
    ['2026-07-16', 'normal', null],
    ['2026-03-28', 'normal', null],
    ['2026-03-29', 'alta', 'Semana Santa'], // Domingo de Ramos
    ['2026-04-05', 'alta', 'Semana Santa'],
    ['2026-04-06', 'normal', null],
    ['2026-09-30', 'normal', null],
    ['2026-10-02', 'normal', null],
    ['2026-10-03', 'alta', 'Receso escolar de octubre'],
    ['2026-10-12', 'alta', 'Receso escolar de octubre'],
    ['2026-10-13', 'normal', null],
    ['2025-10-04', 'alta', 'Receso escolar de octubre'],
    ['2025-10-13', 'alta', 'Receso escolar de octubre'],
  ])('%s → %s', (fecha, temporada, motivo) => {
    expect(temporadaDe(fecha)).toEqual({ temporada, motivo });
  });
});

describe('infoDelDia', () => {
  it('reúne todo lo del calendario', () => {
    expect(infoDelDia('2026-12-25')).toEqual({
      fecha: '2026-12-25',
      diaSemana: 5,
      nombreDia: 'viernes',
      esFinDeSemana: false,
      esFestivo: true,
      nombreFestivo: 'Navidad',
      esPuente: true,
      temporada: 'alta',
      motivoTemporada: 'Fin y comienzo de año',
    });
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});
