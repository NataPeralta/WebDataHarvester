import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { obtenerProgramaSemana } from './scrape-semana.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCCION = process.env.NODE_ENV === 'production';
const PUBLIC = path.resolve(__dirname, PRODUCCION ? '../dist' : '../docs');
const PORT = Number(process.env.PORT) || 8097;

if (PRODUCCION && !fs.existsSync(path.join(PUBLIC, 'index.html'))) {
  console.error('Falta dist/. Ejecutá npm run build antes de iniciar en producción.');
  process.exit(1);
}

const app = express();

app.get('/api/salud', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/semana', async (req, res) => {
  const lunes = String(req.query.lunes || '').trim();
  if (!lunes) {
    res.status(400).json({ error: 'Falta ?lunes=YYYY-MM-DD' });
    return;
  }
  try {
    const datos = await obtenerProgramaSemana(lunes);
    // Cache más corta si el finde quedó parcial (canciones Atalaya faltantes).
    const maxAge = datos.parcial ? 60 : 3600;
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    res.json(datos);
  } catch (error) {
    const status = error.status || (error?.name === 'AbortError' ? 504 : 500);
    res.status(status).json({ error: error.message || 'Error al obtener la semana' });
  }
});

app.use(express.static(PUBLIC, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

app.get('*', (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`programa-semanal (${PRODUCCION ? 'dist' : 'docs'}) en http://0.0.0.0:${PORT}`);
});
