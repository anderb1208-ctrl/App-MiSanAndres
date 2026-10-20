import { pestanaDeInicio } from './navegacion';

describe('pestanaDeInicio', () => {
  it('vuelve a la pestaña inicial de cada rol', () => {
    expect(pestanaDeInicio('turista')).toBe('Inicio');
    expect(pestanaDeInicio(null)).toBe('Inicio');
    expect(pestanaDeInicio('tecnico')).toBe('Inicio'); // su panel de trabajo
    expect(pestanaDeInicio('administrador')).toBe('Panel');
  });
});
