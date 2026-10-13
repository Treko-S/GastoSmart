<?php
require_once 'config/database.php';

$db = new Database();
$conn = $db->getConnection();

echo "<h2>Iniciando poblado de datos (Seed)...</h2>";

try {
    // 1. Limpiar tablas
    $conn->exec("SET FOREIGN_KEY_CHECKS = 0");
    $conn->exec("TRUNCATE TABLE transacciones");
    $conn->exec("TRUNCATE TABLE categorias");
    $conn->exec("TRUNCATE TABLE usuarios");
    $conn->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "<p>Tablas limpiadas.</p>";

    // 2. Insertar Usuarios (1 Admin, 1 User normal)
    $stmtUser = $conn->prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES (:nombre, :email, :password, :rol)");
    
    // Admin
    $pwdAdmin = password_hash('123456', PASSWORD_BCRYPT);
    $stmtUser->execute([
        ':nombre' => 'Administrador',
        ':email' => 'admin@gastos.com',
        ':password' => $pwdAdmin,
        ':rol' => 'admin'
    ]);
    $adminId = $conn->lastInsertId();
    echo "<p>Usuario admin insertado: admin@gastos.com / 123456</p>";

    // Usuario de prueba (Juan)
    $pwdUser = password_hash('123456', PASSWORD_BCRYPT);
    $stmtUser->execute([
        ':nombre' => 'Juan Pérez',
        ':email' => 'juan@gastos.com',
        ':password' => $pwdUser,
        ':rol' => 'user'
    ]);
    $userId = $conn->lastInsertId();
    echo "<p>Usuario normal insertado: juan@gastos.com / 123456</p>";

    // Usuario documentado (Fabri)
    $stmtUser->execute([
        ':nombre' => 'Fabrizio Test',
        ':email' => 'fabri@test.com',
        ':password' => $pwdUser,
        ':rol' => 'user'
    ]);
    $fabriId = $conn->lastInsertId();
    echo "<p>Usuario documentado insertado: fabri@test.com / 123456</p>";

    // 3. Insertar Categorías
    $stmtCat = $conn->prepare("INSERT INTO categorias (nombre, color, icono) VALUES (:nombre, :color, :icono)");
    $categorias = [
        ['nombre' => 'Comida', 'color' => '#10B981', 'icono' => 'fas fa-hamburger'], // Green
        ['nombre' => 'Transporte', 'color' => '#F59E0B', 'icono' => 'fas fa-car'], // Yellow
        ['nombre' => 'Supermercado', 'color' => '#3B82F6', 'icono' => 'fas fa-shopping-cart'], // Blue
        ['nombre' => 'Ocio', 'color' => '#8B5CF6', 'icono' => 'fas fa-gamepad'], // Purple
    ];
    
    $catIds = [];
    foreach ($categorias as $cat) {
        $stmtCat->execute([
            ':nombre' => $cat['nombre'],
            ':color' => $cat['color'],
            ':icono' => $cat['icono']
        ]);
        $catIds[] = $conn->lastInsertId();
    }
    echo "<p>Categorías insertadas.</p>";

    // 4. Insertar Gastos de prueba distribuidos en los últimos 6 meses
    $stmtGasto = $conn->prepare("INSERT INTO transacciones (usuario_id, categoria_id, monto, moneda, descripcion, fecha) VALUES (:usuario_id, :categoria_id, :monto, :moneda, :descripcion, :fecha)");

    // Función auxiliar para calcular fecha relativa
    $getDate = function($monthsAgo, $day = 12) {
        $time = strtotime("-$monthsAgo months");
        $year = date('Y', $time);
        $month = date('m', $time);
        $maxDays = date('t', $time);
        $d = min($day, (int)$maxDays);
        return sprintf('%s-%s-%02d', $year, $month, $d);
    };

    // Datos distribuidos para Juan (Usuario Regular)
    $gastosUser = [
        // Mes -5
        ['usuario_id' => $userId, 'categoria_id' => $catIds[0], 'monto' => 25.00, 'moneda' => 'USD', 'descripcion' => 'Almuerzo buffet', 'fecha' => $getDate(5, 10)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[1], 'monto' => 35000.00, 'moneda' => 'PYG', 'descripcion' => 'Pasajes colectivos', 'fecha' => $getDate(5, 18)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[2], 'monto' => 280000.00, 'moneda' => 'PYG', 'descripcion' => 'Compras del súper', 'fecha' => $getDate(5, 25)],
        
        // Mes -4
        ['usuario_id' => $userId, 'categoria_id' => $catIds[0], 'monto' => 40.00, 'moneda' => 'USD', 'descripcion' => 'Cena de cumpleaños', 'fecha' => $getDate(4, 8)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[3], 'monto' => 22.00, 'moneda' => 'USD', 'descripcion' => 'Cine y golosinas', 'fecha' => $getDate(4, 15)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[2], 'monto' => 350000.00, 'moneda' => 'PYG', 'descripcion' => 'Despensa mensual', 'fecha' => $getDate(4, 22)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[1], 'monto' => 45000.00, 'moneda' => 'PYG', 'descripcion' => 'Carga de combustible', 'fecha' => $getDate(4, 28)],

        // Mes -3
        ['usuario_id' => $userId, 'categoria_id' => $catIds[0], 'monto' => 30.00, 'moneda' => 'USD', 'descripcion' => 'Almuerzos oficina', 'fecha' => $getDate(3, 5)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[1], 'monto' => 55000.00, 'moneda' => 'PYG', 'descripcion' => 'Mantenimiento bicicleta', 'fecha' => $getDate(3, 14)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[2], 'monto' => 300000.00, 'moneda' => 'PYG', 'descripcion' => 'Surtido semanal', 'fecha' => $getDate(3, 20)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[3], 'monto' => 15.00, 'moneda' => 'USD', 'descripcion' => 'Juego online', 'fecha' => $getDate(3, 26)],

        // Mes -2 (Mes con mayor volumen)
        ['usuario_id' => $userId, 'categoria_id' => $catIds[2], 'monto' => 550000.00, 'moneda' => 'PYG', 'descripcion' => 'Gran compra supermercado', 'fecha' => $getDate(2, 6)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[0], 'monto' => 65.00, 'moneda' => 'USD', 'descripcion' => 'Cena familiar', 'fecha' => $getDate(2, 12)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[3], 'monto' => 45.00, 'moneda' => 'USD', 'descripcion' => 'Concierto música', 'fecha' => $getDate(2, 19)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[1], 'monto' => 80000.00, 'moneda' => 'PYG', 'descripcion' => 'Viajes en Uber', 'fecha' => $getDate(2, 27)],

        // Mes -1
        ['usuario_id' => $userId, 'categoria_id' => $catIds[0], 'monto' => 45.00, 'moneda' => 'USD', 'descripcion' => 'Cafetería y meriendas', 'fecha' => $getDate(1, 4)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[1], 'monto' => 40000.00, 'moneda' => 'PYG', 'descripcion' => 'Combustible moto', 'fecha' => $getDate(1, 11)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[2], 'monto' => 420000.00, 'moneda' => 'PYG', 'descripcion' => 'Supermercado quincena', 'fecha' => $getDate(1, 18)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[3], 'monto' => 30.00, 'moneda' => 'USD', 'descripcion' => 'Salida fin de semana', 'fecha' => $getDate(1, 26)],

        // Mes 0 (Este mes)
        ['usuario_id' => $userId, 'categoria_id' => $catIds[0], 'monto' => 20.00, 'moneda' => 'USD', 'descripcion' => 'Desayuno café', 'fecha' => $getDate(0, 2)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[1], 'monto' => 25000.00, 'moneda' => 'PYG', 'descripcion' => 'Pasaje de bus', 'fecha' => $getDate(0, 5)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[2], 'monto' => 150000.00, 'moneda' => 'PYG', 'descripcion' => 'Supermercado local', 'fecha' => $getDate(0, 8)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[3], 'monto' => 18.00, 'moneda' => 'USD', 'descripcion' => 'Suscripción streaming', 'fecha' => $getDate(0, 10)],
        ['usuario_id' => $userId, 'categoria_id' => $catIds[0], 'monto' => 40000.00, 'moneda' => 'PYG', 'descripcion' => 'Almuerzo laboral', 'fecha' => $getDate(0, 12)],
    ];

    foreach ($gastosUser as $g) {
        $stmtGasto->execute($g);
    }
    echo "<p>Gastos de los últimos 6 meses insertados para Juan (" . count($gastosUser) . " transacciones).</p>";

    // Gastos distribuidos para el Admin
    $gastosAdmin = [
        ['usuario_id' => $adminId, 'categoria_id' => $catIds[0], 'monto' => 60.00, 'moneda' => 'USD', 'descripcion' => 'Almuerzo corporativo', 'fecha' => $getDate(5, 14)],
        ['usuario_id' => $adminId, 'categoria_id' => $catIds[2], 'monto' => 220000.00, 'moneda' => 'PYG', 'descripcion' => 'Insumos de oficina', 'fecha' => $getDate(4, 18)],
        ['usuario_id' => $adminId, 'categoria_id' => $catIds[1], 'monto' => 85.00, 'moneda' => 'USD', 'descripcion' => 'Combustible camioneta', 'fecha' => $getDate(3, 11)],
        ['usuario_id' => $adminId, 'categoria_id' => $catIds[3], 'monto' => 120000.00, 'moneda' => 'PYG', 'descripcion' => 'Reunión de equipo', 'fecha' => $getDate(2, 22)],
        ['usuario_id' => $adminId, 'categoria_id' => $catIds[0], 'monto' => 75.00, 'moneda' => 'USD', 'descripcion' => 'Cena con clientes', 'fecha' => $getDate(1, 15)],
        ['usuario_id' => $adminId, 'categoria_id' => $catIds[2], 'monto' => 310000.00, 'moneda' => 'PYG', 'descripcion' => 'Súper mensual', 'fecha' => $getDate(0, 7)],
    ];

    foreach ($gastosAdmin as $g) {
        $stmtGasto->execute($g);
    }
    echo "<p>Gastos de prueba insertados para el Admin.</p>";

    // Gastos para Fabrizio
    $gastosFabri = [
        ['usuario_id' => $fabriId, 'categoria_id' => $catIds[0], 'monto' => 35.00, 'moneda' => 'USD', 'descripcion' => 'Almuerzo gourmet', 'fecha' => $getDate(2, 10)],
        ['usuario_id' => $fabriId, 'categoria_id' => $catIds[2], 'monto' => 280000.00, 'moneda' => 'PYG', 'descripcion' => 'Supermercado quincenal', 'fecha' => $getDate(1, 12)],
        ['usuario_id' => $fabriId, 'categoria_id' => $catIds[1], 'monto' => 15.00, 'moneda' => 'USD', 'descripcion' => 'Uber al centro', 'fecha' => $getDate(0, 9)],
    ];

    foreach ($gastosFabri as $g) {
        $stmtGasto->execute($g);
    }
    echo "<p>Gastos de prueba insertados para Fabrizio.</p>";

    echo "<h3 style='color:green;'>¡Poblado de datos exitoso!</h3>";
    echo "<a href='login.php'>Ir al Login</a>";

} catch (PDOException $e) {
    echo "<h3 style='color:red;'>Error en la base de datos: " . $e->getMessage() . "</h3>";
}
?>
