import type { NivelOcupacion } from '../services/tipos';

/** Adjetivo concordado con "ocupación" (la referencia usa "Ocupación baja / media / alta"). */
export const ADJETIVO_NIVEL: Record<NivelOcupacion, string> = {
  Bajo: 'baja',
  Medio: 'media',
  Alto: 'alta',
};

/** Etiqueta corta para badges: "Baja", "Media", "Alta". */
export const ETIQUETA_NIVEL: Record<NivelOcupacion, string> = {
  Bajo: 'Baja',
  Medio: 'Media',
  Alto: 'Alta',
};

/** Frase de contexto según el nivel ("Ocupación ideal para relajarse", …). */
export const NOTA_NIVEL: Record<NivelOcupacion, string> = {
  Bajo: 'Poca afluencia en este momento',
  Medio: 'Afluencia moderada en este momento',
  Alto: 'Concurrido en este momento',
};

/** Opciones del nivel de ocupación preferido (pantalla de preferencias). */
export const OPCIONES_NIVEL: { nivel: NivelOcupacion; titulo: string; descripcion: string; icono: string }[] = [
  { nivel: 'Bajo', titulo: 'Baja', descripcion: 'Lugares tranquilos', icono: 'signal-cellular-alt-1-bar' },
  { nivel: 'Medio', titulo: 'Media', descripcion: 'Algo de ambiente', icono: 'signal-cellular-alt-2-bar' },
  { nivel: 'Alto', titulo: 'Alta', descripcion: 'No me importa si hay gente', icono: 'signal-cellular-alt' },
];

export const NIVELES: NivelOcupacion[] = ['Bajo', 'Medio', 'Alto'];

export const formatearPorcentaje = (valor: number) => `${Math.round(valor)}%`;
