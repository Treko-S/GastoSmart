USE gasto_smart;

-- User de prueba (password es '123456')
INSERT INTO usuarios (nombre, email, password, rol) 
VALUES ('Prueba User', 'prueba@gastos.com', '$2y$10$rY2Iu.x5yO2P45U2x2g07.vO/.O.mYf.R5i3mP.12xO75O2L2tM.O', 'user')
ON DUPLICATE KEY UPDATE nombre='Prueba User';

-- Transacciones para el user de prueba
INSERT INTO transacciones (usuario_id, categoria_id, monto, descripcion, fecha) 
VALUES ((SELECT id FROM usuarios WHERE email='prueba@gastos.com'), 1, 150.00, 'Almuerzo de trabajo', '2026-10-01');

INSERT INTO transacciones (usuario_id, categoria_id, monto, descripcion, fecha) 
VALUES ((SELECT id FROM usuarios WHERE email='prueba@gastos.com'), 2, 50.00, 'Supermercado', '2026-10-02');

INSERT INTO transacciones (usuario_id, categoria_id, monto, descripcion, fecha) 
VALUES ((SELECT id FROM usuarios WHERE email='prueba@gastos.com'), 4, 30.00, 'Taxi al centro', '2026-10-01');

-- Transacciones para el admin que creamos antes (si existe)
INSERT INTO transacciones (usuario_id, categoria_id, monto, descripcion, fecha) 
VALUES ((SELECT id FROM usuarios WHERE email='admin@gastos.com'), 1, 25.00, 'Cafe', '2026-10-05');

INSERT INTO transacciones (usuario_id, categoria_id, monto, descripcion, fecha) 
VALUES ((SELECT id FROM usuarios WHERE email='admin@gastos.com'), 4, 10.00, 'Bus', '2026-10-05');
