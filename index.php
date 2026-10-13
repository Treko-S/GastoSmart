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
    <title>GastoSmart - Controla tus finanzas</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- AOS Animation CSS -->
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet">
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
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-gray-50 text-gray-800 antialiased">
    <!-- Navbar -->
    <nav class="bg-white/80 backdrop-blur-md fixed w-full z-50 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <div class="flex items-center gap-2">
                    <img src="logo.png" alt="GastoSmart Logo" class="w-10 h-10 object-contain">
                    <span class="font-bold text-2xl tracking-tight text-dark">GastoSmart</span>
                </div>
                <div class="hidden md:flex space-x-4">
                    <a href="login.php" class="text-gray-600 hover:text-primary px-4 py-2 font-medium transition">Iniciar Sesión</a>
                    <a href="register.php" class="bg-primary hover:bg-green-600 text-white px-5 py-2 rounded-xl font-medium shadow-md transition transform hover:-translate-y-0.5">Registrarse</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden relative">
        <div class="absolute inset-0 bg-gradient-to-br from-green-50 to-white -z-10"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div class="text-center max-w-3xl mx-auto" data-aos="zoom-in" data-aos-duration="1000">
                <h1 class="text-5xl md:text-6xl font-extrabold text-dark tracking-tight mb-6 leading-tight">
                    Toma el control de tu <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-600">futuro financiero</span>
                </h1>
                <p class="text-xl text-gray-500 mb-10 leading-relaxed" data-aos="fade-up" data-aos-delay="200">
                    Registra, analiza y optimiza tus gastos diarios de forma inteligente. Todo desde una interfaz rápida, sencilla y diseñada para el móvil.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center" data-aos="fade-up" data-aos-delay="400">
                    <a href="register.php" class="bg-primary hover:bg-green-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl shadow-green-200 transition transform hover:-translate-y-1">Empezar Gratis</a>
                    <a href="login.php" class="bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 px-8 py-4 rounded-full font-semibold text-lg shadow-sm transition">Ya tengo cuenta</a>
                    <a href="app_movil/build/app/outputs/flutter-apk/app-release.apk" download="GastoSmart.apk" class="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg shadow-green-200 transition transform hover:-translate-y-1 flex items-center justify-center gap-2">
                        <i class="fab fa-android text-xl"></i> Descargar APK
                    </a>
                </div>
            </div>
        </div>
    </section>

    <!-- Features -->
    <section class="py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16" data-aos="fade-up">
                <h2 class="text-3xl font-bold text-dark mb-4">¿Por qué elegir GastoSmart?</h2>
                <p class="text-gray-500 max-w-2xl mx-auto">Nuestra plataforma está construida pensando en tu comodidad y en el análisis rápido de tus finanzas.</p>
            </div>
            
            <div class="grid md:grid-cols-3 gap-10">
                <div class="p-8 rounded-3xl bg-gray-50 hover:bg-green-50 transition border border-gray-100" data-aos="fade-up" data-aos-delay="100">
                    <div class="w-14 h-14 bg-green-100 text-primary rounded-2xl flex items-center justify-center mb-6 text-2xl">
                        <i class="fas fa-bolt"></i>
                    </div>
                    <h3 class="text-xl font-bold text-dark mb-3">Registro Ultrarrápido</h3>
                    <p class="text-gray-500">Agrega gastos en segundos gracias a nuestra interfaz moderna y reactiva (SPA).</p>
                </div>
                
                <div class="p-8 rounded-3xl bg-gray-50 hover:bg-green-50 transition border border-gray-100" data-aos="fade-up" data-aos-delay="200">
                    <div class="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                        <i class="fas fa-chart-pie"></i>
                    </div>
                    <h3 class="text-xl font-bold text-dark mb-3">Gráficos Visuales</h3>
                    <p class="text-gray-500">Analiza en qué gastas tu dinero con un vistazo gracias a nuestros gráficos interactivos.</p>
                </div>
                
                <div class="p-8 rounded-3xl bg-gray-50 hover:bg-green-50 transition border border-gray-100" data-aos="fade-up" data-aos-delay="300">
                    <div class="w-14 h-14 bg-green-100 text-green-500 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                        <i class="fas fa-bell"></i>
                    </div>
                    <h3 class="text-xl font-bold text-dark mb-3">Alertas Inteligentes</h3>
                    <p class="text-gray-500">Te avisamos cuando estés cerca de superar tus límites mensuales establecidos.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- How it works -->
    <section class="py-20 bg-gray-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16" data-aos="fade-up">
                <h2 class="text-3xl font-bold text-dark mb-4">¿Cómo funciona?</h2>
                <p class="text-gray-500 max-w-2xl mx-auto">En 3 simples pasos tendrás control total sobre tu dinero.</p>
            </div>
            
            <div class="grid md:grid-cols-3 gap-8 text-center">
                <div data-aos="zoom-in" data-aos-delay="100">
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border border-gray-100 text-2xl font-bold text-primary">1</div>
                    <h3 class="text-xl font-bold text-dark mb-2">Regístrate</h3>
                    <p class="text-gray-500">Crea tu cuenta gratuita en segundos. Sin tarjetas de crédito.</p>
                </div>
                <div data-aos="zoom-in" data-aos-delay="200">
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border border-gray-100 text-2xl font-bold text-primary">2</div>
                    <h3 class="text-xl font-bold text-dark mb-2">Anota tus gastos</h3>
                    <p class="text-gray-500">Registra todo lo que compras desde la app móvil o web.</p>
                </div>
                <div data-aos="zoom-in" data-aos-delay="300">
                    <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border border-gray-100 text-2xl font-bold text-primary">3</div>
                    <h3 class="text-xl font-bold text-dark mb-2">Analiza y Ahorra</h3>
                    <p class="text-gray-500">Observa las tendencias, ajusta tus hábitos y ahorra más cada mes.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-100 py-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div class="flex items-center gap-2">
                <img src="logo.png" alt="GastoSmart Logo" class="w-8 h-8 object-contain">
                <span class="font-bold text-lg text-dark">GastoSmart</span>
            </div>
            <p class="text-gray-500 text-sm">© 2026 GastoSmart. Todos los derechos reservados.</p>
            <div class="flex gap-4 text-gray-400">
                <a href="#" class="hover:text-primary transition"><i class="fab fa-twitter text-xl"></i></a>
                <a href="#" class="hover:text-primary transition"><i class="fab fa-facebook text-xl"></i></a>
                <a href="#" class="hover:text-primary transition"><i class="fab fa-instagram text-xl"></i></a>
            </div>
        </div>
    </footer>

    <!-- AOS Animation Script -->
    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
    <script>
        AOS.init({
            once: true,
            offset: 100
        });
    </script>
</body>
</html>
