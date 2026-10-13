/**
 * Genera docs/revision-ubicaciones.html: una página autónoma (se abre con doble
 * clic) para revisar y corregir a mano el punto de acceso de cada destino.
 */
import type { Tierra } from './geo';
import type { Ubicacion } from './publicar';

export function paginaRevision(ubicaciones: Ubicacion[], tierra: Tierra, generado: string): string {
  const datos = ubicaciones.map((u) => ({
    nombre: u.nombre,
    categoria: u.categoria,
    lat: u.latitud,
    lon: u.longitud,
    fuente: u.fuente,
    confianza: u.confianza,
    verificada: u.verificada,
    metodo: u.metodo,
    nota: u.nota,
    osm: u.osm,
  }));
  // Solo los anillos exteriores, para dibujar el contorno y avisar si un marcador queda en el agua.
  const contornos = tierra.features.map((f) =>
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0]),
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisión de ubicaciones</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<style>
  :root {
    --bg: #f6f7f9; --panel: #ffffff; --text: #14202b; --muted: #5b6875; --line: #dde2e7;
    --alta: #15803d; --media: #d97706; --baja: #dc2626; --verificada: #2563eb; --accent: #0e7490;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #0f1720; --panel: #17212b; --text: #e6edf3; --muted: #9aa7b4; --line: #2a3742; }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { font: 14px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); display: flex; }
  aside { width: 360px; max-width: 100%; display: flex; flex-direction: column; background: var(--panel); border-right: 1px solid var(--line); }
  header { padding: 16px; border-bottom: 1px solid var(--line); }
  h1 { font-size: 17px; margin: 0 0 4px; }
  .sub { color: var(--muted); font-size: 12.5px; margin: 0; }
  .leyenda { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 10px; font-size: 12.5px; }
  .leyenda span { display: inline-flex; align-items: center; gap: 5px; }
  .punto { width: 11px; height: 11px; border-radius: 50%; display: inline-block; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.25); }
  .acciones { padding: 12px 16px; display: grid; gap: 8px; border-bottom: 1px solid var(--line); }
  button { font: inherit; border-radius: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--text); padding: 8px 10px; cursor: pointer; }
  button.primario { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  button:disabled { opacity: .5; cursor: default; }
  .fila { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); }
  .estado { font-size: 12.5px; color: var(--muted); min-height: 1.2em; }
  ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
  li { padding: 9px 16px; border-bottom: 1px solid var(--line); cursor: pointer; display: grid; grid-template-columns: 14px 1fr auto; gap: 8px; align-items: center; }
  li:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
  li .nombre { font-weight: 600; }
  li .meta { color: var(--muted); font-size: 12px; }
  .chip { font-size: 11px; padding: 1px 7px; border-radius: 99px; border: 1px solid var(--line); color: var(--muted); white-space: nowrap; }
  .chip.revisado { border-color: var(--verificada); color: var(--verificada); }
  .chip.agua { border-color: var(--baja); color: var(--baja); }
  #mapa { flex: 1; min-height: 100%; }
  textarea { width: 100%; height: 90px; font: 12px ui-monospace, Consolas, monospace; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--text); padding: 6px; display: none; }
  .etiqueta { background: rgba(255,255,255,.92); border: 0; box-shadow: 0 1px 3px rgba(0,0,0,.3); font-size: 11.5px; font-weight: 600; padding: 1px 6px; color: #14202b; }
  .etiqueta::before { display: none; }
  .popup h3 { margin: 0 0 4px; font-size: 14px; }
  .popup p { margin: 3px 0; }
  .popup .botones { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .popup button { padding: 4px 8px; font-size: 12px; }
  @media (max-width: 760px) {
    body { flex-direction: column; }
    aside { width: 100%; height: 48%; border-right: 0; border-bottom: 1px solid var(--line); }
    #mapa { min-height: 52%; }
  }
</style>
</head>
<body>
<aside>
  <header>
    <h1>Revisión de ubicaciones · MiSanAndrés</h1>
    <p class="sub">Arrastra cada marcador al <strong>punto de acceso</strong> (en tierra): playas, acceso desde la calle; cayos, muelle o desembarque; resto, la entrada. Generado el ${generado}.</p>
    <div class="leyenda">
      <span><i class="punto" style="background:var(--alta)"></i>Confianza alta</span>
      <span><i class="punto" style="background:var(--media)"></i>Media</span>
      <span><i class="punto" style="background:var(--baja)"></i>Baja</span>
      <span><i class="punto" style="background:var(--verificada)"></i>Verificada</span>
    </div>
  </header>
  <div class="acciones">
    <button class="primario" id="copiar">Copiar correcciones</button>
    <div class="fila">
      <button id="descargar">Descargar JSON</button>
      <label><input type="checkbox" id="nombres" checked> Mostrar nombres</label>
      <label><input type="checkbox" id="todos"> Incluir todos</label>
    </div>
    <div class="estado" id="estado"></div>
    <textarea id="salida" readonly></textarea>
    <p class="sub">Luego, en <code>backend/</code>: <code>npm run ubicaciones:corregir -- correcciones.json</code>. Los destinos incluidos quedan como <em>manual</em> y verificados. Se incluyen los que muevas o marques como revisados (o todos, con la casilla).</p>
  </div>
  <ul id="lista"></ul>
</aside>
<div id="mapa"></div>
<script>
const DESTINOS = ${JSON.stringify(datos)};
const TIERRA = ${JSON.stringify(contornos)};
const COLORES = { alta: '#15803d', media: '#d97706', baja: '#dc2626', verificada: '#2563eb' };
const CATEGORIAS = { playa: 'Playa', cayo: 'Cayo', gastronomia: 'Restaurante', actividad: 'Actividad', naturaleza: 'Naturaleza', cultura: 'Cultura', buceo_snorkel: 'Buceo' };
const CLAVE = 'revision-ubicaciones:' + ${JSON.stringify(generado)};

// Punto en polígono (rayo); el contorno viene como [lon, lat].
function dentro(lat, lon, anillo) {
  let adentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) adentro = !adentro;
  }
  return adentro;
}
const enTierra = (lat, lon) => TIERRA.some((pol) => pol.some((anillo) => dentro(lat, lon, anillo)));

let guardado = {};
try { guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) { guardado = {}; }
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(guardado)); } catch (e) {} };

const mapa = L.map('mapa', { zoomControl: true }).setView([12.545, -81.71], 13);
const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>',
});
const carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  maxZoom: 20, subdomains: 'abcd',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
});
const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics y la comunidad de usuarios de GIS',
});
osm.addTo(mapa);
// Si el servidor de OpenStreetMap no entrega teselas (p. ej., abierto como archivo local), usa CARTO (mismos datos de OSM).
let fallos = 0;
osm.on('tileerror', () => {
  if (++fallos === 6 && mapa.hasLayer(osm)) {
    mapa.removeLayer(osm); carto.addTo(mapa);
    estado('Las teselas de openstreetmap.org no cargaron; se usa OpenStreetMap (CARTO).');
  }
});
const contorno = L.layerGroup(TIERRA.map((pol) => L.polygon(pol.map((a) => a.map(([lon, lat]) => [lat, lon])), { color: '#0e7490', weight: 1, fill: false, interactive: false })));
contorno.addTo(mapa);
L.control.layers(
  { 'OpenStreetMap': osm, 'OpenStreetMap (CARTO)': carto, 'Satélite (Esri)': satelite },
  { 'Contorno de tierra (OSM)': contorno },
).addTo(mapa);

const estadoEl = document.getElementById('estado');
function estado(texto) { estadoEl.textContent = texto; }

const items = DESTINOS.map((d) => {
  const g = guardado[d.nombre];
  const item = { ...d, original: [d.lat, d.lon], revisado: Boolean(g), movido: Boolean(g && g.movido) };
  if (g && g.movido) { item.lat = g.lat; item.lon = g.lon; }
  return item;
});

function color(item) { return item.verificada || item.revisado ? COLORES.verificada : COLORES[item.confianza]; }
function icono(item) {
  const agua = !enTierra(item.lat, item.lon);
  return L.divIcon({
    className: '',
    iconSize: [18, 18], iconAnchor: [9, 9],
    html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:' + color(item) + ';border:' + (agua ? '3px solid #dc2626' : '2px solid #fff') + ';box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>',
  });
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function popup(item, i) {
  const agua = !enTierra(item.lat, item.lon);
  const osmLink = item.osm ? '<p><a href="https://www.openstreetmap.org/' + esc(item.osm) + '" target="_blank" rel="noopener">Ver en OpenStreetMap (' + esc(item.osm) + ')</a></p>' : '';
  return '<div class="popup"><h3>' + esc(item.nombre) + '</h3>'
    + '<p>' + esc(CATEGORIAS[item.categoria] || item.categoria) + ' · fuente <strong>' + esc(item.fuente) + '</strong> · confianza <strong>' + esc(item.confianza) + '</strong>' + (item.verificada ? ' · verificada' : '') + '</p>'
    + '<p>' + esc(item.metodo) + '</p>'
    + (item.nota ? '<p><em>' + esc(item.nota) + '</em></p>' : '')
    + osmLink
    + '<p><code>' + item.lat.toFixed(6) + ', ' + item.lon.toFixed(6) + '</code>' + (agua ? ' <strong style="color:#dc2626">· en el agua</strong>' : '') + '</p>'
    + '<div class="botones"><button onclick="revisar(' + i + ')">' + (item.revisado ? 'Revisado ✓' : 'Marcar como revisado') + '</button>'
    + '<button onclick="deshacer(' + i + ')">Deshacer</button></div></div>';
}

const marcadores = items.map((item, i) => {
  const m = L.marker([item.lat, item.lon], { draggable: true, icon: icono(item), title: item.nombre, autoPan: true });
  m.bindTooltip(item.nombre, { permanent: true, direction: 'right', offset: [10, 0], className: 'etiqueta' });
  m.bindPopup(() => popup(item, i));
  m.on('dragend', () => {
    const p = m.getLatLng();
    item.lat = +p.lat.toFixed(6); item.lon = +p.lng.toFixed(6);
    item.revisado = true; item.movido = true;
    guardado[item.nombre] = { lat: item.lat, lon: item.lon, movido: true };
    guardar(); refrescar(i);
    if (!enTierra(item.lat, item.lon)) estado('⚠ ' + item.nombre + ' quedó en el agua: el comando de corrección lo rechazará.');
  });
  m.addTo(mapa);
  return m;
});

window.revisar = (i) => {
  const item = items[i];
  item.revisado = true;
  guardado[item.nombre] = { lat: item.lat, lon: item.lon, movido: item.movido };
  guardar(); refrescar(i); marcadores[i].closePopup();
};
window.deshacer = (i) => {
  const item = items[i];
  [item.lat, item.lon] = item.original;
  item.revisado = false; item.movido = false;
  delete guardado[item.nombre];
  guardar(); marcadores[i].setLatLng(item.original); refrescar(i); marcadores[i].closePopup();
};

function refrescar(i) {
  marcadores[i].setIcon(icono(items[i]));
  pintarLista();
}

const lista = document.getElementById('lista');
const orden = { baja: 0, media: 1, alta: 2 };
function pintarLista() {
  const ordenados = items.map((item, i) => ({ item, i })).sort((a, b) =>
    (a.item.verificada - b.item.verificada) || (orden[a.item.confianza] - orden[b.item.confianza]) || a.item.nombre.localeCompare(b.item.nombre, 'es'));
  lista.innerHTML = ordenados.map(({ item, i }) => {
    const agua = !enTierra(item.lat, item.lon);
    const chips = (item.revisado ? '<span class="chip revisado">' + (item.movido ? 'movido' : 'revisado') + '</span>' : '')
      + (agua ? '<span class="chip agua">en el agua</span>' : '');
    return '<li data-i="' + i + '"><i class="punto" style="background:' + color(item) + '"></i>'
      + '<div><div class="nombre">' + esc(item.nombre) + '</div><div class="meta">' + esc(CATEGORIAS[item.categoria] || item.categoria) + ' · ' + esc(item.fuente) + ' · ' + esc(item.confianza) + '</div></div>'
      + '<div>' + chips + '</div></li>';
  }).join('');
  const n = items.filter((x) => x.revisado).length;
  document.getElementById('copiar').textContent = 'Copiar correcciones' + (n ? ' (' + n + ')' : '');
}
lista.addEventListener('click', (e) => {
  const li = e.target.closest('li'); if (!li) return;
  const i = +li.dataset.i;
  mapa.setView(marcadores[i].getLatLng(), 17);
  marcadores[i].openPopup();
});
pintarLista();

document.getElementById('nombres').addEventListener('change', (e) => {
  marcadores.forEach((m) => (e.target.checked ? m.openTooltip() : m.closeTooltip()));
});

function correcciones() {
  const todos = document.getElementById('todos').checked;
  const elegidos = items.filter((x) => todos || x.revisado);
  return {
    formato: 'misanandres-ubicaciones/1',
    generado: new Date().toISOString(),
    correcciones: elegidos.map((x) => ({ nombre: x.nombre, latitud: x.lat, longitud: x.lon })),
  };
}
function textoCorrecciones() {
  const c = correcciones();
  if (c.correcciones.length === 0) { estado('Mueve o marca como revisado al menos un destino (o marca "Incluir todos").'); return null; }
  return JSON.stringify(c, null, 2);
}
document.getElementById('copiar').addEventListener('click', async () => {
  const texto = textoCorrecciones(); if (!texto) return;
  const salida = document.getElementById('salida');
  salida.value = texto; salida.style.display = 'block';
  const n = JSON.parse(texto).correcciones.length;
  try {
    await navigator.clipboard.writeText(texto);
    estado('Copiado: ' + n + ' destino(s). Pégalo en un archivo .json.');
  } catch (e) {
    salida.select();
    const ok = document.execCommand && document.execCommand('copy');
    estado(ok ? 'Copiado: ' + n + ' destino(s).' : 'No se pudo copiar automáticamente: copia el texto de abajo.');
  }
});
document.getElementById('descargar').addEventListener('click', () => {
  const texto = textoCorrecciones(); if (!texto) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  a.download = 'correcciones.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

const grupo = L.featureGroup(marcadores.filter((m, i) => items[i].lat > 12.45));
if (grupo.getLayers().length) mapa.fitBounds(grupo.getBounds().pad(0.08));
</script>
</body>
</html>
`;
}
