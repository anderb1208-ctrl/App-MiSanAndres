import { decidirModoVidrio, medicionVidrio, PRESUPUESTO_VIDRIO, registrarVidrio, reiniciarMedicionVidrio } from './vidrio';

const ios26 = { plataforma: 'ios', liquidGlass: true, reducirTransparencia: false };
const ios18 = { plataforma: 'ios', liquidGlass: false, reducirTransparencia: false };
const android = { plataforma: 'android', liquidGlass: false, reducirTransparencia: false };

describe('decidirModoVidrio', () => {
  it('usa Liquid Glass solo en iOS 26+ y con calidad nativa', () => {
    expect(decidirModoVidrio(ios26, 'nativa')).toBe('nativo');
    expect(decidirModoVidrio(ios26, 'desenfoque')).toBe('desenfoque');
    expect(decidirModoVidrio(ios26, 'ligera')).toBe('color');
  });

  it('en iOS anterior a 26 usa desenfoque y en Android color translúcido', () => {
    expect(decidirModoVidrio(ios18, 'nativa')).toBe('desenfoque');
    expect(decidirModoVidrio(android, 'nativa')).toBe('color');
    expect(decidirModoVidrio(android, 'desenfoque')).toBe('color');
  });

  it('nunca da Liquid Glass fuera de iOS aunque el chequeo diga que sí', () => {
    expect(decidirModoVidrio({ ...android, liquidGlass: true }, 'nativa')).toBe('color');
  });

  it('con Reducir transparencia siempre es opaco', () => {
    for (const entorno of [ios26, ios18, android]) {
      expect(decidirModoVidrio({ ...entorno, reducirTransparencia: true }, 'nativa')).toBe('opaco');
    }
  });
});

describe('medición del vidrio', () => {
  beforeEach(reiniciarMedicionVidrio);

  it('cuenta solo las superficies costosas y recuerda el máximo', () => {
    const quitarA = registrarVidrio('nativo');
    const quitarB = registrarVidrio('desenfoque');
    registrarVidrio('color');
    expect(medicionVidrio()).toMatchObject({ nativo: 1, desenfoque: 1, total: 2, maximo: 2 });
    quitarA();
    quitarB();
    expect(medicionVidrio()).toMatchObject({ total: 0, maximo: 2 });
  });

  it('avisa al pasar el presupuesto', () => {
    const aviso = jest.fn();
    for (let i = 0; i <= PRESUPUESTO_VIDRIO; i++) registrarVidrio('nativo', aviso);
    expect(aviso).toHaveBeenCalledTimes(1);
    expect(aviso).toHaveBeenCalledWith(PRESUPUESTO_VIDRIO + 1);
  });
});
