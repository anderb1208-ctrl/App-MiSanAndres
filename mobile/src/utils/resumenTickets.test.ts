import type { EstadoTicket, Ticket } from '../services/tipos';
import { resumenAdmin, resumenTecnico } from './resumenTickets';

const YO = 'tecnico-1';
const t = (estado: EstadoTicket, tecnico: string | null = null): Pick<Ticket, 'estado' | 'tecnico'> => ({
  estado,
  tecnico: tecnico ? { id: tecnico, nombre: 'Técnico' } : null,
});

const TICKETS = [
  t('abierto'),
  t('abierto', YO),
  t('en_revision', YO),
  t('en_revision', 'otro'),
  t('resuelto', YO),
  t('cerrado'),
];

describe('resumenTecnico', () => {
  it('cuenta los activos asignados a mí, los abiertos y los en revisión', () => {
    expect(resumenTecnico(TICKETS, YO)).toEqual({ asignadosAMi: 2, abiertos: 2, abiertosSinAsignar: 1, enRevision: 2 });
  });

  it('sin usuario o sin tickets no falla', () => {
    expect(resumenTecnico(TICKETS, null).asignadosAMi).toBe(0);
    expect(resumenTecnico(undefined, YO)).toEqual({ asignadosAMi: 0, abiertos: 0, abiertosSinAsignar: 0, enRevision: 0 });
  });
});

describe('resumenAdmin', () => {
  const metricas = { usuarios: { total: 42, porRol: {}, ultimos30Dias: 3 }, ticketsPorEstado: { abierto: 5, en_revision: 2 } };

  it('usa las métricas para abiertos y usuarios, y la lista para sin asignar', () => {
    const destinos = [{ estado: 'abierto' as const }, { estado: 'cerrado_temporal' as const }, { estado: 'inactivo' as const }];
    expect(resumenAdmin(metricas, TICKETS, destinos)).toEqual({ ticketsAbiertos: 5, sinAsignar: 1, usuarios: 42, destinosCerrados: 1 });
  });

  it('sin métricas cuenta los abiertos de la lista', () => {
    expect(resumenAdmin(null, TICKETS, null)).toEqual({ ticketsAbiertos: 2, sinAsignar: 1, usuarios: 0, destinosCerrados: 0 });
  });

  it('los resueltos y cerrados no cuentan como sin asignar', () => {
    expect(resumenAdmin(null, [t('resuelto'), t('cerrado')], []).sinAsignar).toBe(0);
  });
});
