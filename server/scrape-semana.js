import * as cheerio from 'cheerio';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MES_IDX = Object.fromEntries(MESES.map((m, i) => [m, i]));

const UA = 'Mozilla/5.0 (compatible; ProgramaSemanal/1.0)';
/** Timeout por request a jw.org para que /api/semana no cuelgue. */
const FETCH_TIMEOUT_MS = 18000;

const COLOR = {
  TESOROS: '#575a5d',
  SEAMOS: '#c18f00',
  VIDA: '#7d0022',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function aISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function lunesDe(fecha) {
  const dia = fecha.getDay();
  const offset = dia === 0 ? -6 : 1 - dia;
  return addDays(fecha, offset);
}

function issueSlug(fecha) {
  const y = fecha.getFullYear();
  const m = fecha.getMonth();
  const pair = Math.floor(m / 2) * 2;
  return `${MESES[pair]}-${MESES[pair + 1]}-${y}-mwb`;
}

/** Arma el slug de la semana MWB a partir del lunes (p. ej. 23-a-29-de-noviembre-de-2026). */
function slugSemanaDesdeLunes(lunes) {
  const fin = addDays(lunes, 6);
  const di = lunes.getDate();
  const df = fin.getDate();
  const mi = MESES[lunes.getMonth()];
  const mf = MESES[fin.getMonth()];
  const yi = lunes.getFullYear();
  const yf = fin.getFullYear();
  if (yi === yf && lunes.getMonth() === fin.getMonth()) {
    return `${di}-a-${df}-de-${mi}-de-${yi}`;
  }
  if (yi === yf) {
    return `${di}-de-${mi}-a-${df}-de-${mf}-de-${yi}`;
  }
  return `${di}-de-${mi}-de-${yi}-a-${df}-de-${mf}-de-${yf}`;
}

function mwbBase(issue) {
  return `https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/${issue}`;
}

/** La Atalaya de estudio se publica ~2 meses antes de la semana de estudio. */
function atalayaIssueSlug(fecha, mesesAtras = 2) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth() - mesesAtras, 1);
  return `atalaya-estudio-${MESES[d.getMonth()]}-${d.getFullYear()}`;
}

function sinAcentos(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function mesIdx(nombre) {
  return MES_IDX[sinAcentos(nombre)] ?? null;
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Extrae description / og:description / “Semana del…” del HTML de un artículo. */
function extraerDescripcionAtalaya(html) {
  const patrones = [
    /name=["']description["']\s+content=["']([^"']*)["']/i,
    /content=["']([^"']*)["']\s+name=["']description["']/i,
    /property=["']og:description["']\s+content=["']([^"']*)["']/i,
    /content=["']([^"']*)["']\s+property=["']og:description["']/i,
  ];
  for (const p of patrones) {
    const m = html.match(p);
    if (m?.[1]) return decodeEntities(m[1]);
  }
  const cuerpo = html.match(/[Ss]emana del\s+[^.<]{8,120}/);
  return cuerpo ? decodeEntities(cuerpo[0]) : '';
}

function parseSemanaAtalaya(desc) {
  const t = limpia(decodeEntities(desc));
  if (!t) return null;

  // Mismo mes: "semana del 23 al 29 de noviembre de 2026"
  let m = t.match(/(?:semana\s+)?del\s+(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-záéíóúñü]+)\s+de\s+(\d{4})/i);
  if (m) {
    const mes = mesIdx(m[3]);
    if (mes == null) return null;
    return [new Date(+m[4], mes, +m[1]), new Date(+m[4], mes, +m[2])];
  }

  // Cruce de mes con dos años: "del 28 de diciembre de 2025 al 3 de enero de 2026"
  m = t.match(
    /(?:semana\s+)?del\s+(\d{1,2})\s+de\s+([a-záéíóúñü]+)\s+de\s+(\d{4})\s+al\s+(\d{1,2})\s+de\s+([a-záéíóúñü]+)\s+de\s+(\d{4})/i,
  );
  if (m) {
    const m1 = mesIdx(m[2]);
    const m2 = mesIdx(m[5]);
    if (m1 == null || m2 == null) return null;
    return [new Date(+m[3], m1, +m[1]), new Date(+m[6], m2, +m[4])];
  }

  // Cruce de mes, un año: "del 28 de diciembre al 3 de enero de 2026"
  m = t.match(
    /(?:semana\s+)?del\s+(\d{1,2})\s+de\s+([a-záéíóúñü]+)\s+al\s+(\d{1,2})\s+de\s+([a-záéíóúñü]+)\s+de\s+(\d{4})/i,
  );
  if (m) {
    const y = +m[5];
    const m1 = mesIdx(m[2]);
    const m2 = mesIdx(m[4]);
    if (m1 == null || m2 == null) return null;
    // Cruce de año: p. ej. 28 dic → 3 ene
    const y1 = m1 > m2 ? y - 1 : y;
    return [new Date(y1, m1, +m[1]), new Date(y, m2, +m[3])];
  }

  return null;
}

function extraerCancionesAtalaya(html) {
  const songs = [...html.matchAll(/CANCI[OÓ]N\s+(\d+)/gi)].map((x) => x[1]);
  // También formatos "Canción n.º 12" / "Canción núm. 12"
  if (songs.length < 2) {
    const alt = [...html.matchAll(/Canci[oó]n\s+(?:n\.?\s*º?\s*|n[uú]m\.?\s*)?(\d+)/gi)].map((x) => x[1]);
    for (const n of alt) {
      if (!songs.includes(n)) songs.push(n);
    }
  }
  return {
    intermedia: songs[0] || '',
    final: songs[1] || '',
  };
}

async function obtenerCancionesFinDeSemana(lunesReal) {
  const issues = [...new Set([
    atalayaIssueSlug(lunesReal, 2),
    atalayaIssueSlug(lunesReal, 1),
    atalayaIssueSlug(lunesReal, 3),
  ])];

  for (const issue of issues) {
    const tocUrl = `https://www.jw.org/es/biblioteca/revistas/${issue}/`;
    let tocHtml;
    try {
      tocHtml = await fetchHtml(tocUrl);
    } catch {
      continue;
    }

    const hrefs = [...new Set(
      [...tocHtml.matchAll(/href="([^"]+)"/g)]
        .map((x) => x[1])
        .filter((h) => h.includes(`/${issue}/`) && !h.endsWith(`/${issue}/`)),
    )];

    const articulos = await Promise.all(hrefs.map(async (href) => {
      const url = href.startsWith('http') ? href : `https://www.jw.org${href}`;
      try {
        const html = await fetchHtml(url);
        const desc = extraerDescripcionAtalaya(html);
        const rango = parseSemanaAtalaya(desc);
        if (!rango) return null;
        if (!enRango(lunesReal, rango[0], rango[1])) return null;
        const songs = extraerCancionesAtalaya(html);
        if (!songs.intermedia && !songs.final) return null;
        return { url, ...songs, ok: true };
      } catch {
        return null;
      }
    }));

    const hit = articulos.find(Boolean);
    if (hit) return hit;
  }

  return { intermedia: '', final: '', url: '', ok: false };
}

async function fetchHtml(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
    return await res.text();
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeout = new Error(`Timeout (${FETCH_TIMEOUT_MS / 1000}s) en ${url}`);
      timeout.status = 504;
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function rangoDesdeSlug(slugParte) {
  let m = slugParte.match(/^(\d+)-a-(\d+)-de-([a-z]+)-de-(\d{4})$/i);
  if (m) {
    const mes = MES_IDX[m[3].toLowerCase()];
    const y = +m[4];
    return [new Date(y, mes, +m[1]), new Date(y, mes, +m[2])];
  }
  m = slugParte.match(/^(\d+)-de-([a-z]+)-a-(\d+)-de-([a-z]+)-de-(\d{4})$/i);
  if (m) {
    const y = +m[5];
    return [
      new Date(y, MES_IDX[m[2].toLowerCase()], +m[1]),
      new Date(y, MES_IDX[m[4].toLowerCase()], +m[3]),
    ];
  }
  m = slugParte.match(/^(\d+)-de-([a-z]+)-de-(\d{4})-a-(\d+)-de-([a-z]+)-de-(\d{4})$/i);
  if (m) {
    return [
      new Date(+m[3], MES_IDX[m[2].toLowerCase()], +m[1]),
      new Date(+m[6], MES_IDX[m[5].toLowerCase()], +m[4]),
    ];
  }
  return null;
}

function enRango(dia, inicio, fin) {
  const t = dia.getTime();
  return t >= inicio.getTime() && t <= fin.getTime();
}

function colorSeccion(titulo) {
  const t = titulo.toUpperCase();
  if (t.includes('TESOROS')) return COLOR.TESOROS;
  if (t.includes('SEAMOS') || t.includes('MAESTROS')) return COLOR.SEAMOS;
  if (t.includes('VIDA')) return COLOR.VIDA;
  return COLOR.TESOROS;
}

function limpia(t) {
  return String(t || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarTiempo(raw) {
  const m = String(raw || '').match(/(\d+)\s*mins?\.?/i);
  return m ? `${m[1]} min` : '';
}

/** Busca "(10 mins.)" / "(1 min.)" en cualquier tramo de texto. */
function extraerMinutosDeTexto(texto) {
  const t = limpia(texto);
  if (!t) return '';
  const m = t.match(/\((\d+)\s*mins?\.?\)/i) || t.match(/\b(\d+)\s*mins?\b/i);
  return m ? `${m[1]} mins.` : '';
}

function etiquetaYDos(texto) {
  const t = texto.toLowerCase();
  if (/lectura de la biblia/.test(t)) return { etiqueta: 'Estudiante:', dos: false };
  if (/estudio b[ií]blico/.test(t)) return { etiqueta: 'Conductor/Lector:', dos: true };
  if (/empecemos conversaciones|hagamos revisitas|hagamos disc[ií]pulos|qu[eé] dir[ií]as/.test(t)) {
    return { etiqueta: '', dos: true };
  }
  return { etiqueta: '', dos: false };
}

function cancionFmt(n) {
  return n ? `3 min • Canción ${n}` : '';
}

function textoFechaCorto(inicio, fin) {
  const di = inicio.getDate();
  const df = fin.getDate();
  const mi = MESES[inicio.getMonth()];
  const mf = MESES[fin.getMonth()];
  if (inicio.getMonth() === fin.getMonth()) return `${di}-${df} de ${mi}`;
  return `${di} de ${mi}-${df} de ${mf}`;
}

function tiempoCerca($, el) {
  // 1) En el propio título (p. ej. "Palabras de conclusión (3 mins.)").
  const enTitulo = extraerMinutosDeTexto($(el).text());
  if (enTitulo) return enTitulo;

  // 2) Recorre nodos hermanos reales (en WOL el "(10 mins.)" va justo después del h3).
  let nodo = el.nextSibling;
  for (let i = 0; nodo && i < 10; i += 1, nodo = nodo.nextSibling) {
    const raw = nodo.type === 'text' ? nodo.data : $(nodo).text();
    const hit = extraerMinutosDeTexto(raw);
    if (hit) return hit;
  }

  // 3) Fallback: next() / nextAll() de cheerio.
  const candidatos = [];
  candidatos.push($(el).next().text());
  $(el).next().find('*').slice(0, 6).each((_, n) => {
    candidatos.push($(n).text());
  });
  $(el).nextAll().slice(0, 4).each((_, n) => {
    candidatos.push($(n).text());
  });
  for (const t of candidatos) {
    const hit = extraerMinutosDeTexto(t);
    if (hit) return hit;
  }
  return '';
}

function esParteNumerada(texto) {
  return /^\d+\.\s+/.test(texto);
}

function esSeccionPrograma(titulo) {
  const t = titulo.toUpperCase();
  return /TESOROS|SEAMOS MEJORES|NUESTRA VIDA/.test(t);
}

function extraerCanciones(html, fullText) {
  let inicio = '';
  let intermedia = '';
  let final = '';

  const mIni = fullText.match(/Canci[oó]n\s+(\d+)\s+y\s+oraci[oó]n\s*\|\s*Palabras de introducci[oó]n/i)
    || html.match(/Canci[oó]n\s+(\d+)\s+y\s+oraci[oó]n/i);
  if (mIni) inicio = mIni[1];

  const mFin = fullText.match(/Palabras de conclusi[oó]n[\s\S]{0,60}?Canci[oó]n\s+(\d+)/i)
    || html.match(/Palabras de conclusi[oó]n[\s\S]{0,120}?Canci[oó]n\s+(\d+)/i);
  if (mFin) final = mFin[1];

  const idx = html.search(/NUESTRA VIDA CRISTIANA/i);
  if (idx >= 0) {
    const slice = html.slice(Math.max(0, idx - 600), idx + 250);
    const songs = [...slice.matchAll(/Canci[oó]n\s+(\d+)/gi)].map((x) => x[1]);
    if (songs.length) intermedia = songs[songs.length - 1];
  }
  if (!intermedia) {
    const m = fullText.match(/NUESTRA VIDA CRISTIANA[\s\S]{0,160}?Canci[oó]n\s+(\d+)/i);
    if (m) intermedia = m[1];
  }

  return { inicio, intermedia, final };
}

function extraerLectura($) {
  let lectura = '';
  // La lectura semanal suele ser un h2 fuera de .bodyTxt (p. ej. "LAMENTACIONES 1, 2").
  $('h2').each((_, el) => {
    if (lectura) return;
    const t = limpia($(el).text()).replace(/\s*,\s*$/, '');
    if (esSeccionPrograma(t)) return;
    if (
      t.length > 3
      && t.length < 90
      && /^[A-ZÁÉÍÓÚÑ0-9 ,.;\-–]+$/.test(t)
      && !/CANCI|ORACI|INTRODUC|CONCLUS|TESOROS|SEAMOS|VIDA|GU[IÍ]A|ACTIVIDADES/i.test(t)
    ) {
      lectura = t;
    }
  });
  return lectura;
}

export async function obtenerProgramaSemana(lunesISO) {
  const lunesNorm = String(lunesISO || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lunesNorm)) {
    const err = new Error('lunes inválido');
    err.status = 400;
    throw err;
  }

  const lunesReal = lunesDe(parseISO(lunesNorm));
  const lunesKey = aISO(lunesReal);
  const slugSemana = slugSemanaDesdeLunes(lunesReal);
  const domingo = addDays(lunesReal, 6);

  const issues = [...new Set([
    issueSlug(lunesReal),
    issueSlug(domingo),
    issueSlug(addDays(lunesReal, -14)),
    issueSlug(addDays(lunesReal, 14)),
    issueSlug(addDays(lunesReal, -45)),
    issueSlug(addDays(lunesReal, 45)),
  ])];

  let semanaUrl = null;
  let rango = null;

  // 1) URL directa por slug (más fiable que depender solo del TOC).
  for (const issue of issues) {
    const direct = `${mwbBase(issue)}/Vida-y-Ministerio-Cristianos-${slugSemana}/`;
    try {
      const html = await fetchHtml(direct);
      if (/TESOROS DE LA BIBLIA|SEAMOS MEJORES|NUESTRA VIDA CRISTIANA/i.test(html)) {
        semanaUrl = direct;
        rango = [lunesReal, domingo];
        break;
      }
    } catch {
      // probar siguiente issue
    }
  }

  // 2) Fallback: TOC de cada revista y match por rango de fechas.
  if (!semanaUrl) {
    for (const issue of issues) {
      let html;
      try {
        html = await fetchHtml(`${mwbBase(issue)}/`);
      } catch {
        continue;
      }
      const hrefs = [...html.matchAll(/href="([^"]*Vida-y-Ministerio-Cristianos-[^"]+)"/g)].map((x) => x[1]);
      for (const href of new Set(hrefs)) {
        let parte = href.split('Vida-y-Ministerio-Cristianos-')[1]?.replace(/\/$/, '') || '';
        try { parte = decodeURIComponent(parte); } catch { /* ignore */ }
        const r = rangoDesdeSlug(parte);
        if (!r) continue;
        if (enRango(lunesReal, r[0], r[1])) {
          semanaUrl = href.startsWith('http') ? href : `https://www.jw.org${href}`;
          rango = r;
          break;
        }
      }
      if (semanaUrl) break;
    }
  }

  if (!semanaUrl) {
    const err = new Error(`No se encontró la guía para el lunes ${lunesKey}`);
    err.status = 404;
    throw err;
  }

  const html = await fetchHtml(semanaUrl);
  const $ = cheerio.load(html);
  const root = $('.bodyTxt').length ? $('.bodyTxt') : $.root();
  const fullText = limpia(root.text());
  const canciones = extraerCanciones(html, fullText);
  const lectura = extraerLectura($);
  const fechaTexto = rango ? textoFechaCorto(rango[0], rango[1]) : '';

  const secciones = [];
  let actual = null;
  let introMins = '1';
  let conclusMins = '3';

  root.find('h2, h3').each((_, el) => {
    const tag = (el.tagName || el.name || '').toLowerCase();
    const texto = limpia($(el).text());
    if (!texto) return;

    if (tag === 'h2') {
      if (!esSeccionPrograma(texto)) return;
      const titulo = texto.toUpperCase();
      actual = { titulo, color: colorSeccion(titulo), filas: [] };
      secciones.push(actual);
      return;
    }

    if (tag !== 'h3') return;

    // Canciones / intro / conclusión (no van numeradas).
    // Misma lógica que partes: minutos en el h3 o en siblings cercanos.
    if (/palabras de introducci[oó]n/i.test(texto)) {
      const m = tiempoCerca($, el);
      if (m) introMins = normalizarTiempo(m).replace(/ min$/, '') || introMins;
    }
    if (/palabras de conclusi[oó]n/i.test(texto)) {
      const m = tiempoCerca($, el);
      if (m) conclusMins = normalizarTiempo(m).replace(/ min$/, '') || conclusMins;
    }

    if (!actual || !esParteNumerada(texto)) return;

    // Tiempo desde el h3 o el bloque siguiente; el título queda sin "1." ni "(10 mins)".
    const tiempoRaw = tiempoCerca($, el) || extraerMinutosDeTexto(texto);
    const tiempo = normalizarTiempo(tiempoRaw);
    const tituloParte = texto
      .replace(/^\d+\.\s*/, '')
      .replace(/\s*\(\d+\s*mins?\.?\)\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const meta = etiquetaYDos(tituloParte);
    actual.filas.push({
      texto: tituloParte,
      tiempo,
      etiqueta: meta.etiqueta,
      nombre1: '',
      nombre2: '',
      dos: meta.dos,
    });
  });

  if (!secciones.length) {
    const err = new Error('No se pudo parsear el programa de la semana');
    err.status = 502;
    throw err;
  }

  const cancionesFinde = await obtenerCancionesFinDeSemana(lunesReal);
  const cancionesFindeOk = Boolean(cancionesFinde.ok);
  const advertencias = [];
  if (!cancionesFindeOk) {
    advertencias.push(
      'No se pudieron obtener cancionIntermedia/cancionFinal de fin de semana desde La Atalaya',
    );
  }

  return {
    fuente: semanaUrl,
    fuenteAtalaya: cancionesFinde.url || undefined,
    lunes: lunesKey,
    fechaTexto,
    lectura,
    titulo: 'LECTURA SEMANAL DE LA BIBLIA',
    /** true si el MWB salió bien pero faltan datos (p. ej. canciones del finde). */
    parcial: advertencias.length > 0,
    advertencias: advertencias.length ? advertencias : undefined,
    entreSemana: {
      titulo: 'Reunión de entre semana',
      cancionInicio: cancionFmt(canciones.inicio),
      introduccion: `${introMins} min • Palabras de introducción`,
      cancionIntermedia: cancionFmt(canciones.intermedia),
      conclusion: `${conclusMins} min • Palabras de conclusión`,
      cancionFinal: cancionFmt(canciones.final),
      secciones,
    },
    finDeSemana: {
      titulo: 'REUNIÓN DE FIN DE SEMANA',
      cancionIntermedia: cancionFmt(cancionesFinde.intermedia),
      cancionesDesdeAtalaya: cancionesFindeOk,
      secciones: [
        {
          titulo: 'DISCURSO PÚBLICO',
          color: '#1f4e79',
          filas: [
            { texto: 'Discurso público (30 mins).', tiempo: '30 min', etiqueta: 'Discursante:', nombre1: '', nombre2: '', dos: false },
          ],
        },
        {
          titulo: 'ESTUDIO DE LA ATALAYA',
          color: '#2e5a1c',
          filas: [
            { texto: 'Estudio de La Atalaya', tiempo: '60 min', etiqueta: 'Conductor/Lector:', nombre1: '', nombre2: '', dos: true },
          ],
        },
      ],
      cancionFinal: cancionFmt(cancionesFinde.final),
    },
  };
}
