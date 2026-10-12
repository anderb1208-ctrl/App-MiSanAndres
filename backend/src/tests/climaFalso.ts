import { ATRIBUCION_OPEN_METEO } from '../services/clima/openMeteoProvider';
import type { ClimaHora, Coordenada, OpcionesPronostico, ProveedorClima } from '../services/clima/tipos';
import { sumarDias } from '../services/calendarioService';

type ClimaParcial = Partial<Omit<ClimaHora, 'fechaHora'>>;

/** Despejado y sin lluvia: no activa ningún factor. */
export const CLIMA_DESPEJADO: ClimaParcial = {
  temperatura: 29,
  probLluvia: 10,
  precipitacion: 0,
  codigoClima: 1,
  viento: 15,
};

/**
 * Proveedor de clima para las pruebas: nunca usa la red. Genera una serie por hora
 * desde `desde` (un día antes de "hoy" en las pruebas) con el clima configurado.
 */
export class ProveedorClimaFalso implements ProveedorClima {
  readonly nombre = 'Falso';
  readonly atribucion = ATRIBUCION_OPEN_METEO;
  llamadas: Coordenada[][] = [];
  fallar = false;
  desde = '2026-09-29';
  /** Clima de todas las horas, salvo las que se fijen con `enHora`. */
  clima: ClimaParcial = CLIMA_DESPEJADO;
  private porHora = new Map<string, ClimaParcial>();

  reiniciar() {
    this.llamadas = [];
    this.fallar = false;
    this.desde = '2026-09-29';
    this.clima = CLIMA_DESPEJADO;
    this.porHora.clear();
  }

  /** Clima de una hora concreta ("2026-09-30T12:00"). */
  enHora(fechaHora: string, clima: ClimaParcial) {
    this.porHora.set(fechaHora, clima);
  }

  async pronostico(puntos: Coordenada[], opciones: OpcionesPronostico = {}): Promise<ClimaHora[][]> {
    this.llamadas.push(puntos);
    if (this.fallar) throw new Error('sin conexión');
    const dias = (opciones.diasPasados ?? 1) + (opciones.diasPronostico ?? 16);
    const serie: ClimaHora[] = [];
    for (let d = 0; d < dias; d++) {
      const fecha = sumarDias(this.desde, d);
      for (let h = 0; h < 24; h++) {
        const fechaHora = `${fecha}T${String(h).padStart(2, '0')}:00`;
        const c = { ...CLIMA_DESPEJADO, ...this.clima, ...this.porHora.get(fechaHora) };
        serie.push({
          fechaHora,
          temperatura: c.temperatura ?? null,
          probLluvia: c.probLluvia ?? null,
          precipitacion: c.precipitacion ?? null,
          codigoClima: c.codigoClima ?? null,
          viento: c.viento ?? null,
        });
      }
    }
    return puntos.map(() => serie);
  }
}

export const proveedorFalso = new ProveedorClimaFalso();
