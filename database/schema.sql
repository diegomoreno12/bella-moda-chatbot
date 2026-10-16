-- Bella Moda - esquema MySQL (InnoDB)
CREATE DATABASE IF NOT EXISTS bella_moda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bella_moda;

CREATE TABLE cliente (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) NOT NULL UNIQUE,
  correo VARCHAR(100) NULL,
  acepta_datos TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE producto (
  id_producto INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
  stock INT NOT NULL CHECK (stock >= 0),
  activo TINYINT(1) NOT NULL DEFAULT 1,
  id_categoria INT NOT NULL,
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria)
) ENGINE=InnoDB;

CREATE TABLE pedido (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('pendiente','confirmado','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  total DECIMAL(12,2) NOT NULL,
  id_cliente INT NOT NULL,
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
) ENGINE=InnoDB;

CREATE TABLE detalle_pedido (
  id_detalle INT AUTO_INCREMENT PRIMARY KEY,
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  id_pedido INT NOT NULL,
  id_producto INT NOT NULL,
  FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido),
  FOREIGN KEY (id_producto) REFERENCES producto(id_producto)
) ENGINE=InnoDB;

-- id_cliente es opcional: la conversación empieza antes de que el cliente se registre al pedir.
CREATE TABLE conversacion (
  id_conversacion INT AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('activa','escalada','cerrada') NOT NULL DEFAULT 'activa',
  canal ENUM('web','whatsapp') NOT NULL DEFAULT 'web',
  id_cliente INT NULL,
  FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente)
) ENGINE=InnoDB;

CREATE TABLE mensaje (
  id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
  contenido TEXT NOT NULL,
  emisor ENUM('cliente','bot','admin') NOT NULL,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_conversacion INT NOT NULL,
  FOREIGN KEY (id_conversacion) REFERENCES conversacion(id_conversacion)
) ENGINE=InnoDB;

CREATE TABLE administrador (
  id_admin INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(100) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- Datos de ejemplo
INSERT INTO categoria (nombre) VALUES ('Vestidos'),('Blusas'),('Pantalones'),('Accesorios');
INSERT INTO producto (nombre, precio, stock, id_categoria) VALUES
 ('Vestido floral midi', 120000, 8, 1),
 ('Vestido negro de noche', 180000, 4, 1),
 ('Blusa de lino blanca', 65000, 12, 2),
 ('Jean tiro alto', 110000, 10, 3),
 ('Bolso de cuero', 95000, 5, 4);
