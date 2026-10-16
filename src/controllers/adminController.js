const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.login = async (req, res) => {
  const { correo, contrasena } = req.body;
  const [[adm]] = await db.query('SELECT * FROM administrador WHERE correo = ?', [correo]);
  if (!adm || !(await bcrypt.compare(contrasena || '', adm.contrasena_hash))) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }
  const token = jwt.sign({ id: adm.id_admin }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, nombre: adm.nombre });
};

// Productos
exports.listarProductos = async (_req, res) => {
  const [rows] = await db.query(
    `SELECT p.*, c.nombre AS categoria FROM producto p
     JOIN categoria c ON c.id_categoria = p.id_categoria ORDER BY p.id_producto`);
  res.json(rows);
};
exports.crearProducto = async (req, res) => {
  const { nombre, precio, stock, id_categoria } = req.body;
  const [r] = await db.query(
    'INSERT INTO producto (nombre, precio, stock, id_categoria) VALUES (?,?,?,?)',
    [nombre, precio, stock, id_categoria]);
  res.status(201).json({ id_producto: r.insertId });
};
exports.editarProducto = async (req, res) => {
  const { nombre, precio, stock, id_categoria, activo } = req.body;
  await db.query(
    'UPDATE producto SET nombre=?, precio=?, stock=?, id_categoria=?, activo=? WHERE id_producto=?',
    [nombre, precio, stock, id_categoria, activo ?? 1, req.params.id]);
  res.json({ ok: true });
};

// Pedidos
exports.listarPedidos = async (_req, res) => {
  const [rows] = await db.query(
    `SELECT p.id_pedido, p.fecha, p.estado, p.total, c.nombre, c.telefono
     FROM pedido p JOIN cliente c ON c.id_cliente = p.id_cliente ORDER BY p.fecha DESC`);
  res.json(rows);
};
exports.cambiarEstadoPedido = async (req, res) => {
  await db.query('UPDATE pedido SET estado = ? WHERE id_pedido = ?', [req.body.estado, req.params.id]);
  res.json({ ok: true });
};

// Conversaciones
exports.listarConversaciones = async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM conversacion ORDER BY fecha_inicio DESC LIMIT 100');
  res.json(rows);
};
exports.verMensajes = async (req, res) => {
  const [rows] = await db.query(
    'SELECT emisor, contenido, fecha_hora FROM mensaje WHERE id_conversacion = ? ORDER BY id_mensaje', [req.params.id]);
  res.json(rows);
};
exports.responderEscalada = async (req, res) => {
  await db.query("INSERT INTO mensaje (contenido, emisor, id_conversacion) VALUES (?, 'admin', ?)", [req.body.mensaje, req.params.id]);
  res.json({ ok: true });
};
