CREATE DATABASE IF NOT EXISTS gasto_smart;
USE gasto_smart;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS transacciones;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('user', 'admin') DEFAULT 'user',
    whatsapp_numero VARCHAR(30) DEFAULT NULL,
    whatsapp_frecuencia ENUM('none', 'semanal', 'quincenal', 'mensual') DEFAULT 'none',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    icono VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL
);

CREATE TABLE transacciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    monto DECIMAL(14, 2) NOT NULL,
    moneda VARCHAR(5) NOT NULL DEFAULT 'USD',
    descripcion VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    categoria_id INT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Insertar algunas categorías por defecto
INSERT INTO categorias (nombre, icono, color) VALUES
('Comida', 'fas fa-utensils', '#F59E0B'),
('Súper', 'fas fa-shopping-cart', '#3B82F6'),
('Ocio', 'fas fa-gamepad', '#8B5CF6'),
('Transporte', 'fas fa-car', '#10B981'),
('Salud', 'fas fa-heartbeat', '#EF4444');
