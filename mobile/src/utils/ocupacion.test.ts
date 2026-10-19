import { textoOrigenEstimacion } from './ocupacion';

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
