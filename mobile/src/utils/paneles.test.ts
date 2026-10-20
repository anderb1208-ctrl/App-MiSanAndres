import type { Destino, EstadoTicket, PrioridadTicket, Ticket } from '../services/tipos';
import { conteosChips, filtrarTickets, ordenarTickets } from './filtrosTickets';
import { alertasAdmin, segmentosBarra, variacion } from './panelAdmin';
import {
  actividadTecnico,
  destinosConMasReportes,
  formatearDuracion,
  haceTiempo,
  inicioDeSemana,
  requiereAtencion,
} from './panelTecnico';

const YO = 'tec-1';
// Lunes 19 oct 2026, 10:00 en Colombia (15:00 UTC).
const AHORA = Date.parse('2026-10-19T15:00:00Z');
let id = 0;

function ticket(p: Partial<Ticket> & { estado?: EstadoTicket; prioridad?: PrioridadTicket } = {}): Ticket {
  id++;
  return {
    id,
    categoria: 'informacion_incorrecta',
    asunto: `Ticket ${id}`,
    descripcion: 'Descripción',
    prioridad: 'media',
    estado: 'abierto',
    destino: null,
    creador: { id: 'turista', nombre: 'Ana' },
    tecnico: null,
    fechaCreacion: '2026-10-10T15:00:00Z',
    fechaActualizacion: '2026-10-10T15:00:00Z',
    fechaCierre: null,
    esPropio: false,
    ...p,
  };
}
const mio = { id: YO, nombre: 'Yo' };
const otro = { id: 'tec-2', nombre: 'Otro' };

describe('haceTiempo y formatearDuracion', () => {
  it('describe el tiempo transcurrido', () => {
    expect(haceTiempo('2026-10-19T14:40:00Z', AHORA)).toBe('hace unos minutos');
    expect(haceTiempo('2026-10-19T14:00:00Z', AHORA)).toBe('hace 1 hora');
    expect(haceTiempo('2026-10-19T05:00:00Z', AHORA)).toBe('hace 10 horas');
    expect(haceTiempo('2026-10-18T15:00:00Z', AHORA)).toBe('hace 1 día');
    expect(haceTiempo('2026-10-12T15:00:00Z', AHORA)).toBe('hace 7 días');
    expect(haceTiempo('2026-10-20T15:00:00Z', AHORA)).toBe('hace unos minutos'); // en el futuro: no negativo
  });

  it('formatea duraciones', () => {
    expect(formatearDuracion(0.5)).toBe('menos de 1 h');
    expect(formatearDuracion(5.4)).toBe('5 h');
    expect(formatearDuracion(60)).toBe('2,5 días');
  });

  it('la semana empieza el lunes a las 00:00 de Colombia', () => {
    expect(new Date(inicioDeSemana(AHORA)).toISOString()).toBe('2026-10-19T05:00:00.000Z');
    // Domingo 25 a las 23:00 de Colombia sigue en la misma semana.
    expect(new Date(inicioDeSemana(Date.parse('2026-10-26T04:00:00Z'))).toISOString()).toBe('2026-10-19T05:00:00.000Z');
  });
});

describe('requiereAtencion', () => {
  it('prioridad alta primero, luego los que llevan más tiempo sin moverse; sin los de otros ni los resueltos', () => {
    const lista = [
      ticket({ asunto: 'media vieja', fechaActualizacion: '2026-10-01T00:00:00Z' }),
      ticket({ asunto: 'alta nueva', prioridad: 'alta', fechaActualizacion: '2026-10-18T00:00:00Z' }),
      ticket({ asunto: 'alta mía vieja', prioridad: 'alta', tecnico: mio, estado: 'en_revision', fechaActualizacion: '2026-10-05T00:00:00Z' }),
      ticket({ asunto: 'alta de otro', prioridad: 'alta', tecnico: otro }),
      ticket({ asunto: 'resuelto', prioridad: 'alta', estado: 'resuelto' }),
      ticket({ asunto: 'baja', prioridad: 'baja', fechaActualizacion: '2026-09-01T00:00:00Z' }),
    ];
    expect(requiereAtencion(lista, YO).map((t) => t.asunto)).toEqual(['alta mía vieja', 'alta nueva', 'media vieja']);
    expect(requiereAtencion([], YO)).toEqual([]);
  });
});

describe('actividadTecnico', () => {
  it('resueltos de la semana, promedio de resolución y progreso', () => {
    const lista = [
      ticket({ tecnico: mio, estado: 'resuelto', fechaCreacion: '2026-10-19T05:00:00Z', fechaCierre: '2026-10-19T11:00:00Z' }), // 6 h, esta semana
      ticket({ tecnico: mio, estado: 'cerrado', fechaCreacion: '2026-10-10T00:00:00Z', fechaCierre: '2026-10-11T00:00:00Z' }), // 24 h, semana pasada
      ticket({ tecnico: mio, estado: 'en_revision' }),
      ticket({ tecnico: mio, estado: 'abierto' }),
      ticket({ tecnico: otro, estado: 'resuelto', fechaCierre: '2026-10-19T10:00:00Z' }),
    ];
    expect(actividadTecnico(lista, YO, AHORA)).toEqual({ resueltosSemana: 1, promedioHoras: 15, resueltos: 2, asignados: 4, progreso: 0.5 });
  });

  it('sin tickets asignados: sin promedio ni progreso', () => {
    expect(actividadTecnico([ticket()], YO, AHORA)).toEqual({ resueltosSemana: 0, promedioHoras: null, resueltos: 0, asignados: 0, progreso: null });
    expect(actividadTecnico(undefined, null, AHORA).asignados).toBe(0);
  });
});

describe('destinosConMasReportes', () => {
  it('cuenta solo los activos por destino y ordena de más a menos', () => {
    const jc = { id: 1, nombre: 'Johnny Cay' };
    const sb = { id: 2, nombre: 'Spratt Bight' };
    const lista = [ticket({ destino: jc }), ticket({ destino: jc, estado: 'en_revision' }), ticket({ destino: sb }), ticket({ destino: sb, estado: 'cerrado' }), ticket()];
    expect(destinosConMasReportes(lista)).toEqual([
      { id: 1, nombre: 'Johnny Cay', abiertos: 2 },
      { id: 2, nombre: 'Spratt Bight', abiertos: 1 },
    ]);
  });
});

describe('filtros de la lista de tickets', () => {
  const lista = [
    ticket({ asunto: 'Horario equivocado', destino: { id: 1, nombre: 'Johnny Cay' }, prioridad: 'alta', fechaCreacion: '2026-10-01T00:00:00Z' }),
    ticket({ asunto: 'Foto rota', tecnico: mio, estado: 'en_revision', fechaCreacion: '2026-10-05T00:00:00Z' }),
    ticket({ asunto: 'Precio viejo', estado: 'resuelto', prioridad: 'baja', fechaCreacion: '2026-10-03T00:00:00Z' }),
  ];

  it('combina estado, prioridad, asignados a mí, sin asignar y texto (sin tildes ni mayúsculas)', () => {
    expect(filtrarTickets(lista, { estado: 'abierto' }).map((t) => t.asunto)).toEqual(['Horario equivocado']);
    expect(filtrarTickets(lista, { mios: true }, YO).map((t) => t.asunto)).toEqual(['Foto rota']);
    expect(filtrarTickets(lista, { sinAsignar: true }).map((t) => t.asunto)).toEqual(['Horario equivocado']);
    expect(filtrarTickets(lista, { texto: 'JOHNNY' }).map((t) => t.asunto)).toEqual(['Horario equivocado']);
    expect(filtrarTickets(lista, { texto: 'información' }).length).toBe(3); // categoría
    expect(filtrarTickets(lista, { texto: `#${lista[1]!.id}` }).map((t) => t.asunto)).toEqual(['Foto rota']);
    expect(filtrarTickets(lista, { mios: true }, null)).toEqual([]);
  });

  it('ordena por recientes, antiguos o prioridad', () => {
    expect(ordenarTickets(lista, 'recientes').map((t) => t.asunto)).toEqual(['Foto rota', 'Precio viejo', 'Horario equivocado']);
    expect(ordenarTickets(lista, 'antiguos').map((t) => t.asunto)).toEqual(['Horario equivocado', 'Precio viejo', 'Foto rota']);
    expect(ordenarTickets(lista, 'prioridad').map((t) => t.asunto)).toEqual(['Horario equivocado', 'Foto rota', 'Precio viejo']);
  });

  it('cada chip cuenta con los demás filtros aplicados', () => {
    const c = conteosChips(lista, { prioridad: 'alta' }, YO);
    expect(c.estado).toEqual({ abierto: 1, en_revision: 0, resuelto: 0, cerrado: 0 });
    expect(c.prioridad).toEqual({ baja: 1, media: 1, alta: 1 });
    expect(c.mios).toBe(0);
    expect(c.sinAsignar).toBe(1);
  });
});

describe('panel del administrador', () => {
  it('variación frente al periodo anterior', () => {
    expect(variacion(12, 10)).toEqual({ texto: '+20 %', direccion: 'sube' });
    expect(variacion(5, 10)).toEqual({ texto: '−50 %', direccion: 'baja' });
    expect(variacion(10, 10)).toEqual({ texto: 'Sin cambios', direccion: 'igual' });
    expect(variacion(3, 0)).toEqual({ texto: 'Nuevo en este periodo', direccion: 'nuevo' });
    expect(variacion(0, 0)).toEqual({ texto: 'Sin cambios', direccion: 'igual' });
    expect(variacion(5, undefined)).toBeNull();
  });

  it('alertas: alta sin asignar, destinos cerrados con motivo y fechas, y ML', () => {
    const destinos: Pick<Destino, 'id' | 'nombre' | 'estado' | 'cierre'>[] = [
      { id: 1, nombre: 'Johnny Cay', estado: 'cerrado_temporal', cierre: { motivo: 'Oleaje', desde: '2026-10-18T13:00:00Z', hasta: null } },
      { id: 2, nombre: 'Spratt Bight', estado: 'abierto', cierre: null },
      { id: 3, nombre: 'Acuario', estado: 'cerrado_temporal', cierre: { motivo: null, hasta: null } },
    ];
    const tickets = [ticket({ prioridad: 'alta' }), ticket({ prioridad: 'alta', tecnico: mio }), ticket({ prioridad: 'alta', estado: 'resuelto' })];
    const a = alertasAdmin(tickets, destinos, 'respaldo');
    expect(a.map((x) => x.clave)).toEqual(['alta-sin-asignar', 'cerrado-1', 'cerrado-3', 'ml-respaldo']);
    expect(a[0]!.titulo).toBe('1 ticket de prioridad alta sin asignar');
    expect(a[1]!.detalle).toMatch(/^Motivo: Oleaje · desde el /);
    expect(a[2]!.detalle).toBe('Sin motivo registrado.');
    expect(alertasAdmin([], [], 'sin_respuesta').map((x) => x.clave)).toEqual(['ml-caido']);
    expect(alertasAdmin([], [], 'ok')).toEqual([]);
    expect(alertasAdmin(null, null, null)).toEqual([]);
  });

  it('segmentos de la barra apilada', () => {
    expect(segmentosBarra({ abierto: 3, en_revision: 0, resuelto: 1 }, ['abierto', 'en_revision', 'resuelto', 'cerrado'] as const)).toEqual({
      total: 4,
      segmentos: [
        { clave: 'abierto', cantidad: 3, fraccion: 0.75 },
        { clave: 'resuelto', cantidad: 1, fraccion: 0.25 },
      ],
    });
    expect(segmentosBarra({}, ['abierto'] as const)).toEqual({ total: 0, segmentos: [] });
  });
});
