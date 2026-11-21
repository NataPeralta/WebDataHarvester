'use strict';

/* ---------- Datos por defecto ---------- */

const KEY_ESTADO = 'programa-semanal:estado:v1';
const KEY_NOMBRES = 'programa-semanal:nombres:v1';

const $ = (sel, root = document) => root.querySelector(sel);
const clonar = (o) => JSON.parse(JSON.stringify(o));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const asignacionSala = (etiqueta = '') => ({ etiqueta, nombre1: '', nombre2: '' });
const fila = (texto, nombre1 = '', nombre2 = '', etiqueta = '', dos = false, tiempo = '') => ({
  texto, etiqueta, nombre1, nombre2, dos, tiempo, salaAuxiliar: [],
});
const COLORES_GRUPO = ['#ffe600', '#00b0f0', '#92d050', '#ffc000'];
const grupo = (nombre, i = 0) => ({
  nombre: nombre || `Grupo de predicación N ${i + 1}`,
  color: COLORES_GRUPO[i % COLORES_GRUPO.length],
  conductor: '', ayudante: '', lugar: '', hora: '', integrantes: '', listado: '', inactivos: '',
});
const salida = () => ({ dia: '', hora: '', lugar: '', conductor: '', territorio: '', participantes: '', mes: '', destacada: false });

// Modelo en blanco: no trae ningún nombre. Los nombres para autocompletar se arman
// en cada dispositivo a partir de lo que se escribe ahí (ver "nombres" más abajo).
function seccionesEntreSemanaModelo() {
  return [
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
  ];
}

function seccionesFinde() {
  return [
    { titulo: 'DISCURSO PÚBLICO', color: '#1f4e79', filas: [fila('Discurso público', '', '', 'Discursante:', false, '30 min')] },
    {
      titulo: 'ESTUDIO DE LA ATALAYA', color: '#2e5a1c',
      filas: [fila('Estudio de La Atalaya', '', '', 'Conductor/Lector:', true, '60 min')],
    },
  ];
}

const CAMPOS_TEXTO_REUNION = [
  'presidente', 'oracionInicio', 'oracionFinal',
  'cancionInicio', 'introduccion', 'cancionIntermedia', 'conclusion', 'cancionFinal',
  'consejero', 'limpieza',
];

function copiarTextoReunion(desde, hacia) {
  for (const c of CAMPOS_TEXTO_REUNION) hacia[c] = desde?.[c] || '';
}

function reunionEnBlanco(titulo = 'Nueva reunión', secciones) {
  const r = {
    activo: true,
    titulo,
    secciones: Array.isArray(secciones) && secciones.length
      ? secciones
      : [{ titulo: 'NUEVA SECCIÓN', color: '#575a5d', filas: [fila('')] }],
  };
  copiarTextoReunion(null, r);
  return r;
}

function reunionesModelo() {
  return [
    reunionEnBlanco('Reunión de entre semana', seccionesEntreSemanaModelo()),
    reunionEnBlanco('REUNIÓN DE FIN DE SEMANA', seccionesFinde()),
    reunionEnBlanco('ASIGNACIONES', [{
      titulo: 'ASIGNACIONES', color: '#575a5d',
      filas: [
        fila('Microfonista', '', '', '', true), fila('Sonido'), fila('Zoom'),
        fila('Acomodadores', '', '', '', true), fila('Puerta'),
      ],
    }]),
  ];
}

function normalizarReunion(r) {
  if (!r || typeof r !== 'object') return null;
  const out = reunionEnBlanco(r.titulo || 'Nueva reunión', r.secciones);
  out.activo = r.activo !== false;
  copiarTextoReunion(r, out);
  out.secciones = (Array.isArray(r.secciones) && r.secciones.length ? r.secciones : out.secciones).map((sec) => ({
    titulo: sec.titulo || 'NUEVA SECCIÓN',
    color: sec.color || '#575a5d',
    filas: Array.isArray(sec.filas) && sec.filas.length ? sec.filas : [fila('')],
  }));
  return out;
}

/** Migra bloques/extras/planilla plana → reuniones[] (mismo molde S-140, solo título). */
function reunionesDesdeLegacy(s) {
  if (Array.isArray(s.reuniones) && s.reuniones.length) {
    return s.reuniones.map(normalizarReunion).filter(Boolean);
  }

  const secciones = [];
  const extras = [];
  if (Array.isArray(s.bloques) && s.bloques.length) {
    for (const b of s.bloques) {
      if (b.tipo === 'seccion') {
        secciones.push({ titulo: b.titulo, color: b.color, filas: b.filas || [fila('')] });
      } else if (b.tipo === 'extra') {
        extras.push(b);
      }
    }
  } else if (Array.isArray(s.secciones) && s.secciones.length) {
    secciones.push(...s.secciones);
  }

  const r0 = secciones.length ? secciones : seccionesEntreSemanaModelo();
  copiarTextoReunion(s, r0);

  const lista = [r0];
  const ex = s.extras || {};
  const pushExtra = (b) => {
    if (!b) return;
    const r = reunionEnBlanco(b.titulo || 'Nueva reunión', b.secciones);
    r.activo = b.activo !== false;
    r.oracionInicio = b.oracionInicio || '';
    r.oracionFinal = b.oracionFinal || '';
    if (Array.isArray(b.secciones) && b.secciones.length) r.secciones = b.secciones;
    else if (Array.isArray(b.filas) && b.filas.length) {
      r.secciones = [{ titulo: b.titulo || 'NUEVA SECCIÓN', color: '#575a5d', filas: b.filas }];
    }
    lista.push(normalizarReunion(r));
  };

  if (extras.length) extras.forEach(pushExtra);
  else {
    if (ex.finde) pushExtra({ ...ex.finde, secciones: ex.finde.secciones || seccionesFinde() });
    if (ex.asignaciones) {
      pushExtra({
        ...ex.asignaciones,
        secciones: ex.asignaciones.secciones || [{
          titulo: ex.asignaciones.titulo || 'ASIGNACIONES',
          color: '#575a5d',
          filas: ex.asignaciones.filas || [fila('')],
        }],
      });
    }
    for (const o of ex.otros || []) pushExtra(o);
  }
  return lista.length ? lista : reunionesModelo();
}

/** Canon S-140: `reuniones[]` + espejo de la primera en campos planos / secciones / extras. */
function proyectarCanon(s) {
  if (!s) return s;
  if (!Array.isArray(s.reuniones)) s.reuniones = reunionesDesdeLegacy(s);
  s.reuniones = s.reuniones.map(normalizarReunion).filter(Boolean);

  const r0 = s.reuniones[0];
  copiarTextoReunion(r0, s);
  s.secciones = r0 ? clonar(r0.secciones) : [];

  s.extras = {
    finde: { activo: false, titulo: 'REUNIÓN DE FIN DE SEMANA', oracionInicio: '', oracionFinal: '', secciones: seccionesFinde() },
    asignaciones: { activo: false, titulo: 'ASIGNACIONES', filas: [] },
    otros: s.reuniones.slice(1).map((r) => {
      const o = {
        activo: r.activo !== false,
        titulo: r.titulo,
        modo: 'secciones',
        secciones: clonar(r.secciones),
        filas: [],
      };
      copiarTextoReunion(r, o);
      return o;
    }),
  };
  return s;
}

const MODELO = {
  version: 7,
  tipo: 'reuniones',
  plantilla: 's-140',
  elegidas: { reuniones: 's-140', grupos: 'columnas', salidas: 'calendario' },
  semana: '',
  fecha: '',
  titulo: 'LECTURA SEMANAL DE LA BIBLIA',
  congregacion: '',
  lectura: '',
  reuniones: reunionesModelo(),
};
proyectarCanon(MODELO);
MODELO.grupos = {
  titulo: 'Grupos de predicación',
  actualizado: '',
  lista: [0, 1, 2, 3].map((i) => grupo(`Grupo de predicación N ${i + 1}`, i)),
};
MODELO.salidas = { titulo: 'Salidas de predicación', lista: [salida(), salida()] };

const CAMPOS_ANIDADOS = new Set(['reuniones', 'secciones', 'extras']);
const CAMPOS_SEMANA = [
  'semana', 'fecha', 'titulo', 'lectura', 'doble',
  'reuniones', 'secciones', 'extras',
  ...CAMPOS_TEXTO_REUNION,
];

function copiarCamposSemana(desde, hacia, rellenarVacios) {
  for (const c of CAMPOS_SEMANA) {
    if (c === 'doble') hacia.doble = !!desde.doble;
    else if (CAMPOS_ANIDADOS.has(c)) hacia[c] = clonar(desde[c]);
    else hacia[c] = rellenarVacios ? (desde[c] ?? '') : desde[c];
  }
}

function semanaDesdeEstado(s) {
  const w = {};
  copiarCamposSemana(s, w, false);
  w.doble = !!s.doble;
  proyectarCanon(w);
  return w;
}
function vaciarNombresReunion(r) {
  copiarTextoReunion(null, r);
  (r.secciones || []).forEach((sec) => (sec.filas || []).forEach((f) => {
    f.nombre1 = '';
    f.nombre2 = '';
    (f.salaAuxiliar || []).forEach((a) => { a.nombre1 = ''; a.nombre2 = ''; });
  }));
}
function semanaEnBlanco(desde) {
  const base = desde ? clonar(desde) : semanaDesdeEstado(MODELO);
  base.reuniones = [];
  base.secciones = [];
  base.doble = false;
  proyectarCanon(base);
  return base;
}
function aplicarSemanaAlEstado(w) {
  if (!w) return;
  copiarCamposSemana(w, estado, true);
  proyectarCanon(estado);
}
function guardarSemanaActiva() {
  if (!estado.semanas?.length) return;
  const i = Math.min(Math.max(0, estado.semanaActiva | 0), estado.semanas.length - 1);
  estado.semanaActiva = i;
  proyectarCanon(estado);
  // Preservar el flag del slot: la semana absorbida no debe pisar la dueña.
  const doble = !!estado.semanas[i]?.doble;
  const w = semanaDesdeEstado(estado);
  w.doble = doble;
  estado.semanas[i] = w;
}

function asegurarTiempos(s) {
  const filas = [];
  for (const r of s.reuniones || []) {
    filasDeBloque(r).forEach((f) => filas.push(f));
  }
  filas.forEach((f) => {
    if (!f) return;
    if (f.tiempo == null) f.tiempo = '';
    if (!Array.isArray(f.salaAuxiliar)) f.salaAuxiliar = [];
    f.salaAuxiliar.forEach((a) => {
      if (a.etiqueta == null) a.etiqueta = '';
      if (a.nombre1 == null) a.nombre1 = '';
      if (a.nombre2 == null) a.nombre2 = '';
    });
  });
}

// Completa y actualiza datos guardados con versiones anteriores de la planilla.
function normalizar(s) {
  s.extras = s.extras || {};
  if (!s.extras.finde) s.extras.finde = { activo: false, titulo: 'REUNIÓN DE FIN DE SEMANA', oracionInicio: '', oracionFinal: '', secciones: seccionesFinde() };
  if (!s.extras.asignaciones) s.extras.asignaciones = { activo: false, titulo: 'ASIGNACIONES', filas: [] };
  if (!Array.isArray(s.extras.otros)) s.extras.otros = [];
  const v = s.version || (s.sinNumeros ? 2 : 1);
  if (v < 2) {
    (s.secciones || []).forEach((sec) => (sec.filas || []).forEach((f) => {
      f.texto = String(f.texto || '').replace(/^\s*\d+\s*[.)]\s*/, '');
    }));
  }
  if (v < 3 && Array.isArray(s.extras.finde?.filas)) {
    const fd = s.extras.finde;
    const ic = fd.filas.findIndex((f) => /^conductor de la atalaya$/i.test(String(f.texto).trim()));
    const il = fd.filas.findIndex((f) => /^lector$/i.test(String(f.texto).trim()));
    if (ic >= 0 && il >= 0) {
      fd.filas[ic] = fila('Conductor de La Atalaya / Lector', fd.filas[ic].nombre1, fd.filas[il].nombre1, '', true);
      fd.filas.splice(il, 1);
    }
    if (fd.titulo === 'REUNIÓN DEL FIN DE SEMANA') fd.titulo = 'REUNIÓN DE FIN DE SEMANA';
  }
  if (v < 4) {
    const fd = s.extras.finde;
    if (Array.isArray(fd.filas)) {
      fd.secciones = seccionesDesdeFilasFinde(fd.filas);
      delete fd.filas;
    } else if (!Array.isArray(fd.secciones)) {
      fd.secciones = seccionesFinde();
    }
  }
  if (v < 7 || !Array.isArray(s.reuniones)) {
    s.reuniones = reunionesDesdeLegacy(s);
  }
  proyectarCanon(s);

  if (!s.plantilla) s.plantilla = 's-140';
  if (!s.tipo || !['reuniones', 'grupos', 'salidas'].includes(s.tipo)) s.tipo = 'reuniones';
  s.elegidas = {
    reuniones: 's-140', grupos: 'columnas', salidas: 'calendario',
    ...(s.elegidas || {}),
  };
  if (s.elegidas.salidas === 'semana') s.elegidas.salidas = 'calendario';
  if (s.plantilla === 'semana') s.plantilla = 'calendario';
  if (!s.elegidas[s.tipo]) s.elegidas[s.tipo] = s.plantilla;
  if (!s.grupos || !Array.isArray(s.grupos.lista)) s.grupos = clonar(MODELO.grupos);
  if (!s.grupos.titulo || s.grupos.titulo === 'Grupos de servicio') s.grupos.titulo = 'Grupos de predicación';
  if (s.grupos.actualizado == null) s.grupos.actualizado = '';
  s.grupos.lista.forEach((g, i) => {
    if (!g.color) g.color = COLORES_GRUPO[i % COLORES_GRUPO.length];
    if (g.listado == null) g.listado = '';
    if (g.inactivos == null) g.inactivos = '';
    if (!g.nombre || /^Grupo \d+$/i.test(g.nombre)) g.nombre = `Grupo de predicación N ${i + 1}`;
  });
  if (!s.salidas || !Array.isArray(s.salidas.lista)) s.salidas = clonar(MODELO.salidas);
  if (!s.salidas.titulo) s.salidas.titulo = 'Salidas de predicación';
  (s.salidas.lista || []).forEach((item) => {
    if (item.mes == null) item.mes = '';
    if (item.destacada == null) item.destacada = false;
  });
  if (s.congregacion == null) s.congregacion = '';
  if (s.lectura == null) s.lectura = '';
  if (s.titulo == null) s.titulo = 'LECTURA SEMANAL DE LA BIBLIA';
  asegurarTiempos(s);
  if (!Array.isArray(s.semanas) || !s.semanas.length) {
    s.semanas = [semanaDesdeEstado(s)];
    s.semanaActiva = 0;
  } else {
    s.semanas = s.semanas.map((w) => {
      const n = { ...clonar(MODELO), ...w, doble: !!w.doble };
      if (!Array.isArray(n.reuniones)) n.reuniones = reunionesDesdeLegacy(n);
      proyectarCanon(n);
      asegurarTiempos(n);
      const out = semanaDesdeEstado(n);
      out.doble = !!w.doble;
      return out;
    });
    if (s.semanaActiva == null || s.semanaActiva < 0 || s.semanaActiva >= s.semanas.length) s.semanaActiva = 0;
  }
  {
    copiarCamposSemana(s.semanas[s.semanaActiva], s, true);
    proyectarCanon(s);
  }
  s.version = 7;
  delete s.sinNumeros;
  delete s.bloques;
  return s;
}

// Reparte las filas viejas del fin de semana en las dos secciones habituales.
function seccionesDesdeFilasFinde(filas) {
  if (!filas.length) return [{ titulo: 'NUEVA SECCIÓN', color: '#575a5d', filas: [fila('')] }];
  const discurso = [];
  const atalaya = [];
  const otras = [];
  for (const f of filas) {
    const t = String(f.texto || '');
    if (/discurso|discursante/i.test(t)) discurso.push(f);
    else if (/atalaya|lector|conductor/i.test(t)) atalaya.push(f);
    else otras.push(f);
  }
  const secciones = [];
  if (discurso.length) secciones.push({ titulo: 'DISCURSO PÚBLICO', color: '#1f4e79', filas: discurso });
  if (atalaya.length) secciones.push({ titulo: 'ESTUDIO DE LA ATALAYA', color: '#2e5a1c', filas: atalaya });
  if (otras.length) secciones.push({ titulo: 'OTRAS PARTES', color: '#575a5d', filas: otras });
  return secciones.length ? secciones : [{ titulo: 'NUEVA SECCIÓN', color: '#575a5d', filas }];
}

function filasDeBloque(bloque) {
  if (!bloque) return [];
  return [
    ...(bloque.filas || []),
    ...(bloque.secciones || []).flatMap((sec) => sec.filas || []),
  ];
}

/* ---------- Utilidades ---------- */

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
  const deLista = (texto) => String(texto || '').split(/[,;\n]/);
  const deSemana = (w) => (w.reuniones || []).flatMap((r) => [
    r.presidente, r.consejero, r.oracionInicio, r.oracionFinal,
    ...filasDeBloque(r).flatMap((f) => [
      f.nombre1, f.nombre2,
      ...(f.salaAuxiliar || []).flatMap((a) => [a.nombre1, a.nombre2]),
    ]),
  ]);
  const semanas = (s.semanas && s.semanas.length) ? s.semanas : [s];
  [...semanas.flatMap(deSemana),
    ...(s.grupos?.lista || []).flatMap((g) => [
      g.conductor, g.ayudante, ...deLista(g.integrantes),
      ...String(g.listado || '').split('\n').map((l) => l.replace(/^[^|]*\|\s*/, '').replace(/\s*\|.*$/, '').replace(/^\d+[.\-–)]\s*/, '').trim()),
      ...deLista(g.inactivos),
    ]),
    ...(s.salidas?.lista || []).flatMap((x) => [x.conductor, ...deLista(x.participantes)])]
    .forEach((n) => { n = String(n || '').trim(); if (n) nombres.add(n); });
}
recolectarNombres(estado);

function guardarEstado() {
  guardarSemanaActiva();
  escribir(KEY_ESTADO, estado);
}

function guardarNombres() {
  const lista = [...nombres].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
  nombres = new Set(lista);
  escribir(KEY_NOMBRES, lista);
  $('#nombres').innerHTML = lista.map((n) => `<option value="${esc(n)}">`).join('');
  if (document.activeElement !== $('#lista-nombres')) $('#lista-nombres').value = lista.join('\n');
}

/* ---------- Formulario ---------- */

function htmlDndHandle() {
  return `<span class="dnd-handle" draggable="true" role="button" tabindex="0" title="Arrastrar" aria-label="Arrastrar">
    <span class="dnd-grip" aria-hidden="true"></span>
  </span>`;
}

function htmlItemMenu({ clonar, eliminar, canDelete = true, extras = [] }) {
  const extrasHtml = (extras || []).map((x) =>
    `<button type="button" role="menuitem" data-action="${x.action}" ${x.attrs || ''}>${esc(x.label)}</button>`).join('');
  return `
    <div class="item-menu">
      <button type="button" class="item-menu-btn" aria-label="Más opciones" aria-haspopup="menu" aria-expanded="false">
        <span class="item-menu-dots" aria-hidden="true"></span>
      </button>
      <div class="item-menu-lista" hidden role="menu">
        ${extrasHtml}
        <button type="button" role="menuitem" data-action="${clonar.action}" ${clonar.attrs}>Clonar</button>
        ${canDelete ? `<button type="button" role="menuitem" class="peligro" data-action="${eliminar.action}" ${eliminar.attrs}>Eliminar</button>` : ''}
      </div>
    </div>`;
}

function cerrarMenusItem(excepto) {
  document.querySelectorAll('.item-menu.abierto').forEach((menu) => {
    if (excepto && menu === excepto) return;
    menu.classList.remove('abierto');
    menu.querySelector('.item-menu-btn')?.setAttribute('aria-expanded', 'false');
    const lista = menu.querySelector('.item-menu-lista');
    if (lista) lista.hidden = true;
  });
}

function htmlSalaAuxiliar(f, p, fi, base) {
  if (!Array.isArray(f.salaAuxiliar)) f.salaAuxiliar = [];
  const items = f.salaAuxiliar.map((a, ai) => {
    const ap = `${p}.salaAuxiliar.${ai}`;
    return `
      <div class="sala-aux-item dnd-item" data-dnd-index="${ai}">
        ${htmlDndHandle()}
        <div class="dnd-body">
          <div class="fila-grid">
            <label>Etiqueta (opcional)
              <input type="text" data-path="${ap}.etiqueta" value="${esc(a.etiqueta)}" placeholder="Ej.: Estudiante:">
            </label>
            <label>Nombre
              <input type="text" class="nombre" list="nombres" data-path="${ap}.nombre1" value="${esc(a.nombre1)}" placeholder="Nombre y apellido">
            </label>
            <label>Ayudante (opcional)
              <input type="text" class="nombre" list="nombres" data-path="${ap}.nombre2" value="${esc(a.nombre2)}" placeholder="Nombre y apellido">
            </label>
          </div>
        </div>
        ${htmlItemMenu({
          clonar: { action: 'clonar-sala-aux', attrs: `data-base="${base}" data-f="${fi}" data-a="${ai}"` },
          eliminar: { action: 'quitar-sala-aux', attrs: `data-base="${base}" data-f="${fi}" data-a="${ai}"` },
        })}
      </div>`;
  }).join('');
  if (!items) return '';
  return `<div class="sala-aux-lista dnd-list" data-dnd-list="${p}.salaAuxiliar">${items}</div>`;
}

/** Filas editables de un bloque. `base` es la ruta del bloque dentro de `estado` (p. ej. "secciones.0" o "extras.finde"). */
function htmlFilas(sec, base, textos) {
  const items = sec.filas.map((f, fi) => {
    const p = `${base}.filas.${fi}`;
    return `
      <div class="fila-wrap dnd-item" data-dnd-index="${fi}">
        <fieldset class="fila">
          <legend>Parte</legend>
          <div class="fila-main">
            ${htmlDndHandle()}
            <div class="dnd-body">
              <div class="fila-top">
                <label>Título
                  <input type="text" data-path="${p}.texto" value="${esc(f.texto)}" placeholder="Parte">
                </label>
                <label class="fila-tiempo">Tiempo
                  <input type="text" data-path="${p}.tiempo" value="${esc(f.tiempo)}" placeholder="10 min">
                </label>
              </div>
              <div class="fila-grid">
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
              ${htmlSalaAuxiliar(f, p, fi, base)}
            </div>
          </div>
        </fieldset>
        ${htmlItemMenu({
          extras: [{
            label: 'Agregar sala auxiliar',
            action: 'agregar-sala-aux',
            attrs: `data-base="${base}" data-f="${fi}"`,
          }],
          clonar: { action: 'clonar-fila', attrs: `data-base="${base}" data-f="${fi}"` },
          eliminar: { action: 'quitar-fila', attrs: `data-base="${base}" data-f="${fi}"` },
        })}
      </div>`;
  }).join('');
  return `<div class="dnd-list filas-lista" data-dnd-list="${base}.filas">${items}</div>`;
}

function htmlSeccion(sec, lista, si, { conDnd = true } = {}) {
  const base = `${lista}.${si}`;
  return `
    <fieldset class="card seccion-card${conDnd ? ' dnd-item' : ''}"${conDnd ? ` data-dnd-index="${si}"` : ''} style="--section-color:${esc(sec.color)}">
      <legend>Sección</legend>
      <div class="section-head">
        ${conDnd ? htmlDndHandle() : ''}
        <label class="titulo-campo">
          <input type="text" data-path="${base}.titulo" value="${esc(sec.titulo)}" aria-label="Título de la sección">
        </label>
        <label class="color-label">
          <input type="color" data-path="${base}.color" value="${esc(sec.color)}">
        </label>
      </div>
      ${htmlItemMenu({
        clonar: { action: 'clonar-seccion', attrs: `data-base="${lista}" data-s="${si}"` },
        eliminar: { action: 'quitar-seccion', attrs: `data-base="${lista}" data-s="${si}"` },
      })}
      ${htmlFilas(sec, base, { segundo: 'Ayudante (opcional)' })}
      <button type="button" class="btn ghost small" data-action="agregar-fila" data-base="${base}">+ Agregar parte</button>
    </fieldset>`;
}

function htmlReunion(r, ri) {
  const base = `reuniones.${ri}`;
  const nombre = (campo, titulo) => `
        <label>${titulo}
          <input type="text" class="nombre" list="nombres" data-path="${base}.${campo}" value="${esc(r[campo])}" placeholder="Nombre y apellido">
        </label>`;
  return `
    <fieldset class="card dnd-item reunion-card" data-dnd-index="${ri}">
      <legend>Reunión</legend>
      <div class="section-head">
        ${htmlDndHandle()}
        <label class="titulo-campo">
          <input type="text" data-path="${base}.titulo" value="${esc(r.titulo)}" placeholder="Ej.: Reunión de entre semana" aria-label="Título de la reunión">
        </label>
      </div>
      ${htmlItemMenu({
        clonar: { action: 'clonar-reunion', attrs: `data-i="${ri}"` },
        eliminar: { action: 'quitar-reunion', attrs: `data-i="${ri}"` },
      })}
      <div class="grid-2">
        ${nombre('presidente', 'Presidente')}
        ${nombre('consejero', 'Presidente de la sala auxiliar')}
      </div>
      ${nombre('oracionInicio', 'Oración inicial')}
      <details class="card nested">
        <summary>Canciones y limpieza</summary>
        <label>Limpieza del Salón del Reino
          <input type="text" data-path="${base}.limpieza" value="${esc(r.limpieza)}" placeholder="Limpieza del Salón del Reino">
        </label>
        <div class="grid-2">
          <label>Canción inicial
            <input type="text" data-path="${base}.cancionInicio" value="${esc(r.cancionInicio)}" placeholder="2:21 min • Canción 28">
          </label>
          <label>Palabras de introducción
            <input type="text" data-path="${base}.introduccion" value="${esc(r.introduccion)}" placeholder="1 min • Palabras de introducción">
          </label>
        </div>
        <div class="grid-2">
          <label>Canción intermedia
            <input type="text" data-path="${base}.cancionIntermedia" value="${esc(r.cancionIntermedia)}" placeholder="2:58 min • Canción 90">
          </label>
          <label>Palabras de conclusión
            <input type="text" data-path="${base}.conclusion" value="${esc(r.conclusion)}" placeholder="3 min • Palabras de conclusión">
          </label>
        </div>
        <label>Canción final
          <input type="text" data-path="${base}.cancionFinal" value="${esc(r.cancionFinal)}" placeholder="3:59 min • Canción 75">
        </label>
      </details>
      <div class="dnd-list" data-dnd-list="${base}.secciones">
        ${(r.secciones || []).map((sec, si) => htmlSeccion(sec, `${base}.secciones`, si)).join('')}
      </div>
      <button type="button" class="btn ghost full" data-action="agregar-seccion" data-base="${base}.secciones">+ Agregar sección</button>
      <label>Oración final
        <input type="text" class="nombre" list="nombres" data-path="${base}.oracionFinal" value="${esc(r.oracionFinal)}" placeholder="Nombre y apellido">
      </label>
    </fieldset>`;
}

function htmlGrupo(g, i) {
  const p = `grupos.lista.${i}`;
  const esLista = estado.plantilla === 'lista';
  const camposLista = `
      <div class="grid-2">
        <label>Conductor
          <input type="text" class="nombre" list="nombres" data-path="${p}.conductor" value="${esc(g.conductor)}" placeholder="Nombre y apellido">
        </label>
        <label>Ayudante
          <input type="text" class="nombre" list="nombres" data-path="${p}.ayudante" value="${esc(g.ayudante)}" placeholder="Nombre y apellido">
        </label>
      </div>
      <div class="grid-2">
        <label>Hora
          <input type="text" data-path="${p}.hora" value="${esc(g.hora)}" placeholder="9:30">
        </label>
        <label>Lugar
          <input type="text" data-path="${p}.lugar" value="${esc(g.lugar)}" placeholder="Salón del Reino">
        </label>
      </div>
      <label>Integrantes
        <input type="text" data-path="${p}.integrantes" value="${esc(g.integrantes)}" placeholder="Nombres, separados por coma">
      </label>`;
  const camposColumnas = `
      <label>Listado del cuadro
        <textarea data-path="${p}.listado" rows="10" placeholder="Sup | Nombre y apellido | PR&#10;Aux | Nombre y apellido&#10;Nombre y apellido | PR&#10;10. Nombre y apellido">${esc(g.listado)}</textarea>
      </label>
      <p class="hint">Una persona por línea. Sin etiqueta, la 1.ª es Sup, la 2.ª Aux y el resto se numera. Marca opcional después de | (PR, SM…).</p>
      <label>Inactivos
        <input type="text" data-path="${p}.inactivos" value="${esc(g.inactivos)}" placeholder="Nombre — Nombre">
      </label>`;
  if (esLista) {
    return `
    <fieldset class="card">
      <div class="section-head">
        <label>Grupo
          <input type="text" data-path="${p}.nombre" value="${esc(g.nombre)}" placeholder="Grupo de predicación N ${i + 1}">
        </label>
        <button type="button" class="btn small danger" data-action="quitar-grupo" data-i="${i}">Quitar</button>
      </div>
      ${camposLista}
      <details>
        <summary>Campos extra (plantilla columnas)</summary>
        ${camposColumnas}
        <label class="color-label">Color
          <input type="color" data-path="${p}.color" value="${esc(g.color || '#ffe600')}">
        </label>
      </details>
    </fieldset>`;
  }
  return `
    <fieldset class="card" style="--section-color:${esc(g.color || '#ffe600')}">
      <div class="section-head">
        <label>Grupo
          <input type="text" data-path="${p}.nombre" value="${esc(g.nombre)}" placeholder="Grupo de predicación N ${i + 1}">
        </label>
        <label class="color-label">
          <input type="color" data-path="${p}.color" value="${esc(g.color || '#ffe600')}">
        </label>
        <button type="button" class="btn small danger" data-action="quitar-grupo" data-i="${i}">Quitar</button>
      </div>
      ${camposColumnas}
      <details>
        <summary>Campos extra (plantilla lista)</summary>
        ${camposLista}
      </details>
    </fieldset>`;
}

function htmlSalida(s, i) {
  const p = `salidas.lista.${i}`;
  return `
    <fieldset class="card">
      <div class="section-head">
        <label>Día
          <textarea data-path="${p}.dia" rows="2" placeholder="Domingo 1">${esc(s.dia)}</textarea>
        </label>
        <label>Hora
          <input type="text" data-path="${p}.hora" value="${esc(s.hora)}" placeholder="10:30">
        </label>
        <label>Mes
          <input type="text" data-path="${p}.mes" value="${esc(s.mes)}" placeholder="Julio">
        </label>
        <label class="check">
          <input type="checkbox" data-path="${p}.destacada"${s.destacada ? ' checked' : ''}>
          Destacar
        </label>
        <button type="button" class="btn small danger" data-action="quitar-salida" data-i="${i}">Quitar</button>
      </div>
      <div class="grid-2">
        <label>Lugar de encuentro
          <input type="text" data-path="${p}.lugar" value="${esc(s.lugar)}">
        </label>
        <label>Territorio
          <input type="text" data-path="${p}.territorio" value="${esc(s.territorio)}" placeholder="Mapa o territorio">
        </label>
      </div>
      <label>Conductor
        <input type="text" class="nombre" list="nombres" data-path="${p}.conductor" value="${esc(s.conductor)}" placeholder="Nombre y apellido">
      </label>
    </fieldset>`;
}

function bloquesPaginas() {
  const lista = estado.semanas || [];
  const bloques = [];
  let num = 0;
  for (let i = 0; i < lista.length; i++) {
    if (i > 0 && lista[i - 1]?.doble) continue;
    num += 1;
    const doble = !!(lista[i].doble && lista[i + 1]);
    bloques.push({
      num,
      i,
      j: doble ? i + 1 : -1,
      doble,
      w: lista[i],
      w2: doble ? lista[i + 1] : null,
    });
  }
  return bloques;
}

function reordenarBloquesPaginas(from, to) {
  const bloques = bloquesPaginas();
  if (from === to || from < 0 || to < 0 || from >= bloques.length || to >= bloques.length) return false;
  const items = bloques.map((b) => {
    const slice = [estado.semanas[b.i]];
    if (b.j >= 0) slice.push(estado.semanas[b.j]);
    return slice;
  });
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  estado.semanas = items.flat();
  return true;
}

function htmlNavSemanas() {
  const lista = estado.semanas || [];
  const bloques = bloquesPaginas();
  const fechaDe = (w) => esc(w?.fecha || textoSemana(w?.semana) || '');
  return `
    <fieldset class="card semanas-nav">
      <legend>Páginas</legend>
      <div class="semanas-lista dnd-list" data-dnd-list="semanas">
        ${bloques.map((b, bi) => {
          const activa = estado.semanaActiva === b.i || (b.j >= 0 && estado.semanaActiva === b.j);
          const plantillaDoble = estado.plantilla === 'compacta';
          const puedeDoble = plantillaDoble && (b.i < lista.length - 1 || b.doble);
          return `
          <div class="dnd-item semana-dnd${activa ? ' activo' : ''}${b.doble ? ' con-doble' : ''}" data-dnd-index="${bi}">
            ${htmlDndHandle()}
            <div class="semana-cuerpo">
              <div class="semana-pagina-meta">Página ${b.num}${b.doble ? ' · 2' : ''}</div>
              <button type="button" class="semana-btn${estado.semanaActiva === b.i ? ' activo' : ''}" data-action="elegir-semana" data-i="${b.i}">
                <span class="semana-btn-fecha">${fechaDe(b.w)}</span>
              </button>
              ${b.doble ? `
              <button type="button" class="semana-btn semana-btn-hija${estado.semanaActiva === b.j ? ' activo' : ''}" data-action="elegir-semana" data-i="${b.j}">
                <span class="semana-btn-fecha">${fechaDe(b.w2)}</span>
              </button>` : ''}
            </div>
            ${htmlItemMenu({
              extras: puedeDoble ? [{
                label: b.doble ? '✓ 2 en esta hoja' : '2 en esta hoja',
                action: 'toggle-pagina-doble',
                attrs: `data-i="${b.i}"`,
              }] : (!plantillaDoble && b.doble ? [{
                label: '2 en hoja (solo Compacta)',
                action: 'aviso-doble-compacta',
                attrs: '',
              }] : []),
              clonar: { action: 'clonar-semana', attrs: `data-i="${b.i}"` },
              eliminar: { action: 'quitar-semana', attrs: `data-i="${b.i}"` },
              canDelete: bloques.length > 1,
            })}
          </div>`;
        }).join('')}
      </div>
      <button type="button" class="btn ghost full" data-action="agregar-semana">+ Agregar página</button>
    </fieldset>`;
}

function renderFormulario() {
  proyectarCanon(estado);
  const nav = $('#nav-semanas');
  if (nav) nav.innerHTML = htmlNavSemanas();
  const lista = $('#lista-reuniones');
  if (lista) {
    lista.classList.add('dnd-list');
    lista.dataset.dndList = 'reuniones';
    const reuniones = estado.reuniones || [];
    lista.innerHTML = reuniones.length
      ? reuniones.map((r, i) => htmlReunion(r, i)).join('')
      : `<div class="empty-reuniones">
          <p>No hay reuniones en esta página.</p>
          <p class="hint">Agregá una reunión o sincronizá el programa de la semana desde jw.org.</p>
          <div class="empty-acciones">
            <button type="button" class="btn" data-action="agregar-reunion">+ Agregar reunión</button>
            <button type="button" class="btn ghost" data-action="sincronizar-semana">Sincronizar programa</button>
          </div>
        </div>`;
  }
  $('#lista-grupos').innerHTML = (estado.grupos?.lista || []).map(htmlGrupo).join('');
  $('#lista-salidas').innerHTML = (estado.salidas?.lista || []).map(htmlSalida).join('');
  document.querySelectorAll('#planilla [data-path], #campo-congregacion').forEach((el) => {
    const v = getPath(estado, el.dataset.path);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.value !== (v ?? '')) el.value = v ?? '';
  });
  pintarNav();
}

function cambio() {
  guardarEstado();
  const actual = `${estado.tipo}/${estado.plantilla}`;
  if (actual !== plantillaCargada) cargarPlantilla(estado.plantilla);
  else programarVista();
}

function insertarCopia(arr, i) {
  arr.splice(i + 1, 0, clonar(arr[i]));
}

function moverIndice(arr, from, to) {
  if (!arr || from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return false;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
  return true;
}

function ajustarIndiceActivo(activo, from, to) {
  if (activo === from) return to;
  if (from < activo && to >= activo) return activo - 1;
  if (from > activo && to <= activo) return activo + 1;
  return activo;
}

function emparejarPorCampo(viejas, nuevas, campo) {
  const prev = Array.isArray(viejas) ? viejas : [];
  const usados = new Set();
  return (nuevas || []).map((item, i) => {
    const t = String(item[campo] || '').trim().toLowerCase();
    let pi = t
      ? prev.findIndex((p, idx) => !usados.has(idx) && String(p[campo] || '').trim().toLowerCase() === t)
      : -1;
    if (pi < 0 && prev[i] && !usados.has(i)) pi = i;
    if (pi >= 0) usados.add(pi);
    return { item, anterior: pi >= 0 ? prev[pi] : null };
  });
}

function fusionarFilasConservandoNombres(viejas, nuevas) {
  return emparejarPorCampo(viejas, nuevas, 'texto').map(({ item: f, anterior: ant }) => ({
    texto: f.texto || '',
    tiempo: f.tiempo || ant?.tiempo || '',
    etiqueta: f.etiqueta || ant?.etiqueta || '',
    dos: f.dos != null ? !!f.dos : !!ant?.dos,
    nombre1: ant?.nombre1 || '',
    nombre2: ant?.nombre2 || '',
    salaAuxiliar: Array.isArray(ant?.salaAuxiliar) ? clonar(ant.salaAuxiliar) : [],
  }));
}

function fusionarSeccionesConservandoNombres(viejas, nuevas) {
  return emparejarPorCampo(viejas, nuevas, 'titulo').map(({ item: sec, anterior: ant }) => ({
    titulo: sec.titulo || 'NUEVA SECCIÓN',
    color: sec.color || ant?.color || '#575a5d',
    filas: fusionarFilasConservandoNombres(ant?.filas, sec.filas),
  }));
}

function indiceReunionPorTitulo(lista, ...patrones) {
  const i = (lista || []).findIndex((r) => patrones.some((re) => re.test(String(r.titulo || ''))));
  return i >= 0 ? i : -1;
}

function asegurarReunionEn(lista, titulo, secciones, indicePreferido) {
  let i = indiceReunionPorTitulo(lista, new RegExp(titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  if (i < 0 && indicePreferido != null && lista[indicePreferido]) i = indicePreferido;
  if (i < 0) {
    lista.push(reunionEnBlanco(titulo, secciones));
    i = lista.length - 1;
  }
  return i;
}

async function cargarProgramaSemana(lunes) {
  const respuesta = await fetch(`api/semana?lunes=${encodeURIComponent(lunes)}`, { cache: 'no-store' });
  const tipo = (respuesta.headers.get('content-type') || '').toLowerCase();
  const esJson = tipo.includes('application/json');
  if (!esJson) {
    const err = new Error('sin-servidor');
    err.status = 503;
    throw err;
  }
  if (respuesta.status === 404) {
    const err = new Error('no-encontrada');
    err.status = 404;
    throw err;
  }
  if (!respuesta.ok) throw new Error('api');
  return respuesta.json();
}

function aplicarBloqueReunion(bloque, { titulo, indice, patrones, campos }) {
  let i = patrones ? indiceReunionPorTitulo(estado.reuniones, ...patrones) : -1;
  if (i < 0) i = asegurarReunionEn(estado.reuniones, bloque.titulo || titulo, bloque.secciones, indice);
  const r = estado.reuniones[i];
  const prevSec = r.secciones;
  r.titulo = bloque.titulo || r.titulo;
  for (const c of campos) if (bloque[c] != null) r[c] = bloque[c];
  r.secciones = fusionarSeccionesConservandoNombres(prevSec, bloque.secciones);
  return r;
}

function aplicarProgramaSemana(datos) {
  if (datos.fechaTexto) estado.fecha = datos.fechaTexto;
  if (datos.lectura) estado.lectura = datos.lectura;
  if (datos.titulo) estado.titulo = datos.titulo;

  if (!Array.isArray(estado.reuniones)) estado.reuniones = [];

  if (datos.entreSemana) {
    aplicarBloqueReunion(datos.entreSemana, {
      titulo: 'Reunión de entre semana',
      indice: 0,
      patrones: [/entre\s*semana/i, /vida\s*y?\s*ministerio/i, /tesoros/i, /seamos\s*mejores/i],
      campos: ['cancionInicio', 'introduccion', 'cancionIntermedia', 'conclusion', 'cancionFinal'],
    });
  }

  if (datos.finDeSemana) {
    const r = aplicarBloqueReunion(datos.finDeSemana, {
      titulo: 'REUNIÓN DE FIN DE SEMANA',
      indice: 1,
      patrones: [/fin\s*de\s*semana/i, /atalaya/i, /discurso\s*p[uú]blico/i],
      campos: ['cancionIntermedia', 'cancionFinal'],
    });
    for (const sec of r.secciones || []) {
      const esAtalaya = /atalaya/i.test(sec.titulo || '');
      const esDiscurso = /discurso/i.test(sec.titulo || '');
      for (const f of sec.filas || []) {
        if (String(f.tiempo || '').trim()) continue;
        if (esAtalaya || /atalaya/i.test(f.texto || '')) f.tiempo = '60 min';
        else if (esDiscurso || /discurso/i.test(f.texto || '')) f.tiempo = '30 min';
      }
    }
  }

  proyectarCanon(estado);
}

const acciones = {
  async 'sincronizar-semana'() {
    const lunes = String(estado.semana || '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lunes)) {
      toast('Elegí primero el lunes de la semana');
      return false;
    }
    estado.semana = lunes;
    toast('Buscando programa…');
    try {
      const datos = await cargarProgramaSemana(lunes);
      aplicarProgramaSemana(datos);
      toast('Programa sincronizado');
    } catch (error) {
      if (error.status === 503) {
        const puerto = location.port || '8097';
        toast(`Abrí la app con el servidor Node (ej. :${puerto}), no con python :8000`);
      }
      else if (error.status === 404) toast('No se encontró el programa para ese lunes');
      else toast('No se pudo sincronizar (¿estás en el servidor?)');
      return false;
    }
  },
  'agregar-reunion'() {
    if (!Array.isArray(estado.reuniones)) estado.reuniones = [];
    estado.reuniones.push(reunionEnBlanco('Nueva reunión'));
    proyectarCanon(estado);
  },
  'clonar-reunion'(d) {
    const i = +d.i;
    if (!estado.reuniones?.[i]) return false;
    insertarCopia(estado.reuniones, i);
    proyectarCanon(estado);
  },
  'quitar-reunion'(d) {
    const i = +d.i;
    if (!estado.reuniones?.[i]) return false;
    if (!confirm('¿Eliminar esta reunión?')) return false;
    estado.reuniones.splice(i, 1);
    proyectarCanon(estado);
  },
  'agregar-seccion'(d) {
    getPath(estado, d.base).push({ titulo: 'NUEVA SECCIÓN', color: '#575a5d', filas: [fila('')] });
    proyectarCanon(estado);
  },
  'clonar-seccion'(d) {
    const arr = getPath(estado, d.base);
    insertarCopia(arr, +d.s);
    proyectarCanon(estado);
  },
  'quitar-seccion'(d) {
    if (!confirm('¿Eliminar esta sección completa?')) return false;
    getPath(estado, d.base).splice(d.s, 1);
    proyectarCanon(estado);
  },
  'agregar-fila'(d) { getPath(estado, d.base).filas.push(fila('')); proyectarCanon(estado); },
  'clonar-fila'(d) {
    insertarCopia(getPath(estado, d.base).filas, +d.f);
    proyectarCanon(estado);
  },
  'quitar-fila'(d) { getPath(estado, d.base).filas.splice(d.f, 1); proyectarCanon(estado); },
  'agregar-sala-aux'(d) {
    const f = getPath(estado, d.base).filas[+d.f];
    if (!f) return false;
    if (!Array.isArray(f.salaAuxiliar)) f.salaAuxiliar = [];
    f.salaAuxiliar.push(asignacionSala(f.etiqueta || ''));
    proyectarCanon(estado);
  },
  'clonar-sala-aux'(d) {
    const f = getPath(estado, d.base).filas[+d.f];
    if (!f?.salaAuxiliar) return false;
    insertarCopia(f.salaAuxiliar, +d.a);
    proyectarCanon(estado);
  },
  'quitar-sala-aux'(d) {
    const f = getPath(estado, d.base).filas[+d.f];
    if (!f?.salaAuxiliar) return false;
    f.salaAuxiliar.splice(+d.a, 1);
    proyectarCanon(estado);
  },
  'agregar-grupo'() {
    const n = estado.grupos.lista.length;
    estado.grupos.lista.push(grupo(`Grupo de predicación N ${n + 1}`, n));
  },
  'quitar-grupo'(d) { estado.grupos.lista.splice(d.i, 1); },
  async 'cargar-grupos-predicacion'() {
    if (!confirm('¿Reemplazar los grupos actuales con los del documento?')) return false;
    try {
      const res = await fetch('data/grupos-predicacion.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('fetch');
      const datos = await res.json();
      if (datos.titulo) estado.grupos.titulo = datos.titulo;
      if (datos.actualizado != null) estado.grupos.actualizado = datos.actualizado;
      if (datos.congregacion) estado.congregacion = datos.congregacion;
      estado.grupos.lista = (datos.lista || []).map((g, i) => ({
        ...grupo(g.nombre || `Grupo de predicación N ${i + 1}`, i),
        ...g,
        color: g.color || COLORES_GRUPO[i % COLORES_GRUPO.length],
      }));
      estado.tipo = 'grupos';
      estado.plantilla = 'columnas';
      estado.elegidas.grupos = 'columnas';
      toast('Grupos cargados');
    } catch {
      toast('No se pudo cargar grupos-predicacion.json');
      return false;
    }
  },
  'agregar-salida'() { estado.salidas.lista.push(salida()); },
  'quitar-salida'(d) { estado.salidas.lista.splice(d.i, 1); },
  'elegir-tipo'(d) {
    if (estado.tipo === d.tipo) return false;
    estado.elegidas[estado.tipo] = estado.plantilla;
    estado.tipo = d.tipo;
    estado.plantilla = estado.elegidas[d.tipo] || catalogo.find((p) => p.tipo === d.tipo)?.id || estado.plantilla;
  },
  'elegir-plantilla'(d) {
    estado.plantilla = d.id;
    estado.elegidas[estado.tipo] = d.id;
    if (d.id !== 'compacta' && (estado.semanas || []).some((w) => w.doble)) {
      toast('«2 en esta hoja» solo se ve bien en Compacta');
    }
  },
  'aviso-doble-compacta'() {
    toast('«2 en esta hoja» solo aplica a la plantilla Compacta');
    return false;
  },
  'elegir-semana'(d) {
    const i = +d.i;
    if (i === estado.semanaActiva || i < 0 || i >= estado.semanas.length) return false;
    guardarSemanaActiva();
    estado.semanaActiva = i;
    aplicarSemanaAlEstado(estado.semanas[i]);
  },
  'toggle-pagina-doble'(d) {
    const i = +d.i;
    const lista = estado.semanas || [];
    if (i < 0 || i >= lista.length) return false;
    const on = !lista[i].doble;
    if (on && !lista[i + 1]) return false;
    lista[i].doble = on;
    if (estado.semanaActiva === i) estado.doble = on;
    if (on) {
      lista[i + 1].doble = false;
      if (i > 0) lista[i - 1].doble = false;
    }
  },
  'agregar-semana'() {
    guardarSemanaActiva();
    const prev = estado.semanas[estado.semanas.length - 1] || estado.semanas[estado.semanaActiva];
    if (prev) prev.doble = false;
    const nueva = semanaEnBlanco(prev);
    const base = prev?.semana ? fechaDesdeISO(prev.semana) : (estado.semana ? fechaDesdeISO(estado.semana) : new Date());
    base.setDate(base.getDate() + 7);
    nueva.semana = aISO(base);
    nueva.fecha = textoSemana(nueva.semana);
    estado.semanas.push(nueva);
    estado.semanaActiva = estado.semanas.length - 1;
    aplicarSemanaAlEstado(nueva);
    toast(`Página ${bloquesPaginas().length} agregada`);
  },
  'clonar-semana'(d) {
    const i = +d.i;
    if (i < 0 || i >= estado.semanas.length) return false;
    guardarSemanaActiva();
    const esDoble = !!(estado.semanas[i]?.doble && estado.semanas[i + 1]);
    const insertAt = esDoble ? i + 2 : i + 1;
    const copia = clonar(estado.semanas[i]);
    if (esDoble) {
      const copia2 = clonar(estado.semanas[i + 1]);
      copia.doble = true;
      copia2.doble = false;
      estado.semanas.splice(insertAt, 0, copia, copia2);
    } else {
      copia.doble = false;
      estado.semanas.splice(insertAt, 0, copia);
    }
    estado.semanaActiva = insertAt;
    aplicarSemanaAlEstado(estado.semanas[estado.semanaActiva]);
    toast(`Página ${bloquesPaginas().find((b) => b.i === insertAt)?.num || ''} clonada`);
  },
  'quitar-semana'(d) {
    const bloques = bloquesPaginas();
    if (bloques.length < 2) return false;
    const i = d.i != null && d.i !== '' ? +d.i : estado.semanaActiva;
    if (i < 0 || i >= estado.semanas.length) return false;
    const quitar = estado.semanas[i]?.doble && estado.semanas[i + 1] ? 2 : 1;
    const msg = quitar === 2
      ? '¿Eliminar esta página? Se borrarán las 2 semanas de la hoja.'
      : '¿Eliminar esta página del programa?';
    if (!confirm(msg)) return false;
    guardarSemanaActiva();
    estado.semanas.splice(i, quitar);
    if (estado.semanas[i - 1]) estado.semanas[i - 1].doble = false;
    if (estado.semanaActiva >= i && estado.semanaActiva < i + quitar) {
      estado.semanaActiva = Math.min(i, estado.semanas.length - 1);
    } else if (estado.semanaActiva >= i + quitar) {
      estado.semanaActiva -= quitar;
    }
    aplicarSemanaAlEstado(estado.semanas[estado.semanaActiva]);
  },
  'zoom-in'() {
    const marco = $('#preview-frame');
    if (!marco) return false;
    const r = marco.getBoundingClientRect();
    zoomEn(r.left + r.width / 2, r.top + r.height / 2, -1);
    return false;
  },
  'zoom-out'() {
    const marco = $('#preview-frame');
    if (!marco) return false;
    const r = marco.getBoundingClientRect();
    zoomEn(r.left + r.width / 2, r.top + r.height / 2, 1);
    return false;
  },
  'zoom-reset'() {
    resetZoom();
    return false;
  },

  'nueva-semana'() {
    if (!confirm('Se pasa a la semana siguiente y se vacían los nombres. ¿Seguir?')) return false;
    const base = estado.semana ? fechaDesdeISO(estado.semana) : new Date();
    base.setDate(base.getDate() + 7);
    estado.semana = aISO(base);
    estado.fecha = textoSemana(estado.semana);
    (estado.reuniones || []).forEach(vaciarNombresReunion);
    proyectarCanon(estado);
    estado.grupos.lista.forEach((g) => {
      g.conductor = g.ayudante = g.integrantes = '';
      g.listado = '';
      g.inactivos = '';
    });
    estado.salidas.lista.forEach((s) => { s.conductor = s.participantes = ''; });
    guardarSemanaActiva();
    toast('Nueva semana lista para completar');
  },
  async 'descargar-png'() {
    cerrarMenuDescarga();
    try {
      const blob = await generarBlob();
      if (!blob) throw new Error('vacío');
      descargarBlob(blob, nombreArchivo());
    } catch {
      toast('No se pudo generar la imagen');
    }
    return false;
  },
  async 'descargar-pdf'() {
    cerrarMenuDescarga();
    try {
      const blob = await generarPdfBlob();
      if (!blob) throw new Error('vacío');
      descargarBlob(blob, nombreArchivo('pdf'));
    } catch {
      toast('No se pudo generar el PDF');
    }
    return false;
  },
  async compartir() {
    try {
      const blob = await generarBlob();
      if (!blob) throw new Error('vacío');
      const archivo = new File([blob], nombreArchivo(), { type: 'image/png' });
      try {
        await navigator.share({ files: [archivo], title: `Programa ${estado.fecha}` });
      } catch (e) {
        if (e.name !== 'AbortError') descargarBlob(blob, archivo.name);
      }
    } catch {
      toast('No se pudo generar la imagen');
    }
    return false;
  },
};

document.addEventListener('click', async (e) => {
  if (!e.target.closest('.menu-descarga')) cerrarMenuDescarga();

  const menuBtn = e.target.closest('.item-menu-btn');
  if (menuBtn) {
    e.preventDefault();
    e.stopPropagation();
    const menu = menuBtn.closest('.item-menu');
    const abrir = !menu.classList.contains('abierto');
    cerrarMenusItem();
    if (abrir) {
      menu.classList.add('abierto');
      menuBtn.setAttribute('aria-expanded', 'true');
      const lista = menu.querySelector('.item-menu-lista');
      if (lista) lista.hidden = false;
    }
    return;
  }

  if (!e.target.closest('.item-menu')) cerrarMenusItem();
  if (e.target.closest('.dnd-handle')) return;
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const r = await acciones[btn.dataset.action]?.(btn.dataset, e);
  if (r === false) return;
  cerrarMenusItem();
  renderFormulario();
  cambio();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarMenusItem();
});

/* ---------- Drag and drop reutilizable ---------- */

let dnd = null;

function dndLimpiar() {
  if (dnd?.item) dnd.item.style.display = '';
  document.querySelectorAll('.dnd-dragging, .dnd-over, .dnd-over-after').forEach((el) => {
    el.classList.remove('dnd-dragging', 'dnd-over', 'dnd-over-after');
  });
  document.querySelectorAll('.dnd-placeholder').forEach((el) => el.remove());
  dnd = null;
}

function dndListaDe(el) {
  return el?.closest('[data-dnd-list]');
}

function dndListaActiva(el) {
  if (!dnd || !el) return null;
  let node = el;
  while (node) {
    if (node.dataset?.dndList === dnd.listPath) return node;
    node = node.parentElement;
  }
  return null;
}

function dndItemEnLista(lista, el) {
  if (!lista || !el) return null;
  let node = el;
  while (node && node !== lista) {
    if (node.hasAttribute?.('data-dnd-index') && node.parentElement === lista) return node;
    node = node.parentElement;
  }
  return null;
}

function dndPlaceholder(altura) {
  const ph = document.createElement('div');
  ph.className = 'dnd-placeholder';
  ph.style.height = `${Math.max(40, altura | 0)}px`;
  return ph;
}

function dndAplicar(listPath, from, to) {
  if (listPath === 'semanas') {
    guardarSemanaActiva();
    const activa = estado.semanas[estado.semanaActiva];
    if (!reordenarBloquesPaginas(from, to)) return false;
    const idx = estado.semanas.indexOf(activa);
    estado.semanaActiva = idx >= 0 ? idx : Math.min(estado.semanaActiva | 0, estado.semanas.length - 1);
    aplicarSemanaAlEstado(estado.semanas[estado.semanaActiva]);
    return true;
  }
  const arr = getPath(estado, listPath);
  if (!moverIndice(arr, from, to)) return false;
  if (listPath === 'reuniones' || listPath.startsWith('reuniones.')) proyectarCanon(estado);
  return true;
}

document.addEventListener('dragstart', (e) => {
  const handle = e.target.closest?.('.dnd-handle');
  if (!handle) return;
  const lista = dndListaDe(handle);
  const item = dndItemEnLista(lista, handle);
  if (!lista || !item) {
    e.preventDefault();
    return;
  }
  const from = +item.dataset.dndIndex;
  dnd = { listPath: lista.dataset.dndList, from, item, lista, altura: item.getBoundingClientRect().height };
  item.classList.add('dnd-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(from));
  const ph = dndPlaceholder(dnd.altura);
  item.after(ph);
  requestAnimationFrame(() => { if (dnd?.item) dnd.item.style.display = 'none'; });
});

document.addEventListener('dragover', (e) => {
  if (!dnd) return;
  const lista = dndListaActiva(e.target);
  if (!lista) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const ph = lista.querySelector(':scope > .dnd-placeholder') || dndPlaceholder(dnd.altura);
  if (!ph.parentElement) lista.appendChild(ph);
  const item = dndItemEnLista(lista, e.target);
  if (!item || item === dnd.item) return;
  const mid = item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2;
  if (e.clientY < mid) item.before(ph);
  else item.after(ph);
});

document.addEventListener('drop', (e) => {
  if (!dnd) return;
  const lista = dndListaActiva(e.target);
  if (!lista) return;
  e.preventDefault();
  const listPath = dnd.listPath;
  const ph = lista.querySelector(':scope > .dnd-placeholder');
  const visibles = [...lista.children].filter((el) =>
    el.classList.contains('dnd-placeholder')
    || (el.hasAttribute('data-dnd-index') && el !== dnd.item));
  const to = ph ? visibles.indexOf(ph) : -1;
  const from = dnd.from;
  dndLimpiar();
  if (to < 0 || to === from) return;
  if (dndAplicar(listPath, from, to)) {
    renderFormulario();
    cambio();
  }
});

document.addEventListener('dragend', () => {
  if (!dnd) return;
  dndLimpiar();
});

document.addEventListener('click', (e) => {
  const menu = document.querySelector('.menu-descarga');
  if (!menu) return;
  if (e.target.closest('#btn-descargar')) {
    e.stopPropagation();
    const btn = document.getElementById('btn-descargar');
    setMenuDescarga(btn.getAttribute('aria-expanded') !== 'true');
    return;
  }
  if (!menu.contains(e.target)) cerrarMenuDescarga();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarMenuDescarga();
});

function setPopupNombres(abierto) {
  const popup = $('#popup-nombres');
  const boton = $('#btn-nombres');
  if (!popup || !boton) return;
  popup.hidden = !abierto;
  boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
}

$('#btn-nombres').addEventListener('click', () => {
  const popup = $('#popup-nombres');
  if (popup) setPopupNombres(popup.hidden);
});

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-nombres, #popup-nombres')) return;
  setPopupNombres(false);
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const popup = $('#popup-nombres');
  if (!popup || popup.hidden) return;
  setPopupNombres(false);
  $('#btn-nombres').focus();
});

$('#lista-nombres').addEventListener('input', (e) => {
  nombres = new Set(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean));
  guardarNombres();
});

function alEditarCampo(el) {
  const path = el.dataset.path;
  if (!path) return;
  setPath(estado, path, el.type === 'checkbox' ? el.checked : el.value);
  if (path === 'semana') {
    estado.fecha = textoSemana(el.value);
    $('[data-path="fecha"]').value = estado.fecha;
  }
  if (path.endsWith('.color')) el.closest('fieldset')?.style.setProperty('--section-color', el.value);
  if (path.startsWith('reuniones.')) proyectarCanon(estado);
  cambio();
}

$('#planilla').addEventListener('input', (e) => alEditarCampo(e.target));
$('#campo-congregacion').addEventListener('input', (e) => alEditarCampo(e.target));

$('#planilla').addEventListener('change', (e) => {
  const el = e.target;
  if (el.classList.contains('nombre') && el.value.trim() && !nombres.has(el.value.trim())) {
    nombres.add(el.value.trim());
    guardarNombres();
  }
});

/* ---------- Plantillas ---------- */

const HOJA_ANCHO = 1240;
const HOJA_ALTO = 1754;

const preview = {
  fit: 1,
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  pointerId: null,
};

const TIPOS = [
  { id: 'reuniones', nombre: 'Reuniones' },
  { id: 'grupos', nombre: 'Grupos' },
  { id: 'salidas', nombre: 'Salidas de predicación' },
];

let catalogo = [];
let plantillaCargada = '';

function pintarNav() {
  const tipos = $('#nav-tipos');
  const plantillas = $('#nav-plantillas');
  if (!tipos || !plantillas) return;
  tipos.innerHTML = TIPOS.map((t) =>
    `<button type="button" class="tipo${estado.tipo === t.id ? ' activo' : ''}" data-action="elegir-tipo" data-tipo="${t.id}">${esc(t.nombre)}</button>`).join('');
  plantillas.innerHTML = catalogo.filter((p) => p.tipo === estado.tipo).map((p) =>
    `<button type="button" class="plantilla-btn${estado.plantilla === p.id ? ' activo' : ''}" data-action="elegir-plantilla" data-id="${esc(p.id)}">${esc(p.nombre)}</button>`).join('');
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== estado.tipo;
  });
  document.querySelectorAll('[data-si-plantilla]').forEach((el) => {
    const ids = el.dataset.siPlantilla.split(',').map((s) => s.trim()).filter(Boolean);
    el.hidden = !ids.includes(estado.plantilla);
  });
  ajustarVista();
}

async function cargarIndice() {
  try {
    const respuesta = await fetch('plantillas/indice.json', { cache: 'no-store' });
    if (!respuesta.ok) throw new Error('indice');
    catalogo = await respuesta.json();
  } catch {
    catalogo = [{ id: 'programa-semanal', nombre: 'Programa semanal', tipo: 'reuniones' }];
  }
  catalogo = catalogo.filter((p) => p && /^[a-z0-9-]+$/.test(p.id) && /^[a-z0-9-]+$/.test(p.tipo));
  pintarNav();
}

function cargarPlantilla(id) {
  const pedido = catalogo.find((p) => p.id === id && p.tipo === estado.tipo)
    || catalogo.find((p) => p.tipo === estado.tipo)
    || catalogo[0];
  if (!pedido) return;
  estado.plantilla = pedido.id;
  estado.tipo = pedido.tipo;
  estado.elegidas[pedido.tipo] = pedido.id;
  pintarNav();
  if (plantillaCargada === `${pedido.tipo}/${pedido.id}`) {
    programarVista();
    return;
  }
  plantillaCargada = `${pedido.tipo}/${pedido.id}`;
  const vista = $('#vista');
  vista.onload = () => {
    engancharVistaDev();
    programarVista();
  };
  const base = `${pedido.tipo}/${pedido.id}`;
  vista.src = pedido.formato === 'njk'
    ? `plantillas/visor.html?tipo=${pedido.tipo}&id=${pedido.id}`
    : `plantillas/${base}/plantilla.html`;
}

function clampPreviewPan() {
  const marco = $('#preview-frame');
  if (!marco) return;
  const w = marco.clientWidth;
  const h = marco.clientHeight;
  const scale = preview.fit * preview.zoom;
  const dw = HOJA_ANCHO * scale;
  const dh = HOJA_ALTO * scale;
  const maxX = Math.max(0, (dw - w) / 2);
  const maxY = Math.max(0, (dh - h) / 2);
  preview.panX = Math.min(maxX, Math.max(-maxX, preview.panX));
  preview.panY = Math.min(maxY, Math.max(-maxY, preview.panY));
}

function redibujarPreview() {
  const stage = $('#preview-stage');
  const marco = $('#preview-frame');
  if (!stage || !marco) return;
  clampPreviewPan();
  const scale = preview.fit * preview.zoom;
  const w = marco.clientWidth;
  const h = marco.clientHeight;
  const x = (w - HOJA_ANCHO * scale) / 2 + preview.panX;
  const y = (h - HOJA_ALTO * scale) / 2 + preview.panY;
  if (window.__PROD__) {
    stage.style.zoom = '';
    stage.style.left = '0px';
    stage.style.top = '0px';
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  } else {
    // Sin transform el inspector puede entrar al HTML del iframe.
    stage.style.transform = 'none';
    stage.style.left = `${x}px`;
    stage.style.top = `${y}px`;
    stage.style.zoom = String(scale);
  }
  marco.classList.toggle('puede-mover', preview.zoom > 1.01);
}

function zoomEn(clientX, clientY, deltaY) {
  const marco = $('#preview-frame');
  if (!marco) return;
  const rect = marco.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  const w = rect.width;
  const h = rect.height;
  const prev = preview.fit * preview.zoom;
  const factor = deltaY < 0 ? 1.12 : 1 / 1.12;
  const nextZoom = Math.min(6, Math.max(1, preview.zoom * factor));
  const next = preview.fit * nextZoom;
  const worldX = (mx - w / 2 - preview.panX) / prev;
  const worldY = (my - h / 2 - preview.panY) / prev;
  preview.zoom = nextZoom;
  if (preview.zoom <= 1.01) {
    preview.zoom = 1;
    preview.panX = 0;
    preview.panY = 0;
  } else {
    preview.panX = mx - w / 2 - worldX * next;
    preview.panY = my - h / 2 - worldY * next;
  }
  redibujarPreview();
}

function empezarArrastre(x, y) {
  const marco = $('#preview-frame');
  preview.dragging = true;
  preview.lastX = x;
  preview.lastY = y;
  marco?.classList.add('arrastrando');
}

function moverArrastre(x, y) {
  if (!preview.dragging) return;
  preview.panX += x - preview.lastX;
  preview.panY += y - preview.lastY;
  preview.lastX = x;
  preview.lastY = y;
  redibujarPreview();
}

function terminarArrastre() {
  preview.dragging = false;
  preview.pointerId = null;
  $('#preview-frame')?.classList.remove('arrastrando');
}

function resetZoom() {
  preview.zoom = 1;
  preview.panX = 0;
  preview.panY = 0;
  redibujarPreview();
}

function engancharVistaDev() {
  if (window.__PROD__) return;
  const vista = $('#vista');
  const win = vista?.contentWindow;
  const doc = vista?.contentDocument;
  if (!win || !doc || doc.documentElement.dataset.zoomHook) return;
  doc.documentElement.dataset.zoomHook = '1';
  const pantalla = (e) => {
    const rect = vista.getBoundingClientRect();
    const sx = rect.width / (win.innerWidth || HOJA_ANCHO);
    const sy = rect.height / (win.innerHeight || HOJA_ALTO);
    return { x: rect.left + e.clientX * sx, y: rect.top + e.clientY * sy };
  };
  doc.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = pantalla(e);
    zoomEn(p.x, p.y, e.deltaY);
  }, { passive: false });
  doc.addEventListener('pointerdown', (e) => {
    if (preview.zoom <= 1.01 || e.button !== 0) return;
    const p = pantalla(e);
    empezarArrastre(p.x, p.y);
  });
  doc.addEventListener('pointermove', (e) => {
    if (!preview.dragging) return;
    const p = pantalla(e);
    moverArrastre(p.x, p.y);
  });
  doc.addEventListener('pointerup', terminarArrastre);
  doc.addEventListener('pointercancel', terminarArrastre);
  doc.addEventListener('dblclick', resetZoom);
}

function ajustarVista() {
  const marco = $('#preview-frame');
  const panel = document.querySelector('.preview-panel');
  if (!marco || !panel) return;
  const header = document.querySelector('.topbar');
  const altoHeader = header ? header.offsetHeight : 108;
  document.documentElement.style.setProperty('--header-h', `${altoHeader}px`);
  const disponible = panel.clientWidth;
  const maxH = window.innerWidth > 900
    ? Math.max(320, window.innerHeight - altoHeader - 24)
    : disponible * HOJA_ALTO / HOJA_ANCHO;
  preview.fit = Math.min(disponible / HOJA_ANCHO, maxH / HOJA_ALTO);
  marco.style.width = `${HOJA_ANCHO * preview.fit}px`;
  marco.style.height = `${HOJA_ALTO * preview.fit}px`;
  if (preview.zoom <= 1.01) {
    preview.zoom = 1;
    preview.panX = 0;
    preview.panY = 0;
  }
  redibujarPreview();
}

function iniciarPreviewZoom() {
  const marco = $('#preview-frame');
  if (!marco || marco.dataset.zoomReady) return;
  marco.dataset.zoomReady = '1';

  marco.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomEn(e.clientX, e.clientY, e.deltaY);
  }, { passive: false });

  marco.addEventListener('pointerdown', (e) => {
    if (preview.zoom <= 1.01 || e.button !== 0) return;
    preview.pointerId = e.pointerId;
    empezarArrastre(e.clientX, e.clientY);
    marco.setPointerCapture(e.pointerId);
  });
  marco.addEventListener('pointermove', (e) => {
    if (!preview.dragging || e.pointerId !== preview.pointerId) return;
    moverArrastre(e.clientX, e.clientY);
  });
  const finDrag = (e) => {
    if (e.pointerId !== preview.pointerId) return;
    terminarArrastre();
  };
  marco.addEventListener('pointerup', finDrag);
  marco.addEventListener('pointercancel', finDrag);
  marco.addEventListener('dblclick', resetZoom);
}

function prepararSemanaPlantilla(w) {
  const sem = clonar(w || semanaDesdeEstado(estado));
  proyectarCanon(sem);
  sem.congregacion = estado.congregacion;
  return sem;
}

function datosParaPlantilla() {
  guardarSemanaActiva();
  proyectarCanon(estado);
  const lista = estado.semanas || [];
  let i = Math.min(Math.max(0, estado.semanaActiva | 0), Math.max(0, lista.length - 1));
  // Si estás editando la semana absorbida, la hoja sigue siendo la página dueña.
  if (i > 0 && lista[i - 1]?.doble) i -= 1;
  const activa = prepararSemanaPlantilla(lista[i]);
  const semanas = [activa];
  const usarDoble = estado.plantilla === 'compacta' && activa.doble && lista[i + 1];
  if (usarDoble) semanas.push(prepararSemanaPlantilla(lista[i + 1]));
  else activa.doble = false;
  return {
    ...estado,
    semana: activa.semana,
    fecha: activa.fecha,
    titulo: activa.titulo,
    lectura: activa.lectura,
    reuniones: clonar(activa.reuniones),
    secciones: clonar(activa.secciones),
    extras: clonar(activa.extras),
    doble: !!usarDoble,
    semanas,
    semanaActiva: 0,
  };
}

let captura = 0;

/** html2canvas a veces no aplica <link rel=stylesheet>; inlinamos reglas locales. */
function asegurarCssInline(doc) {
  if (!doc || doc.getElementById('css-h2c')) return;
  const trozos = [];
  for (const sheet of doc.styleSheets) {
    let reglas;
    try {
      reglas = sheet.cssRules;
    } catch {
      continue; // CSS cross-origin (fuentes, etc.)
    }
    if (!reglas) continue;
    for (const regla of reglas) trozos.push(regla.cssText);
  }
  if (!trozos.length) return;
  const tag = doc.createElement('style');
  tag.id = 'css-h2c';
  tag.textContent = trozos.join('\n');
  doc.head.appendChild(tag);
}

function esperarHojasEstilo(doc, ms = 2000) {
  const links = [...doc.querySelectorAll('link[rel="stylesheet"]')];
  if (!links.length) return Promise.resolve();
  return Promise.all(links.map((link) => new Promise((resolve) => {
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    try { if (link.sheet) { fin(); return; } } catch { /* ignore */ }
    link.addEventListener('load', fin, { once: true });
    link.addEventListener('error', fin, { once: true });
    setTimeout(fin, ms);
  })));
}

async function proyectarCanvas(win) {
  const hoja = win.document.getElementById('hoja');
  const lienzo = $('#vista-canvas');
  if (!hoja || !lienzo || typeof win.html2canvas !== 'function') return;
  await esperarHojasEstilo(win.document);
  try {
    if (win.document.fonts?.ready) await win.document.fonts.ready;
  } catch { /* ignore */ }
  asegurarCssInline(win.document);
  // Dos frames para que layout/CSS queden aplicados antes del raster.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const id = ++captura;
  const pintado = await win.html2canvas(hoja, {
    scale: 1,
    backgroundColor: '#ffffff',
    width: HOJA_ANCHO,
    height: HOJA_ALTO,
    windowWidth: HOJA_ANCHO,
    windowHeight: HOJA_ALTO,
  });
  if (id !== captura) return;
  lienzo.width = pintado.width;
  lienzo.height = pintado.height;
  lienzo.getContext('2d').drawImage(pintado, 0, 0);
}

async function pintar() {
  const win = $('#vista').contentWindow;
  if (!win || typeof win.render !== 'function') return;
  try {
    // vista:false evita inundar el preview con «Nombre y apellido»; el form ya tiene placeholders.
    await win.render(datosParaPlantilla(), { vista: false });
    if (window.__PROD__) await proyectarCanvas(win);
  } catch (e) {
    console.error(e);
  }
  ajustarVista();
}

let pendiente = false;
let timerProd = 0;
function programarVista() {
  if (window.__PROD__) {
    clearTimeout(timerProd);
    timerProd = setTimeout(() => { pintar(); }, 180);
    return;
  }
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => { pendiente = false; pintar(); });
}

async function generarBlob() {
  const win = $('#vista').contentWindow;
  if (!win || typeof win.exportarPNG !== 'function') throw new Error('plantilla');
  return win.exportarPNG(datosParaPlantilla());
}

function nombreArchivo(ext = 'png') {
  const prefijo = estado.tipo === 'grupos' ? 'grupos' : estado.tipo === 'salidas' ? 'salidas' : 'programa';
  const fuente = estado.tipo === 'grupos'
    ? (estado.grupos?.titulo || estado.fecha || 'predicacion')
    : estado.tipo === 'salidas'
      ? (estado.salidas?.titulo || estado.fecha || 'predicacion')
      : (estado.fecha || 'programa');
  const base = String(fuente).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${prefijo}-${base || prefijo}.${ext}`;
}

function setMenuDescarga(abierto) {
  const btn = document.getElementById('btn-descargar');
  const lista = document.querySelector('.menu-descarga-lista');
  if (!btn || !lista) return;
  lista.hidden = !abierto;
  btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
}

function cerrarMenuDescarga() {
  setMenuDescarga(false);
}

let jspdfPromise = null;

function cargarJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jspdfPromise) {
    jspdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
      script.onload = () => {
        if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jspdf'));
      };
      script.onerror = () => reject(new Error('jspdf'));
      document.head.appendChild(script);
    }).catch((error) => {
      jspdfPromise = null;
      throw error;
    });
  }
  return jspdfPromise;
}

function blobADataURL(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

async function generarPdfBlob() {
  const png = await generarBlob();
  if (!png) throw new Error('vacío');
  const JsPDF = await cargarJsPDF();
  const dataUrl = await blobADataURL(png);
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.addImage(dataUrl, 'PNG', 0, 0, pageW, pageH);
  while (doc.getNumberOfPages() > 1) doc.deletePage(doc.getNumberOfPages());
  return doc.output('blob');
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

async function iniciar() {
  document.documentElement.classList.toggle('prod', !!window.__PROD__);
try {
  const prueba = new File([''], 'x.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [prueba] })) $('#btn-compartir').hidden = false;
} catch { /* sin soporte */ }
  await cargarIndice();
guardarNombres();
renderFormulario();
  iniciarPreviewZoom();
  cargarPlantilla(estado.plantilla);
  window.addEventListener('resize', ajustarVista);
}

iniciar();
