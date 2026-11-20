const txt = (v) => String(v == null ? '' : v).trim();

const HOJA_ALTO = 1754;
const PAD_SUP = 40;
const PAD_INF = 36;
const ESCALA_MIN = 0.55;

function persona(valor, vista) {
  const texto = txt(valor);
  if (texto) return { texto, vacio: false };
  if (vista) return { texto: 'Nombre y apellido', vacio: true };
  return { texto: '', vacio: false };
}
function unidos(f, vista) {
  const a = txt(f?.nombre1);
  const b = txt(f?.nombre2);
  if (a && b) return { texto: `${a} / ${b}`, vacio: false };
  if (a || b) return { texto: a || b, vacio: false };
  return persona('', vista);
}
function conDosPuntos(valor) {
  const t = txt(valor);
  if (!t) return '';
  return /:\s*$/.test(t) ? t : `${t}:`;
}
function formatoMin(valor) {
  const t = txt(valor).replace(/[()（）]/g, '').trim();
  if (!t) return '';
  const reloj = t.match(/^(\d{1,2}:\d{2})/);
  if (reloj) return `${reloj[1]} min`;
  const n = t.match(/^(\d+)/);
  if (n) return `${n[1]} min`;
  return t;
}
function separarDuracion(texto, tiempo) {
  let s = txt(texto);
  let t = txt(tiempo);
  const ini = s.match(/^(\d{1,2}:\d{2}|\d+)\s*mins?\.?\s*[•●·]?\s*/i);
  const fin = s.match(/\s*\(\s*(\d{1,2}:\d{2}|\d+)\s*mins?\.?\s*\)\.?\s*$/i);
  if (ini && /^(\d{1,2}:\d{2}|\d+)\s*min/i.test(s)) {
    if (!t) t = ini[1];
    s = s.slice(ini[0].length);
  }
  if (fin) {
    if (!t) t = fin[1];
    s = s.slice(0, fin.index).trim();
  }
  s = s.replace(/^[•●·]\s*/, '').trim();
  return { tiempo: formatoMin(t), texto: s };
}
function esPieza(texto) {
  return /canci[oó]n|palabras de introducci[oó]n|palabras de conclusi[oó]n/i.test(texto);
}
function vineta(texto) {
  return txt(texto).replace(/^[•●]\s*/, '');
}
function sinNumero(texto) {
  return txt(texto).replace(/^\d+\s*[.)]\s+/, '');
}
function esEstudio(texto) {
  return /estudio b[ií]blico/i.test(texto);
}
function claseSeccion(sec) {
  const t = txt(sec && sec.titulo);
  if (/vida cristiana/i.test(t)) return 'vida';
  if (/maestros/i.test(t)) return 'maestros';
  if (/tesoros/i.test(t)) return 'tesoros';
  const c = txt(sec && sec.color).toLowerCase();
  if (c === '#7d0022' || c === '#7e0024') return 'vida';
  if (c === '#c18f00' || c === '#be8900') return 'maestros';
  if (c === '#575a5d') return 'tesoros';
  return 'otra';
}
function colorDe(sec) {
  const c = txt(sec && sec.color);
  const low = c.toLowerCase();
  const tipo = claseSeccion(sec || {});
  if (tipo === 'maestros') return (!c || low === '#c18f00') ? '#be8900' : c;
  if (tipo === 'vida') return (!c || low === '#7d0022') ? '#7e0024' : c;
  return c || '#575a5d';
}

/** Entrada de sala auxiliar con contenido real (ignora `{}` / strings vacíos). */
function entradaSalaUtil(a) {
  if (!a || typeof a !== 'object') return false;
  return !!(txt(a.nombre1) || txt(a.nombre2) || txt(a.etiqueta) || txt(a.texto));
}
function salasUtilesDe(f) {
  return (Array.isArray(f?.salaAuxiliar) ? f.salaAuxiliar : []).filter(entradaSalaUtil);
}
function marcarConSalas(fila, on) {
  if (!on || !fila) return fila;
  if (/\bcon-salas\b/.test(fila.clase || '')) return fila;
  return { ...fila, clase: `${fila.clase || 'fila'} con-salas`.trim() };
}

function pieza(tiempo, texto, conSalas = false) {
  return {
    clase: `fila${conSalas ? ' con-salas' : ''}`,
    pieza: true,
    tiempo: tiempo || '',
    texto: texto || '',
    textoClase: 'texto pieza',
  };
}
function filaNombres({ tiempo = '', texto = '', textoClase = 'texto', etiqueta = '', aux = null, principal = null, conSalas = false, clase = '' }) {
  return {
    clase: clase || (`fila${conSalas ? ' con-salas' : ''}`),
    pieza: false,
    tiempo,
    texto,
    textoClase,
    etiqueta,
    aux,
    principal,
  };
}

function cancionDe(valor, { vacioSiFalta = '' } = {}) {
  const sep = separarDuracion(valor, '');
  let texto = sep.texto;
  if (!texto) texto = vacioSiFalta;
  else if (!/canci[oó]n/i.test(texto)) texto = `Canción ${texto}`;
  return { tiempo: sep.tiempo, texto: vineta(texto) };
}

function filasDeParte(f, vista) {
  const sep = separarDuracion(f.texto, f.tiempo);
  const texto = sinNumero(sep.texto);
  const salas = salasUtilesDe(f);
  const tieneSala = salas.length > 0;
  if (!texto && !tieneSala) return [];
  const piezaFila = esPieza(texto);
  let etiqueta = conDosPuntos(f.etiqueta);
  if (!etiqueta && !piezaFila && (esEstudio(sep.texto || f.texto) || /conductor\s*\/\s*lector/i.test(txt(f.etiqueta)))) etiqueta = 'Conductor/Lector:';
  else if (!etiqueta && !piezaFila && /lectura de la biblia/i.test(sep.texto || f.texto || '')) etiqueta = 'Estudiante:';
  else if (!etiqueta && !piezaFila && f.dos) etiqueta = 'Estudiante:';
  if (piezaFila) return [pieza(sep.tiempo, vineta(texto))];
  const aux0 = salas[0];
  const etiqAux = aux0 ? (conDosPuntos(aux0.etiqueta) || etiqueta) : '';
  const filas = [filaNombres({
    tiempo: sep.tiempo,
    texto,
    etiqueta: etiqAux || etiqueta,
    aux: aux0 ? unidos(aux0, vista) : null,
    principal: unidos(f, vista),
    conSalas: !!aux0,
  })];
  salas.slice(1).forEach((a) => {
    filas.push(filaNombres({
      etiqueta: conDosPuntos(a.etiqueta) || etiqueta,
      aux: unidos(a, vista),
      principal: { texto: '', vacio: false },
      conSalas: true,
    }));
  });
  return filas;
}

function reunionDe(r, ri, vista) {
  const antes = [];
  const despues = [];
  if (ri === 0 && (txt(r.limpieza) || txt(r.presidente))) {
    antes.push(filaNombres({
      texto: txt(r.limpieza),
      textoClase: 'texto ocupa',
      etiqueta: 'Presidente:',
      principal: persona(r.presidente, vista),
    }));
  }
  if (txt(r.cancionInicio) || txt(r.oracionInicio)) {
    const cancion = cancionDe(r.cancionInicio);
    antes.push(filaNombres({
      tiempo: txt(r.cancionInicio) ? cancion.tiempo : '',
      texto: cancion.texto,
      textoClase: 'texto pieza',
      etiqueta: 'Oración:',
      principal: persona(r.oracionInicio, vista),
    }));
  }
  if (txt(r.introduccion)) {
    const intro = separarDuracion(r.introduccion, '');
    antes.push(pieza(intro.tiempo, vineta(intro.texto)));
  }

  const secciones = Array.isArray(r.secciones) ? r.secciones : [];
  const idxVida = secciones.findIndex((sec) => claseSeccion(sec) === 'vida');
  let mediaPuesta = false;
  const tomarMedia = () => {
    if (mediaPuesta || !txt(r.cancionIntermedia)) return null;
    mediaPuesta = true;
    const cancion = cancionDe(r.cancionIntermedia, { vacioSiFalta: 'Canción' });
    return pieza(cancion.tiempo, cancion.texto);
  };
  const seccionesVista = secciones.map((sec, i) => {
    const tipo = claseSeccion(sec);
    const conSalas = (tipo === 'tesoros' || tipo === 'maestros')
      && (sec.filas || []).some((f) => salasUtilesDe(f).length > 0);
    const cancion = (i === idxVida || /atalaya/i.test(txt(sec.titulo))) ? tomarMedia() : null;
    const filas = (sec.filas || []).flatMap((f) => filasDeParte(f, vista));
    return {
      titulo: sec.titulo || '',
      color: colorDe(sec),
      conSalas,
      cancion: marcarConSalas(cancion, conSalas),
      filas: filas.map((f) => marcarConSalas(f, conSalas)),
    };
  });

  if (txt(r.conclusion)) {
    const conclusion = separarDuracion(r.conclusion, '');
    despues.push(pieza(conclusion.tiempo, vineta(conclusion.texto)));
  }
  if (txt(r.cancionFinal) || txt(r.oracionFinal)) {
    const finalSep = cancionDe(r.cancionFinal);
    despues.push(filaNombres({
      tiempo: txt(r.cancionFinal) ? finalSep.tiempo : '',
      texto: finalSep.texto,
      textoClase: 'texto pieza',
      etiqueta: 'Oración:',
      principal: persona(r.oracionFinal, vista),
    }));
  }

  const titulo = txt(r.titulo);
  return {
    primera: ri === 0,
    titulo: ri === 0 ? (titulo || 'Programa para la reunión') : (titulo || (vista ? 'Reunión' : '')),
    tituloVacio: ri !== 0 && !titulo && vista,
    presidente: persona(r.presidente, vista),
    antes,
    secciones: seccionesVista,
    cancionSuelta: tomarMedia(),
    despues,
  };
}

export function preparar(datos, opciones = {}) {
  const vista = !!opciones.vista;
  const d = datos || {};
  const lista = Array.isArray(d.semanas) && d.semanas.length
    ? d.semanas.map((sem) => ({ ...sem, congregacion: d.congregacion || sem.congregacion }))
    : [{ ...d, congregacion: d.congregacion }];
  return {
    doble: lista.length > 1,
    semanas: lista.map((week, wi) => {
      const segundo = txt(week.lectura) || txt(week.titulo);
      const fechaTxt = [txt(week.fecha), segundo].filter(Boolean).join(' | ');
      const cong = txt(week.congregacion || d.congregacion);
      const reuniones = (Array.isArray(week.reuniones) ? week.reuniones : []).filter(Boolean);
      return {
        separador: wi > 0,
        fecha: (fechaTxt || vista) ? { texto: fechaTxt || 'Fecha | Lectura', vacio: !fechaTxt && vista } : null,
        cong: wi === 0 && (cong || vista) ? { texto: cong || 'Nombre de la congregación', vacio: !cong && vista } : null,
        reuniones: reuniones.map((r, ri) => reunionDe(r, ri, vista)),
      };
    }),
  };
}

/**
 * Si el contenido cabe, reparte el sobrante en `.espacio-centro` (hoja doble).
 * Si desborda 1754px, colapsa el spacer y escala como s-140 / programa-semanal.
 */
export async function ajustar(hojaEl) {
  const cont = hojaEl && hojaEl.querySelector('#contenido');
  if (!cont) return;
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  } catch (_) { /* ignore */ }

  cont.style.transform = 'none';
  const spacers = [...cont.querySelectorAll('.espacio-centro')];
  spacers.forEach((s) => {
    s.style.flex = 'none';
    s.style.minHeight = '0';
    s.style.height = '0px';
  });

  const usable = HOJA_ALTO - PAD_SUP - PAD_INF;
  const natural = cont.scrollHeight;

  if (natural <= usable + 0.5) {
    const sobra = Math.max(0, usable - natural);
    const cada = spacers.length ? sobra / spacers.length : 0;
    spacers.forEach((s) => {
      s.style.height = `${cada}px`;
    });
    return;
  }

  const k = Math.max(ESCALA_MIN, usable / Math.max(1, natural));
  cont.style.transform = `scale(${k})`;
}
