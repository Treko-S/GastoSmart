USE gasto_smart;
UPDATE usuarios SET password = '$2y$10$IWm1v2mion43IPdUzS99z.wngoJwFbEolk.aNG0Wq109DjYDzXxxa' WHERE email IN ('admin@gastos.com', 'prueba@gastos.com');
