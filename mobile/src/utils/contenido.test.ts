import { descripcionBreve } from './contenido';

describe('descripcionBreve', () => {
  it('toma la primera oración', () => {
    expect(descripcionBreve('Cayo con arena blanca. Hay música en vivo.')).toBe('Cayo con arena blanca.');
  });

  it('recorta sin partir palabras y tolera vacíos', () => {
    const largo = descripcionBreve('Una playa muy larga con palmeras, arena blanca, agua cristalina y muchos kioscos de comida típica isleña', 40)!;
    expect(largo.length).toBeLessThanOrEqual(40);
    expect(largo.endsWith('…')).toBe(true);
    expect(descripcionBreve('   ')).toBeNull();
    expect(descripcionBreve(null)).toBeNull();
  });
});
