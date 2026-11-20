import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origen = path.join(root, 'docs');
const destino = path.join(root, 'dist');

fs.rmSync(destino, { recursive: true, force: true });
fs.cpSync(origen, destino, { recursive: true });
fs.writeFileSync(
  path.join(destino, 'env.js'),
  'window.__PROD__ = true;\n',
);
console.log('dist listo');
