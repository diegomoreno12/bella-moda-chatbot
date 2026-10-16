const router = require('express').Router();
const chat = require('../controllers/chatController');
const admin = require('../controllers/adminController');
const auth = require('../middleware/auth');

// Rutas públicas
router.post('/chat', chat.chat);
router.post('/admin/login', admin.login);

// Rutas del panel (requieren token)
router.use('/admin', auth);
router.get('/admin/productos', admin.listarProductos);
router.post('/admin/productos', admin.crearProducto);
router.put('/admin/productos/:id', admin.editarProducto);
router.get('/admin/pedidos', admin.listarPedidos);
router.patch('/admin/pedidos/:id', admin.cambiarEstadoPedido);
router.get('/admin/conversaciones', admin.listarConversaciones);
router.get('/admin/conversaciones/:id/mensajes', admin.verMensajes);
router.post('/admin/conversaciones/:id/responder', admin.responderEscalada);

module.exports = router;
