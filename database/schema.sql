-- ==========================================================
-- GastoSmart - Esquema de Base de Datos para Supabase (PostgreSQL)
-- Copia y pega este contenido en el SQL Editor de Supabase
-- ==========================================================

-- Extensión para generación de UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
    limite_mensual_usd NUMERIC(12, 2) DEFAULT 100.00,
    moneda_principal VARCHAR(5) DEFAULT 'USD' CHECK (moneda_principal IN ('USD', 'PYG', 'EUR', 'BRL', 'ARS')),
    notificaciones_email BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Categorías de Gastos
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    icono VARCHAR(50) DEFAULT 'fa-tags',
    color VARCHAR(20) DEFAULT '#10B981'
);

-- Inserción de Categorías por defecto
INSERT INTO categorias (nombre, icono, color) VALUES
('Alimentación', 'fa-utensils', '#F59E0B'),
('Transporte', 'fa-car', '#3B82F6'),
('Vivienda & Servicios', 'fa-home', '#8B5CF6'),
('Entretenimiento', 'fa-gamepad', '#EC4899'),
('Salud & Farmacia', 'fa-heartbeat', '#EF4444'),
('Educación', 'fa-graduation-cap', '#10B981'),
('Ropa & Compras', 'fa-shopping-bag', '#06B6D4'),
('Otros', 'fa-ellipsis-h', '#6B7280')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Tabla de Transacciones / Gastos
CREATE TABLE IF NOT EXISTS transacciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria_id INT NOT NULL REFERENCES categorias(id),
    descripcion VARCHAR(255) NOT NULL,
    monto NUMERIC(14, 2) NOT NULL CHECK (monto > 0),
    moneda VARCHAR(5) DEFAULT 'USD' CHECK (moneda IN ('USD', 'PYG', 'EUR', 'BRL', 'ARS')),
    monto_usd NUMERIC(14, 2) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Auditoría y Alertas por Correo
CREATE TABLE IF NOT EXISTS registro_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'bienvenida', 'limite_superado', 'reporte_mensual'
    destinatario VARCHAR(150) NOT NULL,
    asunto VARCHAR(255) NOT NULL,
    enviado_en TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índices de Alto Rendimiento
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_fecha ON transacciones(usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_categoria ON transacciones(categoria_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- 6. Usuarios de Prueba (Hash bcrypt para contraseñas de testing)
-- Admin: admin@gastos.com / Contraseña: password123 ($2b$10$wT0X8zR52g0g4Wz2fX1h8.x0.GqHkL0Kz9wPz.vN.BqHkL0Kz9wP)
-- Demo: demo@gastos.com / Contraseña: password123
INSERT INTO usuarios (nombre, email, password_hash, rol, limite_mensual_usd) VALUES
('Administrador', 'admin@gastos.com', '$2a$10$eE61H2p7mC6Bv0q8u61vO.zF2d3m5tJ7l8h0r9w4x6b8n0v2x4z6m', 'admin', 5000.00),
('Usuario Demo', 'demo@gastos.com', '$2a$10$eE61H2p7mC6Bv0q8u61vO.zF2d3m5tJ7l8h0r9w4x6b8n0v2x4z6m', 'usuario', 1200.00)
ON CONFLICT (email) DO NOTHING;
