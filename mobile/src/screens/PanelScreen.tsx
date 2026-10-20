import { StyleSheet, Text, View } from 'react-native';
import { AccesosRapidos } from '../components/AccesosRapidos';
import { BannerAlerta } from '../components/BannerAlerta';
import { BarraApilada } from '../components/BarraApilada';
import { ChipEstado } from '../components/ChipEstado';
import { EsqueletoLista } from '../components/Esqueleto';
import { GlassPanel } from '../components/GlassPanel';
import { Icon } from '../components/Icon';
import { PantallaApilada } from '../components/PantallaApilada';
import { SectionHeader } from '../components/ScreenHeader';
import { EstadoError, EstadoMensaje } from '../components/StateView';
import { TarjetaResumen } from '../components/TarjetaResumen';
import { GrupoVidrio } from '../components/SuperficieVidrio';
import { useAsync } from '../hooks/useAsync';
import { useEspacioTabBar } from '../navigation/TabBar';
import type { TabScreenProps } from '../navigation/types';
import { listarDestinosAdmin, obtenerMetricas, obtenerModelosMl, obtenerSaludBackend } from '../services/admin';
import { mensajeDeError } from '../services/api';
import { obtenerClimaIsla } from '../services/clima';
import { listarDestinos } from '../services/destinos';
import { obtenerPrediccion } from '../services/ocupacion';
import { obtenerPerfil } from '../services/perfil';
import { listarTickets } from '../services/tickets';
import type { EstadoTicket } from '../services/tipos';
import { colors, radius, spacing, ticketColors, type TonoChip, typography } from '../theme';
import type { NombreIcono } from '../utils/categorias';
import { textoSinClima } from '../utils/clima';
import { formatearFechaLarga, hoyEnColombia } from '../utils/fecha';
import { alertasAdmin, elegirDestinoSonda, estadoMlDesde, HORA_SONDA, variacion, type Variacion } from '../utils/panelAdmin';
import { resumenAdmin } from '../utils/resumenTickets';
import { ESTADOS_TICKET, ETIQUETA_ESTADO_TICKET } from '../utils/tickets';
import { primerNombre } from '../utils/validacion';

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('es-CO');

/** Métricas, tickets, destinos y perfil (todo del administrador). */
async function cargarPanel() {
  const [metricas, tickets, destinos, perfil] = await Promise.all([obtenerMetricas(), listarTickets(), listarDestinosAdmin(), obtenerPerfil()]);
  return { metricas, tickets, destinos, perfil };
}

/** Predicción de prueba de hoy a mediodía: dice qué proveedor responde de verdad (ML o heurístico). */
async function prediccionDePrueba() {
  const id = elegirDestinoSonda(await listarDestinos());
  return id === null ? null : obtenerPrediccion(id, hoyEnColombia(), HORA_SONDA);
}

/**
 * Estado de la plataforma: cada servicio por separado (si uno falla, los demás se muestran).
 * La comparativa (/v1/admin/modelos) y las predicciones son cosas distintas: la primera puede
 * fallar (backend sin el endpoint, ML viejo) mientras las predicciones salen del ML sin problema.
 */
async function cargarPlataforma() {
  const [salud, modelos, clima, prediccion] = await Promise.allSettled([
    obtenerSaludBackend(),
    obtenerModelosMl(),
    obtenerClimaIsla(1),
    prediccionDePrueba(),
  ]);
  return {
    salud: salud.status === 'fulfilled' ? salud.value : null,
    modelos: modelos.status === 'fulfilled' ? modelos.value : null,
    errorModelos: modelos.status === 'rejected' ? mensajeDeError(modelos.reason) : null,
    clima: clima.status === 'fulfilled' ? clima.value : null,
    prediccion: prediccion.status === 'fulfilled' ? prediccion.value : null,
  };
}

const TONO_VARIACION: Record<Variacion['direccion'], { tono: TonoChip; icono: NombreIcono }> = {
  sube: { tono: ticketColors.estado.resuelto, icono: 'trending-up' },
  baja: { tono: ticketColors.prioridad.alta, icono: 'trending-down' },
  igual: { tono: ticketColors.estado.cerrado, icono: 'trending-flat' },
  nuevo: { tono: ticketColors.estado.abierto, icono: 'fiber-new' },
};
const TONO_OK = ticketColors.estado.resuelto;
const TONO_AVISO = ticketColors.estado.en_revision;
const TONO_ERROR = ticketColors.prioridad.alta;

function TarjetaActividad({ valor, etiqueta, actual, anterior }: { valor: number | null; etiqueta: string; actual?: number; anterior?: number }) {
  const v = actual !== undefined ? variacion(actual, anterior) : null;
  return (
    <GlassPanel
      tono="strong"
      radius={radius.xl}
      padding={spacing.gutter}
      style={styles.actividad}
    >
      <View accessible accessibilityLabel={`${etiqueta}: ${valor === null ? 'sin datos' : fmt(valor)}${v ? `, ${v.texto} frente al periodo anterior` : ''}`} style={styles.actividadInterior}>
        <Text style={styles.actividadValor}>{valor === null ? '—' : fmt(valor)}</Text>
        <Text style={styles.actividadEtiqueta}>{etiqueta}</Text>
        {v ? (
          <ChipEstado etiqueta={v.texto} icono={TONO_VARIACION[v.direccion].icono} tono={TONO_VARIACION[v.direccion].tono} tamano="sm" />
        ) : (
          <Text style={styles.nota}>Sin datos del periodo anterior</Text>
        )}
      </View>
    </GlassPanel>
  );
}

function Ranking({ filas, unidad }: { filas: { idDestino: number; nombre: string; valor: number }[]; unidad: string }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <>
      {filas.map((f, i) => (
        <View key={f.idDestino} style={styles.rankingFila} accessible accessibilityLabel={`${i + 1}. ${f.nombre}: ${f.valor} ${unidad}`}>
          <Text style={styles.rankingNombre}>
            {i + 1}. {f.nombre}
          </Text>
          <View style={styles.rankingBarraFila}>
            <View style={styles.rankingFondo}>
              <View style={[styles.rankingBarra, { width: `${(f.valor / max) * 100}%` }]} />
            </View>
            <Text style={styles.rankingValor}>{fmt(f.valor)}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function FilaPlataforma({ icono, nombre, estado, detalle, tono }: { icono: NombreIcono; nombre: string; estado: string; detalle: string; tono: TonoChip }) {
  return (
    <View style={styles.plataformaFila} accessible accessibilityLabel={`${nombre}: ${estado}. ${detalle}`}>
      <View style={[styles.plataformaIcono, { backgroundColor: tono.fondo }]}>
        <Icon name={icono} size={20} color={tono.texto} />
      </View>
      <View style={styles.plataformaTextos}>
        <Text style={styles.plataformaNombre}>{nombre}</Text>
        <Text style={styles.nota}>{detalle}</Text>
      </View>
      <ChipEstado etiqueta={estado} tono={tono} tamano="sm" />
    </View>
  );
}

/**
 * Inicio del administrador: saludo y fecha, tarjeta héroe con lo que necesita atención (cada cifra
 * abre su sección ya filtrada), alertas, actividad con variación, tickets por estado, rankings,
 * estado de la plataforma y accesos rápidos.
 */
export function PanelScreen({ navigation }: TabScreenProps<'Panel'>) {
  const espacio = useEspacioTabBar();
  const panel = useAsync(cargarPanel, [], { recargarAlEnfocar: true });
  const plataforma = useAsync(cargarPlataforma, [], { recargarAlEnfocar: true });
  const { datos, error, cargando } = panel;
  const m = datos?.metricas;
  const r = resumenAdmin(m, datos?.tickets, datos?.destinos);

  const proveedor = plataforma.datos?.salud?.prediccion?.proveedor;
  const modelos = plataforma.datos?.modelos;
  const prediccion = plataforma.datos?.prediccion;
  const estadoMl = plataforma.cargando ? null : estadoMlDesde({ prediccion, comparativa: modelos, proveedorConfig: proveedor });
  const alertas = datos ? alertasAdmin(datos.tickets, datos.destinos, estadoMl) : [];
  const irA = { tickets: () => navigation.navigate('Tickets'), destinos: () => navigation.navigate('Destinos', { estado: 'cerrado_temporal' }), modelos: () => navigation.navigate('ModelosMl') };

  const recargar = () => {
    panel.recargar();
    plataforma.recargar();
  };

  const clima = plataforma.datos?.clima;
  const estadoClima = plataforma.datos?.salud?.clima?.estado;
  const climaOk = Boolean(clima?.disponible);
  const nombreModelo =
    (prediccion?.proveedor === 'ml' ? prediccion.modelo : null) ?? modelos?.modelos.find((x) => x.activo)?.nombre ?? modelos?.modelos.find((x) => x.ganador)?.nombre;

  return (
    <PantallaApilada
      titulo="Panel"
      saludo={{ nombre: primerNombre(datos?.perfil.nombre), rol: 'administrador' }}
      subtitulo={formatearFechaLarga()}
      espacioInferior={espacio}
      refrescando={panel.refrescando || plataforma.refrescando}
      onRefrescar={recargar}
    >
      <TarjetaResumen
        titulo="Lo que necesita atención hoy"
        cargando={cargando}
        error={!datos ? error : undefined}
        onReintentar={panel.recargar}
        cifras={[
          { clave: 'abiertos', valor: fmt(r.ticketsAbiertos), etiqueta: 'Tickets abiertos', icono: 'mark-email-unread',
            onPress: () => navigation.navigate('Tickets', { estado: 'abierto' }), accesible: `${r.ticketsAbiertos} tickets abiertos. Ver tickets abiertos` },
          { clave: 'sin-asignar', valor: fmt(r.sinAsignar), etiqueta: 'Sin asignar', icono: 'assignment-late',
            onPress: () => navigation.navigate('Tickets', { sinAsignar: true }), accesible: `${r.sinAsignar} tickets sin asignar. Ver tickets sin asignar` },
          { clave: 'usuarios', valor: fmt(r.usuarios), etiqueta: 'Usuarios', icono: 'group',
            onPress: () => navigation.navigate('Usuarios'), accesible: `${r.usuarios} usuarios. Ver usuarios` },
          { clave: 'cerrados', valor: fmt(r.destinosCerrados), etiqueta: 'Destinos cerrados', icono: 'block',
            onPress: () => navigation.navigate('Destinos', { estado: 'cerrado_temporal' }), accesible: `${r.destinosCerrados} destinos cerrados temporalmente. Ver destinos cerrados` },
        ]}
      />

      {cargando ? (
        <EsqueletoLista etiqueta="Cargando el panel" />
      ) : !datos || !m ? (
        <EstadoError error={error} onReintentar={panel.recargar} />
      ) : (
        <>
          <SectionHeader titulo="Alertas" />
          {alertas.length === 0 ? (
            <BannerAlerta
              tono="ok"
              titulo={estadoMl === null ? 'Revisando servicios…' : 'Todo funcionando'}
              detalle={estadoMl === null ? undefined : 'No hay tickets urgentes sin asignar, destinos cerrados ni servicios en respaldo.'}
            />
          ) : (
            <GrupoVidrio espaciado={spacing.sm} style={styles.alertas}>
              {alertas.map((a) => (
                <BannerAlerta key={a.clave} tono={a.tono} titulo={a.titulo} detalle={a.detalle} onPress={a.destino ? (a.destino === 'tickets' ? () => navigation.navigate('Tickets', { prioridad: 'alta', sinAsignar: true }) : irA[a.destino]) : undefined} />
              ))}
            </GrupoVidrio>
          )}

          <SectionHeader titulo="Actividad" />
          <View style={styles.grilla}>
            <TarjetaActividad valor={m.usuarios.ultimos30Dias} etiqueta="Usuarios nuevos (30 días)" actual={m.usuarios.ultimos30Dias} anterior={m.usuarios.anteriores30Dias} />
            <TarjetaActividad valor={m.interacciones.ultimos7Dias} etiqueta="Interacciones (7 días)" actual={m.interacciones.ultimos7Dias} anterior={m.interacciones.anteriores7Dias} />
            <TarjetaActividad
              valor={m.usuariosActivos?.ultimos7Dias ?? null}
              etiqueta="Usuarios activos (7 días)"
              actual={m.usuariosActivos?.ultimos7Dias}
              anterior={m.usuariosActivos?.anteriores7Dias}
            />
          </View>

          <SectionHeader titulo="Tickets por estado" accion={{ texto: 'Ver tickets', onPress: irA.tickets }} />
          <GlassPanel tono="strong" radius={20}>
            {ESTADOS_TICKET.every((e) => !m.ticketsPorEstado[e]) ? (
              <EstadoMensaje icono="inbox" titulo="Aún no hay tickets" mensaje="Cuando alguien reporte un problema, verás aquí cómo se reparten por estado." />
            ) : (
              <BarraApilada<EstadoTicket>
                conteos={m.ticketsPorEstado}
                orden={ESTADOS_TICKET}
                etiqueta={(e) => ETIQUETA_ESTADO_TICKET[e]}
                tono={(e) => ticketColors.estado[e]}
                onElegir={(e) => navigation.navigate('Tickets', { estado: e })}
                etiquetaAccesible="Tickets por estado"
              />
            )}
          </GlassPanel>

          <SectionHeader titulo="Destinos más vistos" />
          <GlassPanel tono="strong" radius={20} style={styles.seccion}>
            {m.destinosMasVistos.length === 0 ? (
              <EstadoMensaje
                icono="visibility"
                titulo="Aún no hay vistas"
                mensaje="Cuando los turistas abran destinos, verás aquí los más vistos."
                accion={{ texto: 'Ver destinos', onPress: () => navigation.navigate('Destinos') }}
              />
            ) : (
              <Ranking filas={m.destinosMasVistos.slice(0, 5).map((d) => ({ idDestino: d.idDestino, nombre: d.nombre, valor: d.vistas }))} unidad="vistas" />
            )}
            <View style={styles.subseccion}>
              <Text style={styles.subtitulo}>Más guardados en favoritos</Text>
              {m.favoritosMasGuardados === undefined ? (
                <Text style={styles.nota}>Disponible cuando se aplique la migración del panel en la base de datos.</Text>
              ) : m.favoritosMasGuardados.length === 0 ? (
                <Text style={styles.nota}>Nadie ha guardado destinos en favoritos todavía.</Text>
              ) : (
                <Ranking filas={m.favoritosMasGuardados.map((d) => ({ idDestino: d.idDestino, nombre: d.nombre, valor: d.favoritos }))} unidad="favoritos" />
              )}
            </View>
          </GlassPanel>
        </>
      )}

      <SectionHeader titulo="Estado de la plataforma" />
      <GlassPanel tono="strong" radius={20} style={styles.seccion}>
        {plataforma.cargando ? (
          <EsqueletoLista filas={3} etiqueta="Revisando los servicios" />
        ) : (
          <>
            <FilaPlataforma
              icono="dns"
              nombre="Backend"
              estado={plataforma.datos?.salud ? 'OK' : 'Sin respuesta'}
              detalle={plataforma.datos?.salud ? 'La API responde.' : 'No se pudo consultar /v1/health.'}
              tono={plataforma.datos?.salud ? TONO_OK : TONO_ERROR}
            />
            <FilaPlataforma
              icono="insights"
              nombre="Predicciones"
              estado={estadoMl === 'ok' ? 'ML en uso' : estadoMl === 'respaldo' ? 'Respaldo' : estadoMl === 'heuristico' ? 'Heurístico' : 'Sin ML'}
              detalle={
                estadoMl === 'ok'
                  ? `Las calcula el modelo ${nombreModelo ?? 'ganador'}.`
                  : estadoMl === 'respaldo'
                    ? `Responde un modelo de respaldo${nombreModelo ? ` (${nombreModelo})` : ''}: el ganador no cargó.`
                    : estadoMl === 'heuristico'
                      ? 'El backend está configurado con el cálculo heurístico (PREDICCION_PROVEEDOR=heuristico).'
                      : 'Se pidió el ML y no respondió: se usa el promedio histórico.'
              }
              tono={estadoMl === 'ok' ? TONO_OK : TONO_AVISO}
            />
            <FilaPlataforma
              icono="table-chart"
              nombre="Comparativa de modelos"
              estado={modelos ? 'Disponible' : 'No disponible'}
              detalle={modelos ? 'GET /v1/admin/modelos responde (pantalla Modelos de ML).' : (plataforma.datos?.errorModelos ?? 'Sin respuesta.')}
              tono={modelos ? TONO_OK : TONO_AVISO}
            />
            <FilaPlataforma
              icono="cloud"
              nombre="Clima"
              estado={climaOk ? (estadoClima === 'desactualizado' ? 'Desactualizado' : 'Disponible') : 'No disponible'}
              detalle={climaOk ? 'Pronóstico de Open-Meteo en caché.' : textoSinClima(clima?.motivoSinClima)}
              tono={climaOk ? (estadoClima === 'desactualizado' ? TONO_AVISO : TONO_OK) : TONO_AVISO}
            />
          </>
        )}
      </GlassPanel>

      <SectionHeader titulo="Accesos rápidos" />
      <AccesosRapidos
        accesos={[
          { etiqueta: 'Destinos', icono: 'place', onPress: () => navigation.navigate('Destinos') },
          { etiqueta: 'Usuarios', icono: 'group', onPress: () => navigation.navigate('Usuarios') },
          { etiqueta: 'Modelos de ML', icono: 'insights', onPress: () => navigation.navigate('ModelosMl') },
          { etiqueta: 'Comparar una predicción', icono: 'compare-arrows', onPress: () => navigation.navigate('ModelosMl', { comparar: true }) },
        ]}
      />
    </PantallaApilada>
  );
}

const styles = StyleSheet.create({
  alertas: { gap: spacing.sm },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actividad: { flexGrow: 1, flexBasis: '45%', minWidth: 0 },
  actividadInterior: { gap: spacing.xs },
  actividadValor: { ...typography.headlineMd, fontFamily: typography.display.fontFamily, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  actividadEtiqueta: { ...typography.labelBold, fontSize: 13, lineHeight: 17, color: colors.textMuted },
  nota: { ...typography.bodyMd, color: colors.textMuted },
  seccion: { gap: spacing.md },
  subseccion: { gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md },
  subtitulo: { ...typography.titleMd, fontSize: 16, color: colors.textStrong },
  rankingFila: { gap: 4 },
  rankingNombre: { ...typography.bodyMd, color: colors.textStrong },
  rankingBarraFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankingFondo: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden' },
  rankingBarra: { height: '100%', borderRadius: radius.full, backgroundColor: colors.secondary },
  rankingValor: { ...typography.labelBold, color: colors.textMuted, minWidth: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  plataformaFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter, minHeight: 52 },
  plataformaIcono: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  plataformaTextos: { flex: 1, gap: 2 },
  plataformaNombre: { ...typography.titleMd, fontSize: 16, color: colors.textStrong },
});
