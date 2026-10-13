<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

session_start();
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

include_once '../config/database.php';
$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'get') {
    $stmt = $db->prepare("SELECT email, whatsapp_numero, whatsapp_frecuencia FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['usuario_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $user]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    if ($action === 'update_account') {
        $updates = [];
        $params = [];
        
        if (!empty($data->email)) {
            $updates[] = "email = ?";
            $params[] = $data->email;
        }
        
        if (!empty($data->password)) {
            $updates[] = "password = ?";
            $params[] = password_hash($data->password, PASSWORD_BCRYPT);
        }
        
        if (count($updates) > 0) {
            $params[] = $_SESSION['usuario_id'];
            $sql = "UPDATE usuarios SET " . implode(", ", $updates) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            if ($stmt->execute($params)) {
                echo json_encode(['success' => true, 'message' => 'Cuenta actualizada']);
                exit();
            }
        }
        echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
        exit();
    }
    
    if ($action === 'update_whatsapp') {
        $numero = $data->numero ?? '';
        $frecuencia = $data->frecuencia ?? 'none';
        
        $stmt = $db->prepare("UPDATE usuarios SET whatsapp_numero = ?, whatsapp_frecuencia = ? WHERE id = ?");
        if ($stmt->execute([$numero, $frecuencia, $_SESSION['usuario_id']])) {
            echo json_encode(['success' => true, 'message' => 'Preferencias de WhatsApp guardadas']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al guardar preferencias']);
        }
        exit();
    }
}
?>
