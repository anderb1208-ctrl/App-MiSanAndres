import { solicitud } from './api';
import type { CamposDestino, Destino, EstadoDestino, MetricasAdmin, ResultadoAviso, Rol, UsuarioAdmin } from './tipos';

/** Endpoints del panel del administrador (el backend y la base verifican el rol). */
export const obtenerMetricas = () => solicitud<MetricasAdmin>('/admin/metricas', { autenticado: true });

export const listarUsuarios = () => solicitud<UsuarioAdmin[]>('/admin/usuarios', { autenticado: true });

export const cambiarRol = (id: string, rol: Rol) =>
  solicitud<UsuarioAdmin>(`/admin/usuarios/${id}/rol`, { metodo: 'PATCH', cuerpo: { rol }, autenticado: true });

export const listarDestinosAdmin = () => solicitud<Destino[]>('/admin/destinos', { autenticado: true });

export const crearDestino = (campos: CamposDestino) =>
  solicitud<Destino>('/admin/destinos', { metodo: 'POST', cuerpo: campos, autenticado: true });

export const editarDestino = (id: number, campos: Partial<CamposDestino>) =>
  solicitud<Destino>(`/admin/destinos/${id}`, { metodo: 'PATCH', cuerpo: campos, autenticado: true });

export const cambiarEstadoDestino = (id: number, estado: EstadoDestino, cierre: { motivo?: string; hasta?: string } = {}) =>
  solicitud<{ destino: Destino; aviso: ResultadoAviso | null }>(`/admin/destinos/${id}/estado`, {
    metodo: 'PATCH',
    cuerpo: { estado, ...cierre },
    autenticado: true,
  });
