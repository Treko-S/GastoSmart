<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['message' => 'No autorizado']);
    exit();
}

$usuario_id = $_SESSION['usuario_id'];

include_once '../controllers/ExpenseController.php';

$controller = new ExpenseController();

$method = $_SERVER['REQUEST_METHOD'];

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method == 'GET') {
    if ($action == 'history') {
        $period = isset($_GET['period']) ? $_GET['period'] : 'todos';
        $data = $controller->getHistoryData($usuario_id, $period);
        http_response_code(200);
        echo json_encode($data);
    } elseif ($action == 'export') {
        // Para CSV, quitamos el json content-type
        header_remove("Content-Type");
        $period = isset($_GET['period']) ? $_GET['period'] : 'todos';
        $controller->exportCSV($usuario_id, $period);
    } else {
        $data = $controller->getDashboardData($usuario_id);
        http_response_code(200);
        echo json_encode($data);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));
    $response = $controller->createExpense($data, $usuario_id);
    
    if ($response['success']) {
        http_response_code(201);
    } else {
        http_response_code(400);
    }
    echo json_encode($response);
} else {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
}
?>
