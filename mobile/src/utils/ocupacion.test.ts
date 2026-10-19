import { textoOcupacion, textoOrigenEstimacion } from './ocupacion';

describe('textoOrigenEstimacion', () => {
  const base = { estado: 'Abierto' as const, datosSimulados: true, mensajeOrigen: 'Estimación basada en datos simulados' };

  it('nombra el modelo y aclara que los datos son simulados', () => {
    expect(textoOrigenEstimacion({ ...base, modelo: 'HistGradientBoosting' })).toBe(
      'Estimado con HistGradientBoosting · datos simulados',
    );
  });

  it('con datos reales lo dice', () => {
    expect(textoOrigenEstimacion({ ...base, datosSimulados: false, mensajeOrigen: null, modelo: 'Random Forest' })).toBe(
      'Estimado con Random Forest · datos reales',
    );
  });

  it('sin modelo (backend anterior) usa el mensaje de origen; cerrado no muestra nada', () => {
    expect(textoOrigenEstimacion({ ...base, modelo: null })).toBe('Estimación basada en datos simulados');
    expect(textoOrigenEstimacion({ ...base, estado: 'Cerrado', modelo: 'HistGradientBoosting' })).toBeNull();
  });
});

describe('textoOcupacion', () => {
  it('da el nivel en palabras y el porcentaje', () => {
    expect(textoOcupacion({ estado: 'Abierto', porcentaje: 31.4, nivel: 'Bajo' })).toMatchObject({
      largo: 'Ocupación baja · 31 %',
      corto: 'Baja · 31 %',
    });
  });

  it('distingue cerrado de sin datos', () => {
    expect(textoOcupacion({ estado: 'Cerrado', porcentaje: 0, nivel: null }).largo).toBe('Cerrado ahora');
    expect(textoOcupacion(null).largo).toBe('Sin datos de ocupación');
  });
});
