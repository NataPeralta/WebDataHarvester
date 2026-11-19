'use strict';

/* ---------- Datos por defecto ---------- */

const KEY_ESTADO = 'programa-semanal:estado:v1';
const KEY_NOMBRES = 'programa-semanal:nombres:v1';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const fila = (texto, nombre1 = '', nombre2 = '', etiqueta = '', dos = false) => ({ texto, etiqueta, nombre1, nombre2, dos });

// Modelo en blanco: no trae ningún nombre. Los nombres para autocompletar se arman
// en cada dispositivo a partir de lo que se escribe ahí (ver "nombres" más abajo).
const MODELO = {
  semana: '',
  fecha: '',
  titulo: 'LECTURA SEMANAL DE LA BIBLIA',
  presidente: '',
  oracionInicio: '',
  introduccion: 'Palabras de introducción (1 min).',
  secciones: [
    {
      titulo: 'TESOROS DE LA BIBLIA', color: '#575a5d',
      filas: [
        fila('1. Avancemos al ritmo del carro celestial de Jehová (10 mins).'),
        fila('2. Busquemos perlas escondidas (10 mins).'),
        fila('3. Lectura de la Biblia (4 mins).', '', '', 'Estudiante:'),
      ],
    },
    {
      titulo: 'SEAMOS MEJORES MAESTROS', color: '#c18f00',
      filas: [
        fila('4. Empecemos conversaciones (3 mins).', '', '', '', true),
        fila('5. Hagamos discípulos (5 mins).', '', '', '', true),
        fila('7. Discurso (4 mins).'),
      ],
    },
    {
      titulo: 'NUESTRA VIDA CRISTIANA', color: '#7d0022',
      filas: [
        fila('8. Visita del superintendente'),
      ],
    },
  ],
};

// Bloques opcionales que van debajo de un divisor horizontal, dentro de la misma imagen.
const EXTRAS = [
  { clave: 'finde', etiqueta: 'Reunión del fin de semana' },
  { clave: 'asignaciones', etiqueta: 'Asignaciones' },
];
const extrasModelo = () => ({
  finde: {
    activo: true, titulo: 'REUNIÓN DEL FIN DE SEMANA', color: '#1f6f78',
    filas: [fila('Discursante'), fila('Conductor de La Atalaya'), fila('Lector')],
  },
  asignaciones: {
    activo: true, titulo: 'ASIGNACIONES', color: '#4b6a3f',
    filas: [fila('Microfonista', '', '', '', true), fila('Sonido'), fila('Zoom'), fila('Acomodadores', '', '', '', true), fila('Puerta')],
  },
});
MODELO.extras = extrasModelo();

// Completa los datos guardados con versiones anteriores que no tenían los bloques opcionales.
function normalizar(s) {
  const base = extrasModelo();
  s.extras = s.extras || {};
  for (const { clave } of EXTRAS) s.extras[clave] = { ...base[clave], ...(s.extras[clave] || {}) };
  return s;
}

/* ---------- Utilidades ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const clonar = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function leer(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function escribir(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* sin almacenamiento */ }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = val;
}

function fechaDesdeISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
function aISO(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
function textoSemana(iso) {
  if (!iso) return '';
  const ini = fechaDesdeISO(iso);
  const fin = new Date(ini); fin.setDate(fin.getDate() + 6);
  if (ini.getMonth() === fin.getMonth()) {
    return `${ini.getDate()}-${fin.getDate()} de ${MESES[ini.getMonth()]}`;
  }
  return `${ini.getDate()} de ${MESES[ini.getMonth()]} - ${fin.getDate()} de ${MESES[fin.getMonth()]}`;
}

/* ---------- Estado ---------- */

// El modelo arranca en la semana actual (lunes).
{
  const hoy = new Date();
  hoy.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  MODELO.semana = aISO(hoy);
  MODELO.fecha = textoSemana(MODELO.semana);
}

let estado = normalizar(leer(KEY_ESTADO, null) || clonar(MODELO));

// Lista de nombres de ESTE dispositivo: vive en el navegador y nunca viaja con la página.
let nombres = new Set(leer(KEY_NOMBRES, []));

function recolectarNombres(s) {
  [s.presidente, s.oracionInicio,
    ...[...(s.secciones || []), ...Object.values(s.extras || {})]
      .flatMap((x) => (x.filas || []).flatMap((f) => [f.nombre1, f.nombre2]))]
    .forEach((n) => { n = String(n || '').trim(); if (n) nombres.add(n); });
}
recolectarNombres(estado);

function guardarEstado() { escribir(KEY_ESTADO, estado); }

function guardarNombres() {
  const lista = [...nombres].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
  nombres = new Set(lista);
  escribir(KEY_NOMBRES, lista);
  $('#nombres').innerHTML = lista.map((n) => `<option value="${esc(n)}">`).join('');
  if (document.activeElement !== $('#lista-nombres')) $('#lista-nombres').value = lista.join('\n');
}

/* ---------- Formulario ---------- */

/** Filas editables de un bloque. `base` es la ruta del bloque dentro de `estado` (p. ej. "secciones.0" o "extras.finde"). */
function htmlFilas(sec, base, textos) {
  return sec.filas.map((f, fi) => {
    const p = `${base}.filas.${fi}`;
    return `
      <div class="fila">
        <div class="fila-grid">
          <label class="wide">${textos.parte}
            <input type="text" data-path="${p}.texto" value="${esc(f.texto)}">
          </label>
          <label>Etiqueta (opcional)
            <input type="text" data-path="${p}.etiqueta" value="${esc(f.etiqueta)}" placeholder="Ej.: Estudiante:">
          </label>
          <label>Nombre
            <input type="text" class="nombre" list="nombres" data-path="${p}.nombre1" value="${esc(f.nombre1)}" placeholder="Nombre y apellido">
          </label>
          <label>${textos.segundo}
            <input type="text" class="nombre" list="nombres" data-path="${p}.nombre2" value="${esc(f.nombre2)}" placeholder="Nombre y apellido">
          </label>
        </div>
        <div class="fila-tools">
          <button type="button" class="btn small" data-action="subir-fila" data-base="${base}" data-f="${fi}" title="Subir" aria-label="Subir">↑</button>
          <button type="button" class="btn small" data-action="bajar-fila" data-base="${base}" data-f="${fi}" title="Bajar" aria-label="Bajar">↓</button>
          <button type="button" class="btn small danger" data-action="quitar-fila" data-base="${base}" data-f="${fi}">Quitar</button>
        </div>
      </div>`;
  }).join('');
}

function htmlSeccion(sec, si) {
  const base = `secciones.${si}`;
  return `
    <fieldset class="card" style="--section-color:${esc(sec.color)}">
      <div class="section-head">
        <label>Sección
          <input type="text" data-path="${base}.titulo" value="${esc(sec.titulo)}">
        </label>
        <label class="color-label">Color
          <input type="color" data-path="${base}.color" value="${esc(sec.color)}">
        </label>
        <button type="button" class="btn small" data-action="subir-seccion" data-s="${si}" aria-label="Subir sección">↑</button>
        <button type="button" class="btn small" data-action="bajar-seccion" data-s="${si}" aria-label="Bajar sección">↓</button>
        <button type="button" class="btn small danger" data-action="quitar-seccion" data-s="${si}">Quitar</button>
      </div>
      ${htmlFilas(sec, base, { parte: 'Parte', segundo: 'Ayudante (opcional)' })}
      <button type="button" class="btn ghost small" data-action="agregar-fila" data-base="${base}">+ Agregar parte</button>
    </fieldset>`;
}

function htmlExtra({ clave, etiqueta }) {
  const sec = estado.extras[clave];
  const base = `extras.${clave}`;
  return `
    <fieldset class="card" style="--section-color:${esc(sec.color)}">
      <div class="section-head">
        <label class="check">
          <input type="checkbox" data-path="${base}.activo"${sec.activo ? ' checked' : ''}>
          Incluir “${esc(etiqueta)}” en la imagen
        </label>
      </div>
      <div class="section-head">
        <label>Título de la barra
          <input type="text" data-path="${base}.titulo" value="${esc(sec.titulo)}">
        </label>
        <label class="color-label">Color
          <input type="color" data-path="${base}.color" value="${esc(sec.color)}">
        </label>
      </div>
      ${htmlFilas(sec, base, { parte: 'Asignación', segundo: 'Segundo nombre (opcional)' })}
      <button type="button" class="btn ghost small" data-action="agregar-fila" data-base="${base}">+ Agregar</button>
    </fieldset>`;
}

function renderFormulario() {
  $('#secciones').innerHTML = estado.secciones.map(htmlSeccion).join('');
  $('#extras').innerHTML = EXTRAS.map(htmlExtra).join('');
  document.querySelectorAll('#planilla [data-path]').forEach((el) => {
    const v = getPath(estado, el.dataset.path);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.value !== (v ?? '')) el.value = v ?? '';
  });
}

function cambio() {
  guardarEstado();
  programarDibujo();
}

function mover(arr, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

const acciones = {
  'agregar-seccion'() {
    estado.secciones.push({ titulo: 'NUEVA SECCIÓN', color: '#575a5d', filas: [fila('')] });
  },
  'quitar-seccion'(d) {
    if (confirm('¿Quitar esta sección completa?')) estado.secciones.splice(d.s, 1);
  },
  'subir-seccion'(d) { mover(estado.secciones, +d.s, -1); },
  'bajar-seccion'(d) { mover(estado.secciones, +d.s, 1); },
  'agregar-fila'(d) { getPath(estado, d.base).filas.push(fila('')); },
  'quitar-fila'(d) { getPath(estado, d.base).filas.splice(d.f, 1); },
  'subir-fila'(d) { mover(getPath(estado, d.base).filas, +d.f, -1); },
  'bajar-fila'(d) { mover(getPath(estado, d.base).filas, +d.f, 1); },

  'nueva-semana'() {
    if (!confirm('Se pasa a la semana siguiente y se vacían los nombres. ¿Seguir?')) return false;
    const base = estado.semana ? fechaDesdeISO(estado.semana) : new Date();
    base.setDate(base.getDate() + 7);
    estado.semana = aISO(base);
    estado.fecha = textoSemana(estado.semana);
    estado.presidente = estado.oracionInicio = '';
    [...estado.secciones, ...Object.values(estado.extras)]
      .forEach((x) => x.filas.forEach((f) => { f.nombre1 = ''; f.nombre2 = ''; }));
    toast('Nueva semana lista para completar');
  },
  async descargar() {
    const blob = await generarBlob();
    descargarBlob(blob, nombreArchivo());
    return false;
  },
  async compartir() {
    const blob = await generarBlob();
    const archivo = new File([blob], nombreArchivo(), { type: 'image/png' });
    try {
      await navigator.share({ files: [archivo], title: `Programa ${estado.fecha}` });
    } catch (e) {
      if (e.name !== 'AbortError') descargarBlob(blob, archivo.name);
    }
    return false;
  },
};

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const r = await acciones[btn.dataset.action]?.(btn.dataset);
  if (r === false) return;
  renderFormulario();
  cambio();
});

$('#planilla').addEventListener('input', (e) => {
  const el = e.target;
  if (el.id === 'lista-nombres') {
    nombres = new Set(el.value.split('\n').map((s) => s.trim()).filter(Boolean));
    guardarNombres();
    return;
  }
  const path = el.dataset.path;
  if (!path) return;
  setPath(estado, path, el.type === 'checkbox' ? el.checked : el.value);
  if (path === 'semana') {
    estado.fecha = textoSemana(el.value);
    $('[data-path="fecha"]').value = estado.fecha;
  }
  if (path.endsWith('.color')) el.closest('fieldset').style.setProperty('--section-color', el.value);
  cambio();
});

$('#planilla').addEventListener('change', (e) => {
  const el = e.target;
  if (el.classList.contains('nombre') && el.value.trim() && !nombres.has(el.value.trim())) {
    nombres.add(el.value.trim());
    guardarNombres();
  }
});

/* ---------- Imagen ---------- */

const W = 1240;
const LINEA_SUP = 150;
const LINEA_INF_BASE = 1010;
const MARGEN_INF = 278;
const X_TEXTO = 125;
const ANCHO_TEXTO = 480;
const ALTO_LINEA = 30;
const ALTO_BARRA = 28;
const ROW_GAP = 22; // espacio entre las partes de una sección
const BARRA_GAP = 28; // espacio entre la barra y su primera parte
const EXT_ANTES_BARRA = 36;
const EXT_TRAS_BARRA = 24;
const EXT_ENTRE_FILAS = 16;
const EXT_CIERRE = 40;
const X_ETIQ = 785;
const X_NOMBRE = 805;
const X_NOMBRE_A = 680;
const X_NOMBRE_B = 870;

// En la vista previa, los lugares vacíos muestran un nombre genérico en gris.
// Al descargar la imagen no se dibuja: un lugar vacío queda vacío.
const NOMBRE_GENERICO = 'Nombre y apellido';
let modoVista = true;

const F = {
  fecha: '500 23px Montserrat',
  titulo: '700 21px Montserrat',
  etiqueta: '500 15px Montserrat',
  barra: '700 19px Montserrat',
  texto: '400 22px Roboto',
  nombre: (px) => `400 ${px}px Roboto`,
};

const fuentesListas = Promise.all([
  '500 23px Montserrat', '700 21px Montserrat', '500 15px Montserrat', '400 22px Roboto',
].map((f) => document.fonts.load(f))).catch(() => {});

function partirLineas(ctx, texto, anchoPrimera, anchoResto = anchoPrimera) {
  const palabras = String(texto || '').split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    const max = lineas.length === 0 ? anchoPrimera : anchoResto;
    if (actual && ctx.measureText(prueba).width > max) {
      lineas.push(actual);
      actual = p;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [''];
}

function letterSpacing(ctx, v) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = v;
}

function textoAjustado(ctx, texto, x, y, anchoMax, px = 22) {
  let size = px;
  ctx.font = F.nombre(size);
  while (size > 13 && ctx.measureText(texto).width > anchoMax) {
    size -= 1;
    ctx.font = F.nombre(size);
  }
  ctx.fillText(texto, x, y);
}

/** Calcula posiciones y dibuja. Devuelve el alto usado. */
function componer(ctx, s, dibujar) {
  ctx.textBaseline = 'middle';

  // Encabezado
  const yHead = LINEA_SUP + 47;
  ctx.font = F.fecha;
  const fechaTxt = s.fecha ? `${s.fecha} |` : '';
  const anchoFecha = fechaTxt ? ctx.measureText(fechaTxt).width + 22 : 0;
  ctx.font = F.titulo;
  letterSpacing(ctx, '1.5px');
  const xTitulo = 92 + anchoFecha;
  const lineasTitulo = partirLineas(ctx, s.titulo, 630 - xTitulo, 630 - 145);
  letterSpacing(ctx, '0px');
  const yOracionIni = yHead + 64;
  const yIntro = Math.max(yOracionIni + 30, yHead + (lineasTitulo.length - 1) * 28 + 50);
  const altoEncabezado = yIntro + 15 - LINEA_SUP;

  // Medir filas
  ctx.font = F.texto;
  const secciones = s.secciones.map((sec) => ({
    ...sec,
    filas: sec.filas.map((f) => {
      const lineas = partirLineas(ctx, f.texto, ANCHO_TEXTO);
      return { ...f, lineas, alto: Math.max(lineas.length, 1) * ALTO_LINEA };
    }),
  }));

  // Alturas fijas y pesos de los espacios flexibles
  let fijo = altoEncabezado;
  let pesos = 1.0; // espacio antes de la línea que cierra el programa
  for (const sec of secciones) {
    fijo += ALTO_BARRA + BARRA_GAP;
    pesos += 1.0;
    sec.filas.forEach((f, i) => { fijo += f.alto + (i > 0 ? ROW_GAP : 0); });
  }
  const disponible = LINEA_INF_BASE - LINEA_SUP;
  const G = Math.min(72, Math.max(22, (disponible - fijo) / pesos));
  const lineaInf = Math.max(LINEA_INF_BASE, Math.ceil(LINEA_SUP + fijo + pesos * G));

  // Bloques opcionales (fin de semana, asignaciones): van debajo de un divisor, con espaciado fijo.
  const extras = EXTRAS.map(({ clave }) => s.extras?.[clave]).filter((e) => e && e.activo && e.filas.length)
    .map((e) => ({
      ...e,
      filas: e.filas.map((f) => {
        const lineas = partirLineas(ctx, f.texto, ANCHO_TEXTO);
        return { ...f, lineas, alto: Math.max(lineas.length, 1) * ALTO_LINEA };
      }),
    }));
  let altoExtras = 0;
  for (const e of extras) {
    altoExtras += EXT_ANTES_BARRA + ALTO_BARRA + EXT_TRAS_BARRA;
    e.filas.forEach((f, i) => { altoExtras += f.alto + (i > 0 ? EXT_ENTRE_FILAS : 0); });
  }
  const lineaFin = extras.length ? lineaInf + 6 + altoExtras + EXT_CIERRE : lineaInf;
  const alto = lineaFin + MARGEN_INF;
  if (!dibujar) return alto;

  // Fondo y líneas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, alto);
  ctx.fillStyle = '#000000';
  ctx.fillRect(62, LINEA_SUP, 990, 6);
  ctx.fillRect(62, lineaInf, 990, 6); // cierra el programa de entre semana (o es el divisor si hay bloques debajo)
  if (extras.length) ctx.fillRect(62, lineaFin, 990, 6);

  // Encabezado izquierda
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'left';
  if (fechaTxt) { ctx.font = F.fecha; ctx.fillText(fechaTxt, 92, yHead + 1); }
  ctx.font = F.titulo;
  letterSpacing(ctx, '1.5px');
  lineasTitulo.forEach((l, i) => ctx.fillText(l, i === 0 ? xTitulo : 145, yHead + i * 28));
  letterSpacing(ctx, '0px');

  // Encabezado derecha
  etiquetaNombre(ctx, 'Presidente:', s.presidente, yHead);
  etiquetaNombre(ctx, 'Oración:', s.oracionInicio, yOracionIni);

  // Introducción
  vineta(ctx, '#575a5d', s.introduccion, yIntro);

  // Secciones
  let y = yIntro + 15;
  for (const sec of secciones) {
    y += G;
    dibujarBarra(ctx, sec, y);
    y += ALTO_BARRA + BARRA_GAP;

    sec.filas.forEach((f, i) => {
      if (i > 0) y += ROW_GAP;
      dibujarFila(ctx, f, y);
      y += f.alto;
    });
  }

  // Bloques opcionales debajo del divisor
  y = lineaInf + 6;
  for (const e of extras) {
    y += EXT_ANTES_BARRA;
    dibujarBarra(ctx, e, y);
    y += ALTO_BARRA + EXT_TRAS_BARRA;
    e.filas.forEach((f, i) => {
      if (i > 0) y += EXT_ENTRE_FILAS;
      dibujarFila(ctx, f, y);
      y += f.alto;
    });
  }
  return alto;
}

function dibujarBarra(ctx, sec, y) {
  ctx.fillStyle = sec.color || '#575a5d';
  ctx.fillRect(X_TEXTO, y, 510, ALTO_BARRA);
  ctx.fillStyle = '#ffffff';
  ctx.font = F.barra;
  ctx.textAlign = 'left';
  letterSpacing(ctx, '-0.3px');
  ctx.fillText(sec.titulo || '', X_TEXTO + 11, y + ALTO_BARRA / 2 + 1);
  letterSpacing(ctx, '0px');
}

function dibujarFila(ctx, f, y) {
  const yPrimera = y + ALTO_LINEA / 2;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = F.texto;
  ctx.textAlign = 'left';
  f.lineas.forEach((l, li) => ctx.fillText(l, X_TEXTO, yPrimera + li * ALTO_LINEA));
  if (f.nombre2 || (modoVista && f.dos)) {
    if (f.etiqueta) etiqueta(ctx, f.etiqueta, X_NOMBRE_A - 14, yPrimera);
    textoAjustado(ctx, nombreVisible(ctx, f.nombre1), X_NOMBRE_A, yPrimera, X_NOMBRE_B - X_NOMBRE_A - 16);
    textoAjustado(ctx, nombreVisible(ctx, f.nombre2), X_NOMBRE_B, yPrimera, W - X_NOMBRE_B - 30);
  } else {
    etiquetaNombre(ctx, f.etiqueta, f.nombre1, yPrimera);
  }
}

function etiqueta(ctx, texto, xDer, y) {
  ctx.font = F.etiqueta;
  ctx.fillStyle = '#3a3a3a';
  ctx.textAlign = 'right';
  ctx.fillText(texto, xDer, y + 1);
  ctx.textAlign = 'left';
}

function nombreVisible(ctx, nombre) {
  if (nombre) { ctx.fillStyle = '#1a1a1a'; return nombre; }
  if (modoVista) { ctx.fillStyle = '#b9b9b9'; return NOMBRE_GENERICO; }
  return '';
}

function etiquetaNombre(ctx, etiq, nombre, y) {
  if (etiq) etiqueta(ctx, etiq, X_ETIQ, y);
  ctx.textAlign = 'left';
  const txt = nombreVisible(ctx, nombre);
  textoAjustado(ctx, txt, X_NOMBRE, y, W - X_NOMBRE - 30);
}

function vineta(ctx, color, texto, y) {
  if (!texto) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(167, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = F.texto;
  ctx.textAlign = 'left';
  ctx.fillText(texto, 179, y);
}

async function dibujar() {
  await fuentesListas;
  const canvas = $('#lienzo');
  const ctx = canvas.getContext('2d');
  const alto = componer(ctx, estado, false);
  if (canvas.height !== alto) canvas.height = alto;
  componer(ctx, estado, true);
}

let pendiente = false;
function programarDibujo() {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => { pendiente = false; dibujar(); });
}

async function generarBlob() {
  modoVista = false; // la imagen descargada no lleva nombres genéricos
  try {
    await dibujar();
    return await new Promise((res) => $('#lienzo').toBlob(res, 'image/png'));
  } finally {
    modoVista = true;
    programarDibujo();
  }
}

function nombreArchivo() {
  const base = (estado.fecha || 'programa').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `programa-${base || 'semanal'}.png`;
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Inicio ---------- */

try {
  const prueba = new File([''], 'x.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [prueba] })) $('#btn-compartir').hidden = false;
} catch { /* sin soporte */ }

guardarNombres();
renderFormulario();
dibujar();
document.fonts.addEventListener?.('loadingdone', programarDibujo);
