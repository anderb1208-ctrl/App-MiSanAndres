import type { ItemHistorial } from '../services/tipos';
import { seccionesPorDia, textoItem, tituloDia, unirPaginas } from './historial';

const item = (idDestino: number, dia: string | null, veces = 1, tipos: ItemHistorial['tipos'] = ['vista']): ItemHistorial => ({
  idDestino,
  destino: { id: idDestino, nombre: `Destino ${idDestino}`, categoria: 'playa', imagenUrl: null },
  veces,
  tipos,
  ultimaVez: dia ? `${dia}T15:00:00Z` : null,
  dia,
});

describe('historial', () => {
  it('titula los días como Hoy, Ayer o la fecha', () => {
    expect(tituloDia('2026-10-19', '2026-10-19')).toBe('Hoy');
    expect(tituloDia('2026-10-18', '2026-10-19')).toBe('Ayer');
    expect(tituloDia('2026-10-12', '2026-10-19')).toBe('Lunes 12 de octubre');
    expect(tituloDia('2025-12-31', '2026-10-19')).toMatch(/^Miércoles 31 de diciembre( de)? 2025$/);
  });

  it('agrupa por día con encabezados y deja sin encabezado los filtros sin día', () => {
    const secciones = seccionesPorDia([item(1, '2026-10-19', 3), item(2, '2026-10-19'), item(1, '2026-10-18')], '2026-10-19');
    expect(secciones.map((s) => [s.titulo, s.items.length])).toEqual([
      ['Hoy', 2],
      ['Ayer', 1],
    ]);
    expect(seccionesPorDia([item(1, null), item(2, null)])).toEqual([
      expect.objectContaining({ clave: 'todos', titulo: null }),
    ]);
  });

  it('une páginas sin repetir ítems', () => {
    expect(unirPaginas([item(1, '2026-10-19')], [item(1, '2026-10-19'), item(2, '2026-10-19')]).map((i) => i.idDestino)).toEqual([1, 2]);
  });

  it('describe las visitas repetidas y los populares', () => {
    expect(textoItem(item(1, '2026-10-19', 3), 'recientes')).toBe('Visto 3 veces');
    expect(textoItem(item(1, '2026-10-19', 1), 'recientes')).toBe('Visto');
    expect(textoItem(item(1, '2026-10-19', 2, ['vista', 'favorito']), 'recientes')).toBe('2 actividades · Guardado en favoritos');
    expect(textoItem({ ...item(1, null, 42), personas: 17 }, 'populares')).toBe('42 consultas · 17 personas en 30 días');
  });
});
