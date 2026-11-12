'use strict';

/* Acceso al panel. IMPORTANTE: es una barrera en el navegador, no seguridad real.
   Lo que de verdad protege la publicación es el token de GitHub (ver publicar.js). */
(function () {
  const A = window.CONFIG.acceso;
  const KEY = 'programa-semanal:sesion';
  const DURACION = 8 * 60 * 60 * 1000;
  const enc = new TextEncoder();

  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

  async function hashClave(clave) {
    const base = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(A.salt), iterations: A.iteraciones, hash: 'SHA-256' }, base, 256);
    return hex(bits);
  }

  const sesionValida = () => {
    try { return Number(sessionStorage.getItem(KEY)) > Date.now(); } catch { return false; }
  };
  const abrirSesion = () => { try { sessionStorage.setItem(KEY, String(Date.now() + DURACION)); } catch { /* ignorar */ } };
  const cerrarSesion = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignorar */ } };

  const $ = (s) => document.querySelector(s);
  function mostrar(adentro) {
    $('#acceso').hidden = adentro;
    $('#panel').hidden = !adentro;
    if (adentro) window.dispatchEvent(new Event('panel-abierto'));
  }

  let fallos = 0;
  $('#form-acceso').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#acceso-error');
    const btn = $('#form-acceso button[type="submit"]');
    msg.textContent = '';
    if (!A.hash) { msg.textContent = 'El acceso no está configurado.'; return; }
    btn.disabled = true;
    const usuario = $('#acceso-usuario').value.trim();
    const clave = $('#acceso-clave').value;
    let ok = false;
    try { ok = usuario === A.usuario && (await hashClave(clave)) === A.hash; } catch { msg.textContent = 'Este navegador no permite verificar la clave (se necesita HTTPS).'; btn.disabled = false; return; }
    if (ok) {
      fallos = 0;
      abrirSesion();
      $('#acceso-clave').value = '';
      mostrar(true);
    } else {
      fallos++;
      msg.textContent = 'Usuario o clave incorrectos.';
      await new Promise((r) => setTimeout(r, Math.min(fallos, 5) * 1000));
    }
    btn.disabled = false;
  });

  $('#btn-salir').addEventListener('click', () => { cerrarSesion(); mostrar(false); });

  mostrar(sesionValida());
})();
