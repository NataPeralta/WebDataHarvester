'use strict';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function aISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function esActual(item) {
  if (!item.semana) return false;
  const hoy = aISO(new Date());
  const [y, m, d] = item.semana.split('-').map(Number);
  const fin = aISO(new Date(y, m - 1, d + 6));
  return hoy >= item.semana && hoy <= fin;
}

function tarjeta(item) {
  return `
    <button type="button" class="tarjeta" data-id="${esc(item.id)}">
      <img src="publicados/${encodeURIComponent(item.imagen)}" alt="Programa ${esc(item.fecha)}" loading="lazy">
      <span class="tarjeta-info">
        <strong>${esc(item.fecha || item.id)}</strong>
        ${item.titulo ? `<small>${esc(item.titulo)}</small>` : ''}
      </span>
    </button>`;
}

let items = [];

function abrir(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const src = `publicados/${encodeURIComponent(item.imagen)}`;
  $('#visor-titulo').textContent = item.fecha || item.id;
  $('#visor-img').src = src;
  $('#visor-img').alt = `Programa ${item.fecha}`;
  $('#visor-descargar').href = src;
  $('#visor-descargar').download = item.imagen;
  $('#visor').showModal();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('.tarjeta');
  if (t) return abrir(t.dataset.id);
  if (e.target === $('#visor')) $('#visor').close();
});

(async function iniciar() {
  const estado = $('#estado-galeria');
  try {
    const r = await fetch(`publicados/index.json?t=${Date.now()}`, { cache: 'no-store' });
    if (r.status === 404) throw Object.assign(new Error('vacío'), { vacio: true });
    if (!r.ok) throw new Error(r.status);
    items = (await r.json()).items || [];
  } catch (e) {
    estado.textContent = e.vacio
      ? 'Todavía no hay programas publicados.'
      : 'No se pudo cargar el listado. Probá recargar la página.';
    return;
  }
  if (!items.length) { estado.textContent = 'Todavía no hay programas publicados.'; return; }

  items.sort((a, b) => (b.semana || b.publicado || '').localeCompare(a.semana || a.publicado || ''));
  estado.hidden = true;

  const actual = items.find(esActual);
  if (actual) {
    $('#destacado').hidden = false;
    $('#destacado-card').innerHTML = tarjeta(actual);
  }
  $('#titulo-anteriores').hidden = false;
  $('#galeria').innerHTML = items.map(tarjeta).join('');
})();
