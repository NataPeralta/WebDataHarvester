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
  version: 3,
  semana: '',
  fecha: '',
  titulo: 'LECTURA SEMANAL DE LA BIBLIA',
  presidente: '',
  oracionInicio: '',
  oracionFinal: '',
  secciones: [
    {
      titulo: 'TESOROS DE LA BIBLIA', color: '#575a5d',
      filas: [
        fila('Avancemos al ritmo del carro celestial de Jehová (10 mins).'),
        fila('Busquemos perlas escondidas (10 mins).'),
        fila('Lectura de la Biblia (4 mins).', '', '', 'Estudiante:'),
      ],
    },
    {
      titulo: 'SEAMOS MEJORES MAESTROS', color: '#c18f00',
      filas: [
        fila('Empecemos conversaciones (3 mins).', '', '', '', true),
        fila('Hagamos discípulos (5 mins).', '', '', '', true),
        fila('Discurso (4 mins).'),
      ],
    },
    {
      titulo: 'NUESTRA VIDA CRISTIANA', color: '#7d0022',
      filas: [
        fila('Visita del superintendente'),
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
    activo: true, titulo: 'REUNIÓN DE FIN DE SEMANA', color: '#1f6f78',
    oracionInicio: '', oracionFinal: '',
    filas: [fila('Discursante'), fila('Conductor de La Atalaya / Lector', '', '', '', true)],
  },
  asignaciones: {
    activo: true, titulo: 'ASIGNACIONES', color: '#4b6a3f',
    filas: [fila('Microfonista', '', '', '', true), fila('Sonido'), fila('Zoom'), fila('Acomodadores', '', '', '', true), fila('Puerta')],
  },
});
MODELO.extras = extrasModelo();

// Completa y actualiza datos guardados con versiones anteriores de la planilla.
function normalizar(s) {
  const base = extrasModelo();
  s.extras = s.extras || {};
  for (const { clave } of EXTRAS) s.extras[clave] = { ...base[clave], ...(s.extras[clave] || {}) };
  const v = s.version || (s.sinNumeros ? 2 : 1);
  if (v < 2) {
    // Quita la numeración ("1.", "2." …) del comienzo de las partes.
    (s.secciones || []).forEach((sec) => (sec.filas || []).forEach((f) => {
      f.texto = String(f.texto || '').replace(/^\s*\d+\s*[.)]\s*/, '');
    }));
  }
  if (v < 3) {
    // Conductor de La Atalaya y Lector pasan a una sola fila; cambia el título del fin de semana.
    const fd = s.extras.finde;
    const ic = fd.filas.findIndex((f) => /^conductor de la atalaya$/i.test(String(f.texto).trim()));
    const il = fd.filas.findIndex((f) => /^lector$/i.test(String(f.texto).trim()));
    if (ic >= 0 && il >= 0) {
      fd.filas[ic] = fila('Conductor de La Atalaya / Lector', fd.filas[ic].nombre1, fd.filas[il].nombre1, '', true);
      fd.filas.splice(il, 1);
    }
    if (fd.titulo === 'REUNIÓN DEL FIN DE SEMANA') fd.titulo = 'REUNIÓN DE FIN DE SEMANA';
  }
  s.version = 3;
  delete s.sinNumeros;
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
  [s.presidente, s.oracionInicio, s.oracionFinal,
    ...Object.values(s.extras || {}).flatMap((e) => [e.oracionInicio, e.oracionFinal]),
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
  const nombreInput = (campo, titulo) => `
        <label>${titulo}
          <input type="text" class="nombre" list="nombres" data-path="${base}.${campo}" value="${esc(sec[campo])}" placeholder="Nombre y apellido">
        </label>`;
  const cabecera = clave === 'finde' ? `
      <div class="section-head">
        <label>Título
          <input type="text" data-path="${base}.titulo" value="${esc(sec.titulo)}">
        </label>
      </div>
      <div class="grid-2">${nombreInput('oracionInicio', 'Oración inicial')}${nombreInput('oracionFinal', 'Oración final')}
      </div>` : `
      <div class="section-head">
        <label>Título de la barra
          <input type="text" data-path="${base}.titulo" value="${esc(sec.titulo)}">
        </label>
        <label class="color-label">Color
          <input type="color" data-path="${base}.color" value="${esc(sec.color)}">
        </label>
      </div>`;
  return `
    <fieldset class="card" style="--section-color:${esc(sec.color)}">
      <div class="section-head">
        <label class="check">
          <input type="checkbox" data-path="${base}.activo"${sec.activo ? ' checked' : ''}>
          Incluir “${esc(etiqueta)}” en la imagen
        </label>
      </div>${cabecera}
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
    estado.presidente = estado.oracionInicio = estado.oracionFinal = '';
    estado.extras.finde.oracionInicio = estado.extras.finde.oracionFinal = '';
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
const LINEA_INF_BASE = 1065;
const MARGEN_INF = 278;
// Grilla de la imagen: las líneas van de 62 a 1178 y todo lo demás respeta un margen interno de 30 px.
const LINEA_X = 62;
const LINEA_ANCHO = 1116;
const X_IZQ = 92; // margen interno izquierdo: fecha y barras
const X_DER = 1148; // margen interno derecho: fin de los nombres
const CENTRO = 620;
const ANCHO_BARRA = 580;
const X_TEXTO = 103; // las partes arrancan alineadas con el título de la barra
const ANCHO_TEXTO = 470;
const ALTO_LINEA = 30;
const ALTO_BARRA = 28;
const ROW_GAP = 22; // espacio entre las partes de una sección
const BARRA_GAP = 28; // espacio entre la barra y su primera parte
const EXT_ANTES_BARRA = 36;
const EXT_TRAS_BARRA = 24;
const EXT_ENTRE_FILAS = 16;
const EXT_CIERRE = 40;
const X_NOMBRE_A = 700; // primera columna de nombres (también la de los nombres solos)
const X_NOMBRE_B = 930; // segunda columna (ayudante)

// En la vista previa, los lugares vacíos muestran un nombre genérico en gris.
// Al descargar la imagen no se dibuja: un lugar vacío queda vacío.
const NOMBRE_GENERICO = 'Nombre y apellido';
let modoVista = true;

const F = {
  fecha: '600 27px Montserrat',
  titulo: '700 21px Montserrat',
  etiqueta: '500 15px Montserrat',
  barra: '700 19px Montserrat',
  texto: '400 22px Roboto',
  nombre: (px) => `400 ${px}px Roboto`,
};

const fuentesListas = Promise.all([
  '600 27px Montserrat', '700 21px Montserrat', '500 15px Montserrat', '400 22px Roboto',
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
  // Título centrado y, debajo, presidente y oración en una fila alineada a la izquierda.
  const yHead = LINEA_SUP + 47;
  ctx.font = F.titulo;
  letterSpacing(ctx, '1.5px');
  const lineasTitulo = partirLineas(ctx, s.titulo, LINEA_ANCHO - 100);
  letterSpacing(ctx, '0px');
  const yPersonas = yHead + (lineasTitulo.length - 1) * 28 + 52;
  const yFinEnc = yPersonas + 30;
  const altoEncabezado = yFinEnc - LINEA_SUP;

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
  let fijo = altoEncabezado + ALTO_LINEA; // + la fila de la oración final
  let pesos = 2.0; // espacio antes de la oración final y antes de la línea que cierra el programa
  for (const sec of secciones) {
    fijo += ALTO_BARRA + BARRA_GAP;
    pesos += 1.0;
    sec.filas.forEach((f, i) => { fijo += f.alto + (i > 0 ? ROW_GAP : 0); });
  }
  const disponible = LINEA_INF_BASE - LINEA_SUP;
  const G = Math.min(72, Math.max(22, (disponible - fijo) / pesos));
  const lineaInf = Math.max(LINEA_INF_BASE, Math.ceil(LINEA_SUP + fijo + pesos * G));

  // Bloques opcionales (fin de semana, asignaciones): cada uno va debajo de una línea y se cierra con otra.
  const extras = EXTRAS.map(({ clave }) => ({ clave, ...(s.extras?.[clave] || {}) }))
    .filter((e) => e.activo && e.filas && e.filas.length)
    .map((e) => ({
      ...e,
      filas: e.filas.map((f) => {
        const lineas = partirLineas(ctx, f.texto, ANCHO_TEXTO);
        return { ...f, lineas, alto: Math.max(lineas.length, 1) * ALTO_LINEA };
      }),
    }));
  let yExt = lineaInf + 6;
  const bloques = extras.map((e) => {
    const h = bloqueExtra(ctx, e, 0, false);
    const b = { e, y: yExt, h };
    yExt += h + 6;
    return b;
  });
  const ultimo = bloques[bloques.length - 1];
  const lineaFin = ultimo ? ultimo.y + ultimo.h : lineaInf;
  const alto = lineaFin + MARGEN_INF;
  if (!dibujar) return alto;

  // Fondo y líneas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, alto);
  ctx.fillStyle = '#000000';
  ctx.fillRect(LINEA_X, LINEA_SUP, LINEA_ANCHO, 6);
  ctx.fillRect(LINEA_X, lineaInf, LINEA_ANCHO, 6); // cierra el programa de entre semana (o es el divisor si hay bloques debajo)
  bloques.forEach((b) => ctx.fillRect(LINEA_X, b.y + b.h, LINEA_ANCHO, 6)); // cada bloque se cierra con una línea

  // La fecha va arriba del primer divisor, a la izquierda.
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'left';
  if (s.fecha) { ctx.font = F.fecha; ctx.fillText(s.fecha, X_IZQ, LINEA_SUP - 42); }

  // Título centrado
  ctx.font = F.titulo;
  ctx.textAlign = 'center';
  letterSpacing(ctx, '1.5px');
  lineasTitulo.forEach((l, i) => ctx.fillText(l, CENTRO, yHead + i * 28));
  letterSpacing(ctx, '0px');
  ctx.textAlign = 'left';

  // Presidente y oración, a la izquierda
  dibujarPersonas(ctx, [['Presidente:', s.presidente], ['Oración:', s.oracionInicio]], yPersonas, X_IZQ);

  // Secciones
  let y = yFinEnc;
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

  // Oración final del programa de entre semana
  y += G;
  dibujarPersonas(ctx, [['Oración:', s.oracionFinal]], y + ALTO_LINEA / 2, X_IZQ);

  // Bloques opcionales
  bloques.forEach((b) => bloqueExtra(ctx, b.e, b.y, true));
  return alto;
}

/** Dibuja (o solo mide) un bloque opcional que arranca en y0. Devuelve su alto, hasta donde va la línea que lo cierra. */
function bloqueExtra(ctx, e, y0, dibujar) {
  const esFinde = e.clave === 'finde';
  let y = y0 + EXT_ANTES_BARRA;
  if (esFinde) {
    // Título centrado (como el del programa de entre semana) y la oración inicial debajo.
    if (dibujar) {
      ctx.fillStyle = '#1a1a1a';
      ctx.font = F.titulo;
      ctx.textAlign = 'center';
      letterSpacing(ctx, '1.5px');
      ctx.fillText(e.titulo || '', CENTRO, y + 14);
      letterSpacing(ctx, '0px');
      ctx.textAlign = 'left';
    }
    y += 28 + EXT_TRAS_BARRA;
    if (dibujar) dibujarPersonas(ctx, [['Oración:', e.oracionInicio]], y + ALTO_LINEA / 2, X_IZQ);
    y += ALTO_LINEA + EXT_TRAS_BARRA;
  } else {
    if (dibujar) dibujarBarra(ctx, e, y);
    y += ALTO_BARRA + EXT_TRAS_BARRA;
  }
  e.filas.forEach((f, i) => {
    if (i > 0) y += EXT_ENTRE_FILAS;
    if (dibujar) dibujarFila(ctx, f, y);
    y += f.alto;
  });
  if (esFinde) {
    y += EXT_TRAS_BARRA;
    if (dibujar) dibujarPersonas(ctx, [['Oración:', e.oracionFinal]], y + ALTO_LINEA / 2, X_IZQ);
    y += ALTO_LINEA;
  }
  return y + EXT_CIERRE - y0;
}

function dibujarBarra(ctx, sec, y) {
  ctx.fillStyle = sec.color || '#575a5d';
  ctx.fillRect(X_IZQ, y, ANCHO_BARRA, ALTO_BARRA);
  ctx.fillStyle = '#ffffff';
  ctx.font = F.barra;
  ctx.textAlign = 'left';
  letterSpacing(ctx, '-0.3px');
  ctx.fillText(sec.titulo || '', X_TEXTO, y + ALTO_BARRA / 2 + 1);
  letterSpacing(ctx, '0px');
}

function dibujarFila(ctx, f, y) {
  const yPrimera = y + ALTO_LINEA / 2;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = F.texto;
  ctx.textAlign = 'left';
  f.lineas.forEach((l, li) => ctx.fillText(l, X_TEXTO, yPrimera + li * ALTO_LINEA));
  if (f.etiqueta) etiqueta(ctx, f.etiqueta, X_NOMBRE_A - 14, yPrimera);
  if (f.nombre2 || (modoVista && f.dos)) {
    textoAjustado(ctx, nombreVisible(ctx, f.nombre1), X_NOMBRE_A, yPrimera, X_NOMBRE_B - X_NOMBRE_A - 14);
    textoAjustado(ctx, nombreVisible(ctx, f.nombre2), X_NOMBRE_B, yPrimera, X_DER - X_NOMBRE_B);
  } else {
    textoAjustado(ctx, nombreVisible(ctx, f.nombre1), X_NOMBRE_A, yPrimera, X_DER - X_NOMBRE_A);
  }
}

/** Fila de pares "Etiqueta: nombre". Cada nombre tiene un ancho fijo para que el conjunto no se mueva. */
function dibujarPersonas(ctx, grupos, y, xInicio) {
  const ANCHO_NOMBRE = 200;
  const SEP = 14;
  const ENTRE = 90;
  ctx.font = F.etiqueta;
  const anchos = grupos.map(([etiq]) => ctx.measureText(etiq).width);
  const total = anchos.reduce((a, w) => a + w + SEP + ANCHO_NOMBRE, 0) + ENTRE * (grupos.length - 1);
  let x = xInicio ?? CENTRO - total / 2;
  grupos.forEach(([etiq, nombre], i) => {
    ctx.font = F.etiqueta;
    ctx.fillStyle = '#3a3a3a';
    ctx.textAlign = 'left';
    ctx.fillText(etiq, x, y + 1);
    textoAjustado(ctx, nombreVisible(ctx, nombre), x + anchos[i] + SEP, y, ANCHO_NOMBRE);
    x += anchos[i] + SEP + ANCHO_NOMBRE + ENTRE;
  });
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
