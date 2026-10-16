const db = require('../config/db');
const ia = require('../services/ia');

async function construirSistema() {
  const [productos] = await db.query(
    `SELECT p.id_producto, p.nombre, p.precio, p.stock, c.nombre AS categoria
     FROM producto p JOIN categoria c ON c.id_categoria = p.id_categoria
     WHERE p.activo = 1 ORDER BY c.nombre, p.nombre`);
  const catalogo = productos
    .map((p) => `- [${p.id_producto}] ${p.nombre} (${p.categoria}): $${Number(p.precio).toLocaleString('es-CO')} COP, stock ${p.stock}`)
    .join('\n');
  return `Eres el asistente virtual de Bella Moda, una boutique de ropa en Medellín. Hablas en español, con tono amable, claro y mensajes cortos.
Puedes: informar sobre productos, precios, disponibilidad y horarios; tomar pedidos; consultar el estado de un pedido.
Horario de atención de la tienda: lunes a sábado, 9:00 a. m. a 7:00 p. m.
Reglas:
- Usa SOLO el catálogo de abajo. No inventes productos, precios ni stock.
- Solo ofrece productos con stock mayor a 0. Si no hay stock, sugiere alternativas.
- Para registrar un pedido pide nombre y teléfono, muestra el resumen con el total, y pide confirmación.
- Antes de guardar datos personales, el cliente debe aceptar el tratamiento de sus datos (Ley 1581 de 2012).
- No procesas pagos. Si el cliente pide hablar con una persona o no puedes resolver, usa escalar_a_humano.
Catálogo actual:
${catalogo}`;
}

async function ejecutarHerramienta(nombre, input, idConversacion) {
  if (nombre === 'escalar_a_humano') {
    await db.query("UPDATE conversacion SET estado = 'escalada' WHERE id_conversacion = ?", [idConversacion]);
    return { ok: true, mensaje: 'Conversación escalada a un administrador.' };
  }

  if (nombre === 'consultar_pedido') {
    const [rows] = await db.query(
      `SELECT p.id_pedido, p.estado, p.total, p.fecha FROM pedido p
       JOIN cliente c ON c.id_cliente = p.id_cliente
       WHERE p.id_pedido = ? AND c.telefono = ?`, [input.id_pedido, input.telefono]);
    return rows[0] || { error: 'No se encontró un pedido con ese número y teléfono.' };
  }

  if (nombre === 'crear_pedido') {
    if (!input.acepta_datos) throw new Error('El cliente debe aceptar el tratamiento de datos.');
    if (!input.items?.length) throw new Error('El pedido no tiene productos.');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO cliente (nombre, telefono, acepta_datos) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), acepta_datos = 1`,
        [input.nombre, input.telefono]);
      const [[cli]] = await conn.query('SELECT id_cliente FROM cliente WHERE telefono = ?', [input.telefono]);
      let total = 0;
      const lineas = [];
      for (const it of input.items) {
        const [[prod]] = await conn.query(
          'SELECT id_producto, nombre, precio, stock FROM producto WHERE id_producto = ? AND activo = 1 FOR UPDATE',
          [it.id_producto]);
        if (!prod) throw new Error(`El producto ${it.id_producto} no existe.`);
        if (it.cantidad < 1 || prod.stock < it.cantidad) throw new Error(`Sin stock suficiente de ${prod.nombre}.`);
        total += Number(prod.precio) * it.cantidad;
        lineas.push({ ...it, precio: prod.precio });
      }
      const [ped] = await conn.query('INSERT INTO pedido (total, id_cliente) VALUES (?, ?)', [total, cli.id_cliente]);
      for (const l of lineas) {
        await conn.query(
          'INSERT INTO detalle_pedido (cantidad, precio_unitario, id_pedido, id_producto) VALUES (?,?,?,?)',
          [l.cantidad, l.precio, ped.insertId, l.id_producto]);
        await conn.query('UPDATE producto SET stock = stock - ? WHERE id_producto = ?', [l.cantidad, l.id_producto]);
      }
      await conn.query('UPDATE conversacion SET id_cliente = ? WHERE id_conversacion = ?', [cli.id_cliente, idConversacion]);
      await conn.commit();
      return { ok: true, id_pedido: ped.insertId, total };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  throw new Error('Herramienta desconocida.');
}

exports.chat = async (req, res) => {
  try {
    const mensaje = String(req.body.mensaje || '').trim().slice(0, 1000);
    if (!mensaje) return res.status(400).json({ error: 'Mensaje vacío.' });

    let id = Number(req.body.id_conversacion) || null;
    if (!id) {
      const [r] = await db.query("INSERT INTO conversacion (canal) VALUES ('web')");
      id = r.insertId;
    }
    const [[conv]] = await db.query('SELECT estado FROM conversacion WHERE id_conversacion = ?', [id]);
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada.' });
    await db.query("INSERT INTO mensaje (contenido, emisor, id_conversacion) VALUES (?, 'cliente', ?)", [mensaje, id]);

    if (conv.estado === 'escalada') {
      return res.json({ id_conversacion: id, respuesta: 'Un asesor de Bella Moda te responderá pronto.', escalada: true });
    }

    const [hist] = await db.query(
      'SELECT contenido, emisor FROM mensaje WHERE id_conversacion = ? ORDER BY id_mensaje DESC LIMIT 20', [id]);
    const historial = hist.reverse().map((m) => ({
      role: m.emisor === 'cliente' ? 'user' : 'assistant', content: m.contenido,
    }));

    const respuesta = await ia.responder({
      system: await construirSistema(),
      historial,
      ejecutarHerramienta: (n, i) => ejecutarHerramienta(n, i, id),
    });
    await db.query("INSERT INTO mensaje (contenido, emisor, id_conversacion) VALUES (?, 'bot', ?)", [respuesta, id]);
    const [[c2]] = await db.query('SELECT estado FROM conversacion WHERE id_conversacion = ?', [id]);
    res.json({ id_conversacion: id, respuesta, escalada: c2.estado === 'escalada' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No pude procesar tu mensaje. Intenta de nuevo.' });
  }
};
