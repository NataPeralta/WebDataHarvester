#!/usr/bin/env node
// Uso: node tools/crear-acceso.js <usuario> [clave]
// Si no se indica clave, se genera una al azar. Reescribe el bloque "acceso" de docs/config.js.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const usuario = process.argv[2];
if (!usuario) {
  console.error('Uso: node tools/crear-acceso.js <usuario> [clave]');
  process.exit(1);
}
const clave = process.argv[3] || crypto.randomBytes(9).toString('base64url');
const salt = crypto.randomBytes(16).toString('hex');
const iteraciones = 200000;
const hash = crypto.pbkdf2Sync(clave, salt, iteraciones, 32, 'sha256').toString('hex');

const archivo = path.join(__dirname, '..', 'docs', 'config.js');
const bloque = `acceso: {
    usuario: ${JSON.stringify(usuario)},
    salt: '${salt}',
    iteraciones: ${iteraciones},
    hash: '${hash}',
  },`;
const src = fs.readFileSync(archivo, 'utf8');
fs.writeFileSync(archivo, src.replace(/acceso: \{[\s\S]*?\n  \},/, bloque));

console.log(`Usuario: ${usuario}`);
console.log(`Clave:   ${clave}`);
console.log('docs/config.js actualizado. Hacé commit y push para aplicarlo.');
