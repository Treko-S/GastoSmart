<?php
include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../models/Expense.php';

class ExpenseController {
    private $db;
    private $expense;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->expense = new Expense($this->db);
    }

    public function getDashboardData($usuario_id) {
        $this->expense->usuario_id = $usuario_id;
        
        $totalResult = $this->expense->getTotalStats();
        $total_usd = isset($totalResult['total_usd']) ? (float)$totalResult['total_usd'] : 0.0;
        $total_pyg = isset($totalResult['total_pyg']) ? (float)$totalResult['total_pyg'] : 0.0;
        $total = $total_usd;

        $categoriesResult = $this->expense->getCategoryStats();
        $chartData = [
            'labels' => [],
            'colors' => [],
            'data' => []
        ];
        
        while ($row = $categoriesResult->fetch(PDO::FETCH_ASSOC)) {
            $chartData['labels'][] = $row['nombre'];
            $chartData['colors'][] = $row['color'];
            $chartData['data'][] = (float)$row['total'];
        }

        $recentResult = $this->expense->getRecent();
        $recentExpenses = [];
        while ($row = $recentResult->fetch(PDO::FETCH_ASSOC)) {
            $recentExpenses[] = $row;
        }
        
        $catsResult = $this->expense->getCategories();
        $categories = [];
        while ($row = $catsResult->fetch(PDO::FETCH_ASSOC)) {
            $categories[] = $row;
        }

        $evolutionResult = $this->expense->getEvolutionStats();
        $dbMonths = [];
        while ($row = $evolutionResult->fetch(PDO::FETCH_ASSOC)) {
            $dbMonths[$row['mes']] = $row;
        }

        $mesesEspanol = [
            '01' => 'Ene', '02' => 'Feb', '03' => 'Mar', '04' => 'Abr',
            '05' => 'May', '06' => 'Jun', '07' => 'Jul', '08' => 'Ago',
            '09' => 'Set', '10' => 'Oct', '11' => 'Nov', '12' => 'Dic'
        ];

        $evolutionData = [
            'labels' => [],
            'data' => [],
            'data_pyg' => []
        ];

        for ($i = 5; $i >= 0; $i--) {
            $time = strtotime("-$i months");
            $key = date('Y-m', $time);
            $monthNum = date('m', $time);
            $year = date('Y', $time);
            $label = ($mesesEspanol[$monthNum] ?? date('M', $time)) . ' ' . $year;

            $totalUsd = isset($dbMonths[$key]['total']) ? (float)$dbMonths[$key]['total'] : 0.0;
            $totalPyg = round($totalUsd * 7500);

            $evolutionData['labels'][] = $label;
            $evolutionData['data'][] = round($totalUsd, 2);
            $evolutionData['data_pyg'][] = $totalPyg;
        }

        return [
            'total' => $total,
            'total_usd' => $total_usd,
            'total_pyg' => $total_pyg,
            'chart' => $chartData,
            'evolution' => $evolutionData,
            'recent' => $recentExpenses,
            'categories' => $categories
        ];
    }

    public function createExpense($data, $usuario_id) {
        if (!empty($data->monto) && !empty($data->descripcion) && !empty($data->categoria_id) && !empty($data->fecha)) {
            $this->expense->usuario_id = $usuario_id;
            $this->expense->monto = $data->monto;
            $this->expense->moneda = !empty($data->moneda) && strtoupper($data->moneda) === 'PYG' ? 'PYG' : 'USD';
            $this->expense->descripcion = $data->descripcion;
            $this->expense->fecha = $data->fecha;
            $this->expense->categoria_id = $data->categoria_id;

            if ($this->expense->create()) {
                return ['success' => true, 'message' => 'Gasto creado correctamente.'];
            } else {
                return ['success' => false, 'message' => 'No se pudo crear el gasto.'];
            }
        } else {
            return ['success' => false, 'message' => 'Datos incompletos.'];
        }
    }

    public function getHistoryData($usuario_id, $period) {
        $this->expense->usuario_id = $usuario_id;
        $result = $this->expense->getHistory($period);
        $expenses = [];
        $total_usd = 0;
        $total_pyg = 0;
        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            $expenses[] = $row;
            if (($row['moneda'] ?? 'USD') === 'PYG') {
                $total_pyg += (float)$row['monto'];
            } else {
                $total_usd += (float)$row['monto'];
            }
        }
        return [
            'success' => true,
            'total' => $total_usd,
            'total_usd' => $total_usd,
            'total_pyg' => $total_pyg,
            'history' => $expenses
        ];
    }

    public function exportCSV($usuario_id, $period) {
        $this->expense->usuario_id = $usuario_id;
        $result = $this->expense->getHistory($period);
        
        $filename = "gastos_{$period}_" . date('Ymd') . ".csv";
        
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=' . $filename);
        
        $output = fopen('php://output', 'w');
        fputcsv($output, array('ID', 'Monto', 'Moneda', 'Descripcion', 'Categoria', 'Fecha'));
        
        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($output, array(
                $row['id'], 
                $row['monto'], 
                $row['moneda'] ?? 'USD',
                $row['descripcion'], 
                $row['categoria_nombre'], 
                $row['fecha']
            ));
        }
        fclose($output);
        exit();
    }
}
?>
