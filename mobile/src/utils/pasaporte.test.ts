import { motivoPendientes, textoProgresoInsignia } from './pasaporte';

describe('pasaporte', () => {
  it('muestra el progreso de una insignia', () => {
    expect(textoProgresoInsignia({ progreso: 2, meta: 3, desbloqueada: false })).toBe('2 de 3');
    expect(textoProgresoInsignia({ progreso: 3, meta: 3, desbloqueada: true })).toBe('¡Desbloqueada!');
  });

  it('dice cuántos destinos faltan', () => {
    expect(motivoPendientes({ nombre: 'Navegante de cayos', meta: 3, progreso: 1, pendientes: [5, 6, 7] })).toBe(
      'Te faltan 2 destinos para «Navegante de cayos»',
    );
    expect(motivoPendientes({ nombre: 'Primeros pasos', meta: 1, progreso: 0, pendientes: [1] })).toBe(
      'Te falta 1 destino para «Primeros pasos»',
    );
  });
});
