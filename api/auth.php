<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../controllers/AuthController.php';

$controller = new AuthController();
$action = isset($_GET['action']) ? $_GET['action'] : '';
$data = json_decode(file_get_contents("php://input"));

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if ($action == 'register') {
        if (!empty($data->nombre) && !empty($data->email) && !empty($data->password)) {
            $response = $controller->register($data->nombre, $data->email, $data->password);
            echo json_encode($response);
        } else {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
        }
    } elseif ($action == 'login') {
        if (!empty($data->email) && !empty($data->password)) {
            $response = $controller->login($data->email, $data->password);
            echo json_encode($response);
        } else {
            echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] == 'GET' && $action == 'logout') {
    $controller->logout();
    header("Location: ../index.php");
    exit();
} else {
    echo json_encode(['message' => 'Acción no válida']);
}
?>
