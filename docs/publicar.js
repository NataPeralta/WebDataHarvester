'use strict';

/* Publicación: escribe en el repo (carpeta docs/publicados) usando la API de GitHub con un token personal.
   Se apoya en variables y funciones de admin.js (estado, generarBlob, esc, toast, clonar, renderFormulario, cambio). */

const KEY_TOKEN = 'programa-semanal:token:v1';
const API = 'https://api.github.com';

const tokenGuardado = () => { try { return localStorage.getItem(KEY_TOKEN) || ''; } catch { return ''; } };

function cfgRepo() {
  const { owner, repo, branch, carpeta } = window.CONFIG;
  return { owner, repo, branch, carpeta, base: `${API}/repos/${owner}/${repo}/contents` };
}

async function gh(url, opciones = {}) {
  const token = tokenGuardado();
  if (!token) throw new Error('Falta el token de GitHub. Cargalo en “Conexión con GitHub”.');
  const r = await fetch(url, {
    ...opciones,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (r.status === 401) throw new Error('El token no es válido o venció.');
  if (r.status === 403) throw new Error('El token no tiene permiso para escribir en el repositorio (Contents: Read and write).');
  return r;
}

const aBase64Texto = (txt) => {
  const bytes = new TextEncoder().encode(txt);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const deBase64Texto = (b64) => {
  const bin = atob(b64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
const blobABase64 = (blob) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(String(fr.result).split(',')[1]);
  fr.onerror = rej;
  fr.readAsDataURL(blob);
});

async function leerArchivo(ruta) {
  const { base, branch } = cfgRepo();
  const r = await gh(`${base}/${ruta}?ref=${encodeURIComponent(branch)}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub respondió ${r.status}.`);
  return r.json();
}

async function escribirArchivo(ruta, contenidoB64, mensaje) {
  const { base, branch } = cfgRepo();
  const previo = await leerArchivo(ruta);
  const r = await gh(`${base}/${ruta}`, {
    method: 'PUT',
    body: JSON.stringify({ message: mensaje, content: contenidoB64, branch, ...(previo ? { sha: previo.sha } : {}) }),
  });
  if (!r.ok) throw new Error(`No se pudo guardar ${ruta} (${r.status}).`);
}

async function borrarArchivo(ruta, mensaje) {
  const { base, branch } = cfgRepo();
  const previo = await leerArchivo(ruta);
  if (!previo) return;
  const r = await gh(`${base}/${ruta}`, {
    method: 'DELETE',
    body: JSON.stringify({ message: mensaje, sha: previo.sha, branch }),
  });
  if (!r.ok) throw new Error(`No se pudo borrar ${ruta} (${r.status}).`);
}

async function leerIndice() {
  const { carpeta } = cfgRepo();
  const f = await leerArchivo(`${carpeta}/index.json`);
  if (!f) return { items: [] };
  try { return JSON.parse(deBase64Texto(f.content)); } catch { return { items: [] }; }
}

async function guardarIndice(indice, mensaje) {
  const { carpeta } = cfgRepo();
  indice.items.sort((a, b) => (b.semana || b.publicado || '').localeCompare(a.semana || a.publicado || ''));
  await escribirArchivo(`${carpeta}/index.json`, aBase64Texto(JSON.stringify(indice, null, 2)), mensaje);
}

function idDeSemana(s) {
  if (s.semana) return s.semana;
  const slug = (s.fecha || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || `programa-${Date.now()}`;
}

/* ---------- Acciones ---------- */

const $p = (s) => document.querySelector(s);
const setEstado = (id, msg, error = false) => {
  const el = $p(id);
  el.textContent = msg;
  el.classList.toggle('error', error);
};

let ocupado = false;
async function conBloqueo(fn, estadoId) {
  if (ocupado) return;
  ocupado = true;
  document.querySelectorAll('[data-pub]').forEach((b) => { b.disabled = true; });
  try { await fn(); } catch (e) { setEstado(estadoId, e.message || String(e), true); } finally {
    ocupado = false;
    document.querySelectorAll('[data-pub]').forEach((b) => { b.disabled = false; });
  }
}

async function publicar() {
  const id = idDeSemana(estado);
  const { carpeta } = cfgRepo();
  setEstado('#pub-estado', 'Revisando lo ya publicado…');
  const indice = await leerIndice();
  const existente = indice.items.find((i) => i.id === id);
  if (existente && !confirm(`Ya hay un programa publicado para "${existente.fecha}". ¿Reemplazarlo?`)) {
    setEstado('#pub-estado', 'Publicación cancelada.');
    return;
  }

  setEstado('#pub-estado', 'Generando imagen…');
  const blob = await generarBlob();
  const datos = JSON.stringify(estado, null, 2);

  setEstado('#pub-estado', 'Subiendo imagen…');
  await escribirArchivo(`${carpeta}/${id}.png`, await blobABase64(blob), `Publicar programa ${estado.fecha}`);
  await escribirArchivo(`${carpeta}/${id}.json`, aBase64Texto(datos), `Datos del programa ${estado.fecha}`);

  const item = { id, semana: estado.semana || '', fecha: estado.fecha, titulo: estado.titulo,
    imagen: `${id}.png`, publicado: new Date().toISOString() };
  indice.items = indice.items.filter((i) => i.id !== id).concat(item);
  setEstado('#pub-estado', 'Actualizando listado…');
  await guardarIndice(indice, `Actualizar listado (${estado.fecha})`);

  setEstado('#pub-estado', '✔ Publicado. Puede tardar uno o dos minutos en verse en el sitio.');
  toast('Programa publicado');
  await refrescarLista();
}

function filaPublicada(i) {
  return `
    <div class="pub-item">
      <div class="pub-datos">
        <strong>${esc(i.fecha || i.id)}</strong>
        <small>${esc(new Date(i.publicado).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' }))}</small>
      </div>
      <div class="pub-botones">
        <a class="btn small" href="publicados/${encodeURIComponent(i.imagen)}" target="_blank" rel="noopener">Ver</a>
        <button type="button" class="btn small" data-pub="editar" data-id="${esc(i.id)}">Editar</button>
        <button type="button" class="btn small danger" data-pub="despublicar" data-id="${esc(i.id)}">Despublicar</button>
      </div>
    </div>`;
}

async function refrescarLista() {
  const cont = $p('#pub-lista');
  if (!tokenGuardado()) {
    cont.innerHTML = '<p class="hint">Cargá el token de GitHub para ver y administrar lo publicado.</p>';
    $p('#card-token').open = true;
    return;
  }
  try {
    const { items } = await leerIndice();
    cont.innerHTML = items.length ? items.map(filaPublicada).join('') : '<p class="hint">Todavía no hay nada publicado.</p>';
  } catch (e) {
    cont.innerHTML = `<p class="hint error">${esc(e.message)}</p>`;
  }
}

async function despublicar(id) {
  const { carpeta } = cfgRepo();
  const indice = await leerIndice();
  const item = indice.items.find((i) => i.id === id);
  if (!item || !confirm(`¿Despublicar "${item.fecha}"? Dejará de verse en el listado público.`)) return;
  setEstado('#pub-estado', 'Despublicando…');
  indice.items = indice.items.filter((i) => i.id !== id);
  await guardarIndice(indice, `Despublicar ${item.fecha}`);
  await borrarArchivo(`${carpeta}/${id}.png`, `Quitar imagen ${item.fecha}`);
  await borrarArchivo(`${carpeta}/${id}.json`, `Quitar datos ${item.fecha}`);
  setEstado('#pub-estado', '✔ Despublicado.');
  await refrescarLista();
}

async function editar(id) {
  const { carpeta } = cfgRepo();
  setEstado('#pub-estado', 'Cargando programa…');
  const f = await leerArchivo(`${carpeta}/${id}.json`);
  if (!f) throw new Error('No se encontraron los datos de ese programa.');
  estado = JSON.parse(deBase64Texto(f.content));
  renderFormulario();
  cambio();
  setEstado('#pub-estado', 'Programa cargado en la planilla. Al publicar, reemplaza al anterior.');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function guardarToken() {
  const valor = $p('#token').value.trim();
  if (!valor) { setEstado('#token-estado', 'Pegá el token primero.', true); return; }
  try { localStorage.setItem(KEY_TOKEN, valor); } catch { setEstado('#token-estado', 'Este navegador no permite guardar el token.', true); return; }
  setEstado('#token-estado', 'Probando conexión…');
  const { owner, repo } = cfgRepo();
  const r = await gh(`${API}/repos/${owner}/${repo}`);
  if (!r.ok) { localStorage.removeItem(KEY_TOKEN); throw new Error('El token no tiene acceso a este repositorio.'); }
  const d = await r.json();
  if (d.permissions && !d.permissions.push) { localStorage.removeItem(KEY_TOKEN); throw new Error('El token solo puede leer; necesita Contents: Read and write.'); }
  $p('#token').value = '';
  setEstado('#token-estado', '✔ Conexión correcta. Token guardado en este navegador.');
  await refrescarLista();
}

function quitarToken() {
  try { localStorage.removeItem(KEY_TOKEN); } catch { /* ignorar */ }
  $p('#token').value = '';
  setEstado('#token-estado', 'Token quitado de este navegador.');
  refrescarLista();
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pub]');
  if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.pub) {
    case 'publicar': conBloqueo(publicar, '#pub-estado'); break;
    case 'refrescar': conBloqueo(refrescarLista, '#pub-estado'); break;
    case 'despublicar': conBloqueo(() => despublicar(id), '#pub-estado'); break;
    case 'editar': conBloqueo(() => editar(id), '#pub-estado'); break;
    case 'guardar-token': conBloqueo(guardarToken, '#token-estado'); break;
    case 'quitar-token': quitarToken(); break;
    default:
  }
});

window.addEventListener('panel-abierto', refrescarLista);
