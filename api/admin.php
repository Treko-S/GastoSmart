<?php
header("Content-Type: application/json; charset=UTF-8");
session_start();

if(!isset($_SESSION['usuario_id']) || $_SESSION['rol'] !== 'admin'){
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado']);
    exit();
}

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

if($action == 'get_stats') {
    $stats = [];
    
    // Total users
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM usuarios");
    $stmt->execute();
    $stats['total_users'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total transactions
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM transacciones");
    $stmt->execute();
    $stats['total_transactions'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
    
    // Total volume
    $stmt = $db->prepare("SELECT 
        COALESCE(SUM(CASE WHEN COALESCE(moneda, 'USD') = 'USD' THEN monto ELSE 0 END), 0) as total_usd,
        COALESCE(SUM(CASE WHEN COALESCE(moneda, 'USD') = 'PYG' THEN monto ELSE 0 END), 0) as total_pyg,
        COALESCE(SUM(CASE WHEN COALESCE(moneda, 'USD') = 'PYG' THEN monto / 7500.0 ELSE monto END), 0) as total
        FROM transacciones");
    $stmt->execute();
    $vol = $stmt->fetch(PDO::FETCH_ASSOC);
    $stats['total_volume'] = $vol['total'];
    $stats['total_volume_usd'] = $vol['total_usd'];
    $stats['total_volume_pyg'] = $vol['total_pyg'];
    
    // Recent users
    $stmt = $db->prepare("SELECT id, nombre, email, rol, creado_en FROM usuarios ORDER BY creado_en DESC LIMIT 50");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'users' => $users
    ]);
} else {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Acción no encontrada']);
}
?>
