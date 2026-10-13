<?php
session_start();
if(!isset($_SESSION['usuario_id'])){
    header("Location: login.php");
    exit();
}
if(isset($_SESSION['rol']) && $_SESSION['rol'] === 'admin'){
    header("Location: admin.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GastoSmart</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        primary: '#10B981',
                        secondary: '#0F172A',
                        dark: '#0F172A',
                        danger: '#EF4444',
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; transition: background-color 0.3s, color 0.3s; }
        /* Hide scrollbar for clean app-like look */
        ::-webkit-scrollbar { display: none; }
        
        /* Custom Dark Mode Overrides for structural elements */
        body.dark { background-color: #0F172A; color: #F1F5F9; }
        body.dark .bg-white dark:bg-slate-800 { background-color: #1E293B !important; border-color: #334155 !important; }
        body.dark .text-dark dark:text-white { color: #F1F5F9 !important; }
        body.dark .text-gray-800 dark:text-gray-100 { color: #E2E8F0 !important; }
        body.dark .text-gray-500 dark:text-gray-400 { color: #94A3B8 !important; }
        body.dark .text-gray-700 dark:text-gray-200 { color: #CBD5E1 !important; }
        body.dark .border-gray-100 dark:border-slate-700 { border-color: #334155 !important; }
        body.dark .bg-gray-50 dark:bg-slate-900 { background-color: #0F172A !important; }
        body.dark .bg-gray-100 { background-color: #1E293B !important; }
        body.dark input, body.dark select { background-color: #334155 !important; color: white !important; border-color: #475569 !important; }
        body.dark .nav-btn:hover { background-color: #334155 !important; }
    </style>
</head>
<body class="bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 antialiased h-screen overflow-hidden flex flex-col md:flex-row">

    <!-- Desktop Sidebar / Mobile Bottom Nav -->
    <nav class="bg-white dark:bg-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg md:border-r border-gray-100 dark:border-slate-700 fixed bottom-0 w-full md:relative md:w-64 md:h-full z-40 md:flex md:flex-col transition-all duration-300">
        <!-- Logo Desktop -->
        <div class="hidden md:flex items-center justify-center h-20 border-b border-gray-100 dark:border-slate-700 relative">
            <h1 class="text-2xl font-bold text-dark dark:text-white flex items-center gap-2">
                <img src="logo.png" class="w-8 h-8 object-contain"> GastoSmart
            </h1>
        </div>
        
        <div class="flex justify-around md:flex-col md:justify-start md:gap-4 p-4 md:p-6 h-16 md:h-auto overflow-y-auto">
            <a href="#" data-view="inicio" class="nav-btn flex flex-col md:flex-row items-center gap-1 md:gap-3 text-primary md:bg-primary/10 md:p-3 rounded-lg md:hover:bg-primary/20 transition-colors">
                <i class="fas fa-home text-xl md:text-lg"></i>
                <span class="text-xs md:text-base font-medium">Inicio</span>
            </a>
            <a href="#" data-view="graficos" class="nav-btn flex flex-col md:flex-row items-center gap-1 md:gap-3 text-gray-500 dark:text-gray-400 md:text-gray-400 md:p-3 rounded-lg md:hover:bg-white dark:bg-slate-800/10 md:hover:text-white transition-colors">
                <i class="fas fa-chart-pie text-xl md:text-lg"></i>
                <span class="text-xs md:text-base font-medium">Gráficos</span>
            </a>
            <a href="#" data-view="historial" class="nav-btn flex flex-col md:flex-row items-center gap-1 md:gap-3 text-gray-500 dark:text-gray-400 md:text-gray-600 md:p-3 rounded-lg md:hover:bg-gray-50 dark:bg-slate-900 md:hover:text-primary transition-colors">
                <i class="fas fa-history text-xl md:text-lg"></i>
                <span class="text-xs md:text-base font-medium">Historial</span>
            </a>
            <a href="#" data-view="configuracion" class="nav-btn flex flex-col md:flex-row items-center gap-1 md:gap-3 text-gray-500 dark:text-gray-400 md:text-gray-600 md:p-3 rounded-lg md:hover:bg-gray-50 dark:bg-slate-900 md:hover:text-primary transition-colors">
                <i class="fas fa-cog text-xl md:text-lg"></i>
                <span class="text-xs md:text-base font-medium">Ajustes</span>
            </a>
            <button id="theme-toggle" class="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-gray-500 dark:text-gray-400 md:text-gray-600 md:p-3 rounded-lg md:hover:bg-gray-50 dark:bg-slate-900 md:hover:text-primary transition-colors mt-auto md:mt-4">
                <i class="fas fa-moon text-xl md:text-lg" id="theme-icon"></i>
                <span class="text-xs md:text-base font-medium" id="theme-text">Oscuro</span>
            </button>
            
            <a href="api/auth.php?action=logout" class="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-gray-500 dark:text-gray-400 md:text-gray-600 md:p-3 rounded-lg md:hover:bg-red-50 md:hover:text-red-600 transition-colors">
                <i class="fas fa-sign-out-alt text-xl md:text-lg"></i>
                <span class="text-xs md:text-base font-medium">Salir</span>
            </a>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto pb-24 md:pb-0 relative h-full">
        <!-- Alert Banner -->
        <div id="alert-banner" class="hidden bg-danger text-white px-4 py-3 shadow-md flex justify-between items-center transition-all duration-500 transform -translate-y-full">
            <div class="flex items-center gap-3">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="font-medium text-sm md:text-base">¡Atención! Has superado el 80% de tu límite mensual ($2,000).</span>
            </div>
            <button onclick="document.getElementById('alert-banner').classList.add('hidden')" class="text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="p-5 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
            <!-- View: Inicio -->
            <div id="view-inicio" class="view-section block">
                <!-- Header (Search/Profile simulation) -->
                <header class="flex justify-between items-center mb-8 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hidden md:flex">
                    <div class="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <i class="fas fa-search"></i>
                        <input type="text" placeholder="Buscar..." class="outline-none bg-transparent w-64 text-sm">
                    </div>
                    <div class="flex items-center gap-4 text-gray-600">
                        <i class="fas fa-bell"></i>
                        <div class="flex items-center gap-2 border-l pl-4 border-gray-200">
                            <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                <?php echo substr($_SESSION['usuario_id'] ?? 'U', 0, 1); ?>
                            </div>
                            <span class="text-sm font-medium">Usuario</span>
                        </div>
                    </div>
                </header>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    
                    <!-- Resumen del Mes -->
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between col-span-1 lg:col-span-2">
                        <div class="mb-6 md:mb-0 md:mr-8 text-center md:text-left flex-1">
                            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">Resumen del Mes</h3>
                            <p class="text-gray-500 dark:text-gray-400 text-sm mb-4" id="period-title">1 - 31 de este mes</p>
                            
                            <div class="flex flex-col sm:flex-row gap-3 sm:gap-5 my-2">
                                <div class="bg-gray-50/80 dark:bg-slate-900/60 p-3.5 px-5 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm">
                                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">Total en Dólares</span>
                                    <div class="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-baseline gap-1.5">
                                        <span class="text-primary text-xl md:text-2xl font-bold">$</span><span id="total-amount-usd">0.00</span>
                                        <span class="text-xs md:text-sm text-gray-400 font-normal">USD</span>
                                    </div>
                                </div>
                                <div class="bg-gray-50/80 dark:bg-slate-900/60 p-3.5 px-5 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm">
                                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">Total en Guaraníes</span>
                                    <div class="text-2xl md:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-1.5">
                                        <span class="text-emerald-500 text-lg md:text-xl font-bold">Gs.</span><span id="total-amount-pyg">0</span>
                                        <span class="text-xs md:text-sm text-gray-400 font-normal">PYG</span>
                                    </div>
                                </div>
                            </div>
                            <span id="total-amount" class="hidden">0.00</span>
                        </div>
                        
                        <!-- Chart in Dashboard -->
                        <div class="w-full max-w-[200px] relative">
                            <canvas id="expensesChartInicio"></canvas>
                        </div>
                    </section>

                    <!-- Recent Expenses Section -->
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-[400px] col-span-1 lg:col-span-2">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Gastos Recientes</h3>
                            <button class="text-primary text-sm font-medium hover:underline" onclick="switchView('historial')">Ver todos</button>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto pr-2 space-y-4" id="recent-expenses-list">
                            <!-- Items will be injected here via JS -->
                            <div class="flex justify-center items-center h-32 text-gray-400">
                                <i class="fas fa-spinner fa-spin text-2xl"></i>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <!-- View: Gráficos -->
            <div id="view-graficos" class="view-section hidden">
                <header class="mb-8">
                    <h2 class="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Gráficos y Análisis</h2>
                    <p class="text-gray-500 dark:text-gray-400 mt-1">Desglose de gastos del mes actual</p>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <!-- Chart Section -->
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center min-h-[400px]">
                        <h3 class="w-full text-left text-lg font-bold text-dark dark:text-white mb-4">Por Categoría</h3>
                        <div class="w-full max-w-[350px] relative">
                            <canvas id="expensesChart"></canvas>
                        </div>
                    </section>
                    
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between min-h-[420px]">
                        <div>
                            <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
                                <div>
                                    <h3 class="text-lg font-bold text-dark dark:text-white flex items-center gap-2">
                                        <i class="fas fa-chart-line text-primary"></i>
                                        Evolución de Gastos (6 Meses)
                                    </h3>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Escala comparativa mensual y tendencia</p>
                                </div>
                                <!-- Currency Scale Switcher Buttons -->
                                <div class="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl border border-gray-200/60 dark:border-slate-700/60 self-start sm:self-auto">
                                    <button type="button" id="btn-evo-usd" class="px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 bg-white dark:bg-slate-800 text-primary shadow-sm border border-emerald-500/20">
                                        USD ($)
                                    </button>
                                    <button type="button" id="btn-evo-pyg" class="px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                        PYG (Gs.)
                                    </button>
                                </div>
                            </div>
                            
                            <!-- Badges de escala y métricas del periodo -->
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                                <div class="bg-gray-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                                    <span class="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Promedio Mensual</span>
                                    <span id="evo-promedio" class="text-sm font-bold text-gray-800 dark:text-white">$0.00</span>
                                </div>
                                <div class="bg-gray-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60">
                                    <span class="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Mes con Mayor Gasto</span>
                                    <span id="evo-max-mes" class="text-sm font-bold text-emerald-600 dark:text-emerald-400">-</span>
                                </div>
                                <div class="bg-gray-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700/60 col-span-2 sm:col-span-1">
                                    <span class="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">Total 6 Meses</span>
                                    <span id="evo-total-periodo" class="text-sm font-bold text-gray-800 dark:text-white">$0.00</span>
                                </div>
                            </div>
                        </div>

                        <!-- Scalable Canvas Container -->
                        <div class="w-full h-64 md:h-72 relative">
                            <canvas id="evolutionChart"></canvas>
                        </div>
                    </section>
                </div>
            </div>

            <!-- View: Historial -->
            <div id="view-historial" class="view-section hidden">
                <header class="flex justify-between items-end mb-8">
                    <div>
                        <h2 class="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Historial de Gastos</h2>
                        <p class="text-gray-500 dark:text-gray-400 mt-1">Revisa todos tus movimientos</p>
                    </div>
                    <div class="flex gap-3 items-center">
                        <select id="history-period" class="rounded-lg border-gray-300 border py-2 px-3 text-sm focus:ring-primary focus:border-primary">
                            <option value="todos">Todos</option>
                            <option value="mes" selected>Este Mes</option>
                            <option value="quincena">Últimos 15 días</option>
                            <option value="semana">Esta Semana</option>
                        </select>
                        <button id="btn-export-csv" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm">
                            <i class="fas fa-file-excel"></i> Exportar
                        </button>
                    </div>
                </header>

                <div class="grid grid-cols-1 gap-6 md:gap-8">
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
                        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Resumen del Periodo</h3>
                            <div class="flex flex-wrap gap-3 items-center">
                                <div class="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 bg-gray-50 dark:bg-slate-900 py-1.5 px-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <span class="text-gray-500 dark:text-gray-400">Total USD:</span>
                                    <span class="text-primary font-bold">-$<span id="history-total-usd">0.00</span></span>
                                </div>
                                <div class="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5 bg-gray-50 dark:bg-slate-900 py-1.5 px-3 rounded-xl border border-gray-100 dark:border-slate-700">
                                    <span class="text-gray-500 dark:text-gray-400">Total Guaraníes:</span>
                                    <span class="text-emerald-500 font-bold">-Gs. <span id="history-total-pyg">0</span></span>
                                </div>
                            </div>
                            <span id="history-total" class="hidden">0.00</span>
                        </div>
                        <div class="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[60vh]" id="full-history-list">
                            <!-- Items will be injected here via JS -->
                            <div class="flex justify-center items-center h-32 text-gray-400">
                                <i class="fas fa-spinner fa-spin text-2xl"></i>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <!-- View: Configuración -->
            <div id="view-configuracion" class="view-section hidden">
                <header class="mb-8">
                    <h2 class="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Configuración</h2>
                    <p class="text-gray-500 dark:text-gray-400 mt-1">Ajustes de cuenta, tema y notificaciones</p>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <!-- Tema y Apariencia -->
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                        <h3 class="text-lg font-bold text-dark dark:text-white mb-4"><i class="fas fa-palette mr-2"></i>Apariencia</h3>
                        <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">Elige tu tema preferido para la aplicación.</p>
                        <button id="theme-toggle-config" class="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white p-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                            <i class="fas fa-moon" id="theme-icon-config"></i> Cambiar Tema
                        </button>
                    </section>

                    <!-- WhatsApp API -->
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                        <h3 class="text-lg font-bold text-dark dark:text-white mb-4"><i class="fab fa-whatsapp mr-2 text-green-500"></i>Alertas de WhatsApp</h3>
                        <p class="text-gray-500 dark:text-gray-400 text-sm mb-4">Recibe un resumen de tus gastos en tu WhatsApp.</p>
                        <form id="whatsapp-settings-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Número de WhatsApp</label>
                                <input type="text" id="wa-numero" placeholder="+1234567890" class="w-full p-3 bg-gray-50 border border-gray-100 dark:bg-slate-900 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Frecuencia de resumen</label>
                                <select id="wa-frecuencia" class="w-full p-3 bg-gray-50 border border-gray-100 dark:bg-slate-900 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                    <option value="none">Desactivado</option>
                                    <option value="semanal">Semanal</option>
                                    <option value="quincenal">Quincenal</option>
                                    <option value="mensual">Mensual</option>
                                </select>
                            </div>
                            <button type="submit" class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-xl transition-colors shadow-sm">
                                Guardar Preferencias
                            </button>
                        </form>
                    </section>

                    <!-- Cuenta -->
                    <section class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 md:col-span-2">
                        <h3 class="text-lg font-bold text-dark dark:text-white mb-4"><i class="fas fa-user mr-2"></i>Ajustes de Cuenta</h3>
                        <form id="account-settings-form" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nuevo Correo Electrónico</label>
                                    <input type="email" id="acc-email" placeholder="Dejar en blanco para no cambiar" class="w-full p-3 bg-gray-50 border border-gray-100 dark:bg-slate-900 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nueva Contraseña</label>
                                    <input type="password" id="acc-pass" placeholder="Dejar en blanco para no cambiar" class="w-full p-3 bg-gray-50 border border-gray-100 dark:bg-slate-900 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                                </div>
                            </div>
                            <button type="submit" class="w-full md:w-auto bg-primary hover:bg-emerald-600 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-sm">
                                Actualizar Cuenta
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    </main>

    <!-- FAB (Floating Action Button) -->
    <button id="fab-button" class="fixed bottom-20 md:bottom-8 right-6 md:right-8 bg-primary text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl hover:bg-green-600 hover:scale-105 transition-all duration-300 flex items-center justify-center z-50 focus:outline-none focus:ring-4 focus:ring-green-300">
        <i class="fas fa-plus text-2xl"></i>
    </button>

    <!-- Modal for New Expense -->
    <div id="expense-modal" class="fixed inset-0 z-[60] hidden">
        <!-- Backdrop -->
        <div id="modal-backdrop" class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity opacity-0"></div>
        
        <!-- Modal Content -->
        <div class="absolute inset-0 flex items-center justify-center p-4">
            <div id="modal-content" class="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl transform scale-95 opacity-0 transition-all duration-300 overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <h3 class="text-xl font-bold text-gray-800 dark:text-white">Nuevo Gasto</h3>
                    <button id="close-modal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="p-6 overflow-y-auto">
                    <form id="expense-form" class="space-y-5">
                        <!-- Currency Selection & Amount -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Moneda del Gasto</label>
                            <input type="hidden" id="moneda" name="moneda" value="USD">
                            
                            <!-- Toggle Currency Buttons -->
                            <div class="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl mb-3 border border-gray-200/60 dark:border-slate-700">
                                <button type="button" id="btn-currency-usd" class="currency-toggle-btn active flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-white dark:bg-slate-800 text-primary shadow-sm border border-emerald-500/20">
                                    <span class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">$</span>
                                    <span>Dólares (USD)</span>
                                </button>
                                <button type="button" id="btn-currency-pyg" class="currency-toggle-btn flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-sm transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                                    <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold">₲</span>
                                    <span>Guaraníes (PYG)</span>
                                </button>
                            </div>

                            <label for="monto" id="monto-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto en Dólares (USD)</label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <span id="currency-symbol" class="text-gray-500 dark:text-gray-400 font-bold sm:text-base">$</span>
                                </div>
                                <input type="number" step="0.01" id="monto" name="monto" required
                                    class="pl-10 block w-full rounded-xl border-gray-300 bg-gray-50 dark:bg-slate-900 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-800 transition-colors text-lg font-bold"
                                    placeholder="0.00">
                            </div>
                            
                            <!-- Real-time currency conversion preview -->
                            <div id="currency-conversion-preview" class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                                <span id="conversion-text">≈ Gs. 0 (Tasa: 1 USD = 7.500 Gs.)</span>
                                <span class="text-[10px] bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-gray-400">1 USD = 7.500 Gs.</span>
                            </div>
                        </div>

                        <!-- Category -->
                        <div>
                            <label for="categoria_id" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                            <div class="relative">
                                <select id="categoria_id" name="categoria_id" required
                                    class="block w-full rounded-xl border-gray-300 bg-gray-50 dark:bg-slate-900 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-800 transition-colors appearance-none">
                                    <option value="" disabled selected>Selecciona una categoría</option>
                                    <!-- Options injected via JS -->
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 dark:text-gray-400">
                                    <i class="fas fa-chevron-down text-sm"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Description -->
                        <div>
                            <label for="descripcion" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                            <input type="text" id="descripcion" name="descripcion" required
                                class="block w-full rounded-xl border-gray-300 bg-gray-50 dark:bg-slate-900 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-800 transition-colors"
                                placeholder="Ej. Cena en restaurante">
                        </div>

                        <!-- Date -->
                        <div>
                            <label for="fecha" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                            <input type="date" id="fecha" name="fecha" required
                                class="block w-full rounded-xl border-gray-300 bg-gray-50 dark:bg-slate-900 border py-3 px-4 focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:focus:bg-slate-800 transition-colors">
                        </div>

                        <div class="pt-4">
                            <button type="submit" id="submit-btn" class="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex justify-center items-center gap-2">
                                <span>Guardar Gasto</span>
                                <i class="fas fa-check"></i>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Logic -->
    <script src="assets/js/app.js?v=4"></script>
    <script>
        // Dark Mode Logic
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        
        if (themeToggle) {
            // Check saved theme
            if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.body.classList.add('dark');
                if(themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
                if(themeText) themeText.textContent = 'Claro';
            }
            
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark');
                if (document.body.classList.contains('dark')) {
                    localStorage.setItem('theme', 'dark');
                    if(themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
                    if(themeText) themeText.textContent = 'Claro';
                } else {
                    localStorage.setItem('theme', 'light');
                    if(themeIcon) themeIcon.classList.replace('fa-sun', 'fa-moon');
                    if(themeText) themeText.textContent = 'Oscuro';
                }
            });
        }
    </script>
</body>
</html>
