<?php
session_start();
if(isset($_SESSION['usuario_id'])){
    header("Location: dashboard.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registro - GastoSmart</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'] },
                    colors: { primary: '#10B981', dark: '#0F172A' }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen p-4">
    <div class="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div class="text-center mb-8">
            <a href="index.php" class="inline-flex items-center justify-center mb-4">
                <img src="logo.png" alt="GastoSmart Logo" class="w-16 h-16 object-contain">
            </a>
            <h2 class="text-3xl font-bold text-dark">Crear Cuenta</h2>
            <p class="text-gray-500 mt-2">Únete a GastoSmart hoy mismo</p>
        </div>

        <form id="register-form" class="space-y-4">
            <div id="msg-box" class="hidden text-sm p-3 rounded-xl mb-4 text-center"></div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input type="text" id="nombre" required class="w-full rounded-xl border-gray-300 bg-gray-50 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white transition-colors">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input type="email" id="email" required class="w-full rounded-xl border-gray-300 bg-gray-50 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white transition-colors">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" id="password" required minlength="6" class="w-full rounded-xl border-gray-300 bg-gray-50 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white transition-colors">
            </div>
            
            <button type="submit" id="btn-submit" class="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition mt-6">
                Crear Cuenta
            </button>
        </form>

        <p class="text-center mt-8 text-gray-500 text-sm">
            ¿Ya tienes una cuenta? <a href="login.php" class="text-primary font-semibold hover:underline">Inicia sesión</a>
        </p>
    </div>

    <script>
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit');
            const msgBox = document.getElementById('msg-box');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
            msgBox.className = 'hidden text-sm p-3 rounded-xl mb-4 text-center';

            const payload = {
                nombre: document.getElementById('nombre').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            try {
                const res = await fetch('api/auth.php?action=register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if(data.success) {
                    msgBox.textContent = "Cuenta creada. Redirigiendo al login...";
                    msgBox.className = "bg-green-50 text-green-700 text-sm p-3 rounded-xl mb-4 text-center block";
                    setTimeout(() => window.location.href = 'login.php', 1500);
                } else {
                    msgBox.textContent = data.message;
                    msgBox.className = "bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center block";
                    btn.disabled = false;
                    btn.textContent = 'Crear Cuenta';
                }
            } catch(e) {
                msgBox.textContent = "Error de conexión";
                msgBox.className = "bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center block";
                btn.disabled = false;
                btn.textContent = 'Crear Cuenta';
            }
        });
    </script>
</body>
</html>
