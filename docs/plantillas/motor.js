const params = new URLSearchParams(location.search);
const tipo = params.get('tipo') || '';
const id = params.get('id') || '';
const base = /^[a-z0-9-]+$/.test(tipo) && /^[a-z0-9-]+$/.test(id) ? `${tipo}/${id}` : '';

const css = document.getElementById('css');
if (base) css.href = `${base}/plantilla.css`;

const env = new nunjucks.Environment(new nunjucks.WebLoader(base), { autoescape: true });
const hoja = () => document.getElementById('hoja');

let preparar = () => ({});
let ajustar = null;
const listo = (async () => {
  if (!base) throw new Error('plantilla');
  const vista = await import(`./${base}/vista.js`);
  preparar = vista.preparar;
  ajustar = typeof vista.ajustar === 'function' ? vista.ajustar : null;
})();

function htmlDe(modelo) {
  return new Promise((resolve, reject) => {
    env.render('plantilla.njk', modelo, (err, html) => (err ? reject(err) : resolve(html)));
  });
}

async function render(datos, opciones = {}) {
  await listo;
  const modelo = preparar(datos || {}, opciones || {});
  const root = hoja();
  root.innerHTML = await htmlDe(modelo);
  root.classList.toggle('doble', !!modelo.doble);
  if (ajustar) await ajustar(root);
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
