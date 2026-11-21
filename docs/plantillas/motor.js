const params = new URLSearchParams(location.search);
const tipo = params.get('tipo') || '';
const id = params.get('id') || '';
const base = /^[a-z0-9-]+$/.test(tipo) && /^[a-z0-9-]+$/.test(id) ? `${tipo}/${id}` : '';

const cssLink = document.getElementById('css');

/** html2canvas a veces ignora <link> recién seteado; inyectamos el CSS como <style>. */
async function cargarEstilos() {
  if (!base || !cssLink) return;
  const url = `${base}/plantilla.css`;
  cssLink.href = url;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error('css');
    const texto = await res.text();
    let tag = document.getElementById('css-inline');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'css-inline';
      document.head.appendChild(tag);
    }
    tag.textContent = texto;
  } catch {
    // Fallback: esperar el <link>
    await new Promise((resolve) => {
      let listo = false;
      const fin = () => {
        if (listo) return;
        listo = true;
        resolve();
      };
      cssLink.addEventListener('load', fin, { once: true });
      cssLink.addEventListener('error', fin, { once: true });
      try {
        if (cssLink.sheet) fin();
      } catch {
        /* ignore */
      }
      setTimeout(fin, 1500);
    });
  }
}

const env = new nunjucks.Environment(new nunjucks.WebLoader(base), { autoescape: true });
const hoja = () => document.getElementById('hoja');

let preparar = () => ({});
let ajustar = null;
const listo = (async () => {
  if (!base) throw new Error('plantilla');
  await cargarEstilos();
  const vista = await import(`./${base}/vista.js`);
  preparar = vista.preparar;
  ajustar = typeof vista.ajustar === 'function' ? vista.ajustar : null;
})();

function htmlDe(modelo) {
  return new Promise((resolve, reject) => {
    env.render('plantilla.njk', modelo, (err, html) => (err ? reject(err) : resolve(html)));
  });
}

function frame() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

async function render(datos, opciones = {}) {
  await listo;
  const modelo = preparar(datos || {}, opciones || {});
  const root = hoja();
  root.innerHTML = await htmlDe(modelo);
  root.classList.toggle('doble', !!modelo.doble);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* ignore */
  }
  if (ajustar) await ajustar(root);
  await frame();
}

async function exportarPNG(datos) {
  await render(datos, { vista: false });
  if (typeof html2canvas !== 'function') throw new Error('html2canvas');
  const canvas = await html2canvas(hoja(), {
    scale: 2, backgroundColor: '#ffffff', width: 1240, height: 1754, windowWidth: 1240, windowHeight: 1754,
  });
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  await render(datos, { vista: true });
  return blob;
}

window.render = render;
window.exportarPNG = exportarPNG;
