// Uso: npm run crear-admin -- "Nombre" correo@ejemplo.com clave
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

(async () => {
  const [nombre, correo, clave] = process.argv.slice(2);
  if (!nombre || !correo || !clave) {
    console.log('Uso: npm run crear-admin -- "Nombre" correo@ejemplo.com clave');
    process.exit(1);
  }
  await db.query('INSERT INTO administrador (nombre, correo, contrasena_hash) VALUES (?,?,?)',
    [nombre, correo, await bcrypt.hash(clave, 10)]);
  console.log('Administrador creado.');
  process.exit(0);
})();
