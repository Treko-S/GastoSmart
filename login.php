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
    <title>Iniciar Sesión - GastoSmart</title>
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
            <h2 class="text-3xl font-bold text-dark">Bienvenido de nuevo</h2>
            <p class="text-gray-500 mt-2">Ingresa tus datos para continuar</p>
        </div>

        <form id="login-form" class="space-y-5">
            <div id="error-msg" class="hidden bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 text-center"></div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input type="email" id="email" required class="w-full rounded-xl border-gray-300 bg-gray-50 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white transition-colors">
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" id="password" required class="w-full rounded-xl border-gray-300 bg-gray-50 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white transition-colors">
            </div>
            
            <button type="submit" id="btn-submit" class="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition mt-6">
                Iniciar Sesión
            </button>
        </form>

        <p class="text-center mt-8 text-gray-500 text-sm">
            ¿No tienes una cuenta? <a href="register.php" class="text-primary font-semibold hover:underline">Regístrate aquí</a>
        </p>

        <!-- Demo Credentials -->
        <div class="mt-6 bg-blue-50 text-blue-800 text-sm p-4 rounded-xl border border-blue-100">
            <p class="font-bold mb-1"><i class="fas fa-info-circle mr-1"></i> Credenciales de Prueba:</p>
            <ul class="list-disc pl-5 mt-1 space-y-1 text-blue-700">
                <li><strong>Admin:</strong> admin@gastos.com / 123456</li>
                <li><strong>Usuario:</strong> juan@gastos.com / 123456</li>
            </ul>
        </div>

        <!-- APK Download Link -->
        <div class="mt-8 pt-6 border-t border-gray-100 text-center">
            <a href="app_movil/build/app/outputs/flutter-apk/app-release.apk" download="GastoSmart.apk" class="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-medium">
                <i class="fab fa-android text-lg"></i> Descargar App para Android (APK)
            </a>
        </div>
    </div>

    <script>
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit');
            const errorMsg = document.getElementById('error-msg');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            errorMsg.classList.add('hidden');

            const payload = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            };

            try {
                const res = await fetch('api/auth.php?action=login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if(data.success) {
                    if(data.rol === 'admin') {
                        window.location.href = 'admin.php';
                    } else {
                        window.location.href = 'dashboard.php';
                    }
                } else {
                    errorMsg.textContent = data.message;
                    errorMsg.classList.remove('hidden');
                    btn.disabled = false;
                    btn.textContent = 'Iniciar Sesión';
                }
            } catch(e) {
                errorMsg.textContent = "Error de conexión";
                errorMsg.classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = 'Iniciar Sesión';
            }
        });
    </script>
</body>
</html>
