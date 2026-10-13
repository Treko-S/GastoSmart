<?php
include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../models/User.php';

class AuthController {
    private $db;
    private $user;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->user = new User($this->db);
    }

    public function register($nombre, $email, $password) {
        $this->user->nombre = $nombre;
        $this->user->email = $email;
        $this->user->password = $password;

        if($this->user->create()) {
            return ['success' => true, 'message' => 'Usuario registrado exitosamente.'];
        }
        return ['success' => false, 'message' => 'El correo ya está registrado o hubo un error.'];
    }

    public function login($email, $password) {
        $this->user->email = $email;
        $email_exists = $this->user->emailExists();

        if($email_exists && password_verify($password, $this->user->password)) {
            session_start();
            $_SESSION['usuario_id'] = $this->user->id;
            $_SESSION['nombre'] = $this->user->nombre;
            $_SESSION['rol'] = $this->user->rol;
            return ['success' => true, 'message' => 'Login exitoso.', 'rol' => $this->user->rol];
        }
        return ['success' => false, 'message' => 'Credenciales inválidas.'];
    }

    public function logout() {
        session_start();
        session_unset();
        session_destroy();
        return ['success' => true, 'message' => 'Sesión cerrada.'];
    }
}
?>
