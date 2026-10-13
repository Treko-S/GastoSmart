<?php
class Expense {
    private $conn;
    private $table_name = "transacciones";

    public $id;
    public $usuario_id;
    public $monto;
    public $moneda = 'USD';
    public $descripcion;
    public $fecha;
    public $categoria_id;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . " (usuario_id, monto, moneda, descripcion, fecha, categoria_id) VALUES (:usuario_id, :monto, :moneda, :descripcion, :fecha, :categoria_id)";
        $stmt = $this->conn->prepare($query);

        $this->usuario_id = htmlspecialchars(strip_tags($this->usuario_id));
        $this->monto = htmlspecialchars(strip_tags($this->monto));
        $this->moneda = !empty($this->moneda) && strtoupper($this->moneda) === 'PYG' ? 'PYG' : 'USD';
        $this->descripcion = htmlspecialchars(strip_tags($this->descripcion));
        $this->fecha = htmlspecialchars(strip_tags($this->fecha));
        $this->categoria_id = htmlspecialchars(strip_tags($this->categoria_id));

        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->bindParam(":monto", $this->monto);
        $stmt->bindParam(":moneda", $this->moneda);
        $stmt->bindParam(":descripcion", $this->descripcion);
        $stmt->bindParam(":fecha", $this->fecha);
        $stmt->bindParam(":categoria_id", $this->categoria_id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function getRecent() {
        $query = "SELECT t.id, t.monto, COALESCE(t.moneda, 'USD') as moneda, t.descripcion, t.fecha, c.nombre as categoria_nombre, c.icono, c.color 
                  FROM " . $this->table_name . " t
                  LEFT JOIN categorias c ON t.categoria_id = c.id
                  WHERE t.usuario_id = :usuario_id
                  ORDER BY t.fecha DESC, t.id DESC LIMIT 10";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->execute();
        return $stmt;
    }

    public function getTotalStats() {
        $query = "SELECT 
                    COALESCE(SUM(CASE WHEN COALESCE(moneda, 'USD') = 'USD' THEN monto ELSE 0 END), 0) as total_usd,
                    COALESCE(SUM(CASE WHEN COALESCE(moneda, 'USD') = 'PYG' THEN monto ELSE 0 END), 0) as total_pyg,
                    COALESCE(SUM(monto), 0) as total
                  FROM " . $this->table_name . " 
                  WHERE usuario_id = :usuario_id AND MONTH(fecha) = MONTH(CURRENT_DATE()) AND YEAR(fecha) = YEAR(CURRENT_DATE())";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function getCategoryStats() {
        $query = "SELECT c.nombre, c.color, 
                         SUM(CASE WHEN COALESCE(t.moneda, 'USD') = 'PYG' THEN t.monto / 7500.0 ELSE t.monto END) as total 
                  FROM " . $this->table_name . " t
                  JOIN categorias c ON t.categoria_id = c.id
                  WHERE t.usuario_id = :usuario_id AND MONTH(t.fecha) = MONTH(CURRENT_DATE()) AND YEAR(t.fecha) = YEAR(CURRENT_DATE())
                  GROUP BY c.id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->execute();
        return $stmt;
    }

    public function getEvolutionStats() {
        $query = "SELECT DATE_FORMAT(fecha, '%Y-%m') as mes, 
                         SUM(CASE WHEN COALESCE(moneda, 'USD') = 'PYG' THEN monto / 7500.0 ELSE monto END) as total,
                         SUM(CASE WHEN COALESCE(moneda, 'USD') = 'USD' THEN monto ELSE 0 END) as total_usd_raw,
                         SUM(CASE WHEN COALESCE(moneda, 'USD') = 'PYG' THEN monto ELSE 0 END) as total_pyg_raw
                  FROM " . $this->table_name . "
                  WHERE usuario_id = :usuario_id AND fecha >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
                  GROUP BY mes
                  ORDER BY mes ASC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->execute();
        return $stmt;
    }
    
    public function getCategories() {
        $query = "SELECT id, nombre FROM categorias ORDER BY nombre";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function getHistory($period = 'todos') {
        $dateFilter = "";
        if ($period === 'mes') {
            $dateFilter = "AND MONTH(t.fecha) = MONTH(CURRENT_DATE()) AND YEAR(t.fecha) = YEAR(CURRENT_DATE())";
        } elseif ($period === 'semana') {
            $dateFilter = "AND YEARWEEK(t.fecha, 1) = YEARWEEK(CURRENT_DATE(), 1)";
        } elseif ($period === 'quincena') {
            $dateFilter = "AND t.fecha >= DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY)";
        }

        $query = "SELECT t.id, t.monto, COALESCE(t.moneda, 'USD') as moneda, t.descripcion, t.fecha, c.nombre as categoria_nombre, c.icono, c.color 
                  FROM " . $this->table_name . " t
                  LEFT JOIN categorias c ON t.categoria_id = c.id
                  WHERE t.usuario_id = :usuario_id $dateFilter
                  ORDER BY t.fecha DESC, t.id DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->execute();
        return $stmt;
    }
}
?>
