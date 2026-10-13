<?php
session_start();
if(!isset($_SESSION['usuario_id']) || $_SESSION['rol'] !== 'admin'){
    header("Location: dashboard.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Control - GastoSmart</title>
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
                        success: '#10B981'
                    }
                }
            }
        }
    </script>
    <style>
        body { font-family: 'Inter', sans-serif; transition: background-color 0.3s, color 0.3s; }
        ::-webkit-scrollbar { display: none; }
        
        /* Custom Dark Mode Overrides */
        body.dark { background-color: #0F172A; color: #F1F5F9; }
        body.dark .bg-white dark:bg-slate-800 { background-color: #1E293B !important; border-color: #334155 !important; }
        body.dark .text-dark dark:text-white { color: #F1F5F9 !important; }
        body.dark .text-gray-800 dark:text-gray-100 { color: #E2E8F0 !important; }
        body.dark .text-gray-500 dark:text-gray-400 { color: #94A3B8 !important; }
        body.dark .text-gray-600 { color: #94A3B8 !important; }
        body.dark .border-gray-100 dark:border-slate-700 { border-color: #334155 !important; }
        body.dark .bg-gray-50 dark:bg-slate-900 { background-color: #0F172A !important; }
        body.dark .bg-gray-100 { background-color: #1E293B !important; }
        body.dark .hover\:bg-gray-50 dark:bg-slate-900:hover { background-color: #334155 !important; }
    </style>
</head>
<body class="bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 antialiased h-screen overflow-hidden flex flex-col md:flex-row">

    <!-- Desktop Sidebar (Admin) -->
    <nav class="bg-white dark:bg-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-lg md:border-r border-gray-100 dark:border-slate-700 fixed bottom-0 w-full md:relative md:w-64 md:h-full z-40 hidden md:flex md:flex-col transition-all duration-300">
        <!-- Logo Desktop -->
        <div class="flex items-center justify-center h-20 border-b border-gray-100 dark:border-slate-700">
            <h1 class="text-2xl font-bold text-dark dark:text-white flex items-center gap-2">
                <img src="logo.png" class="w-8 h-8 object-contain"> Admin
            </h1>
        </div>
        
        <div class="flex flex-col gap-4 p-6 overflow-y-auto flex-1">
            <a href="admin.php" class="flex items-center gap-3 text-primary bg-primary/10 p-3 rounded-lg hover:bg-primary/20 transition-colors">
                <i class="fas fa-users-cog text-lg"></i>
                <span class="font-medium">Usuarios</span>
            </a>
            <a href="dashboard.php" class="flex items-center gap-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-slate-900 hover:text-primary p-3 rounded-lg transition-colors">
                <i class="fas fa-home text-lg"></i>
                <span class="font-medium">Volver a la App</span>
            </a>
            
            <button id="theme-toggle" class="flex items-center gap-3 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-slate-900 hover:text-primary p-3 rounded-lg transition-colors mt-auto">
                <i class="fas fa-moon text-lg" id="theme-icon"></i>
                <span class="font-medium" id="theme-text">Oscuro</span>
            </button>
            
            <a href="api/auth.php?action=logout" class="flex items-center gap-3 text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 p-3 rounded-lg transition-colors">
                <i class="fas fa-sign-out-alt text-lg"></i>
                <span class="font-medium">Salir</span>
            </a>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto pb-24 md:pb-0 relative h-full">
        <!-- Mobile Header (Visible only on mobile for Admin page) -->
        <div class="md:hidden bg-white dark:bg-slate-800 shadow-sm h-16 flex items-center justify-between px-4 sticky top-0 z-50">
            <h1 class="text-lg font-bold text-dark dark:text-white flex items-center gap-2">
                <i class="fas fa-user-shield text-primary"></i> Administración
            </h1>
            <a href="dashboard.php" class="text-gray-500 dark:text-gray-400 hover:text-primary"><i class="fas fa-times text-xl"></i></a>
        </div>

        <div class="p-5 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
            <!-- Header -->
            <header>
                <p class="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base uppercase tracking-wider mb-1">Vista Administrativa</p>
                <h2 class="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">Gestión de Plataforma</h2>
            </header>

            <!-- Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                    <div class="text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2"><i class="fas fa-users text-primary"></i> Usuarios Totales</div>
                    <div class="text-4xl font-bold text-dark dark:text-white" id="stat-users">0</div>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                    <div class="text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2"><i class="fas fa-exchange-alt text-success"></i> Transacciones Registradas</div>
                    <div class="text-4xl font-bold text-dark dark:text-white" id="stat-transactions">0</div>
                </div>
                <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
                    <div class="text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2"><i class="fas fa-dollar-sign text-green-500"></i> Volumen (Aprox)</div>
                    <div class="text-4xl font-bold text-dark dark:text-white" id="stat-volume">$0.00</div>
                </div>
            </div>

            <!-- Users List Section -->
            <section class="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div class="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50">
                    <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Usuarios Registrados</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                                <th class="p-4 font-medium">ID</th>
                                <th class="p-4 font-medium">Nombre</th>
                                <th class="p-4 font-medium">Email</th>
                                <th class="p-4 font-medium">Rol</th>
                                <th class="p-4 font-medium">Fecha Registro</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body" class="divide-y divide-gray-100">
                            <tr>
                                <td colspan="5" class="p-8 text-center text-gray-400">
                                    <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                    <p>Cargando datos...</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                const response = await fetch('api/admin.php?action=get_stats');
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('stat-users').textContent = data.stats.total_users;
                    document.getElementById('stat-transactions').textContent = data.stats.total_transactions;
                    const volUsd = '$' + parseFloat(data.stats.total_volume_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2});
                    const volPyg = 'Gs. ' + Math.round(data.stats.total_volume_pyg || 0).toLocaleString('es-PY');
                    document.getElementById('stat-volume').innerHTML = `<span class="text-2xl md:text-3xl">${volUsd}</span> <span class="text-xs text-gray-400 block font-normal mt-0.5">${volPyg}</span>`;
                    
                    const tbody = document.getElementById('users-table-body');
                    tbody.innerHTML = '';
                    
                    if (data.users && data.users.length > 0) {
                        data.users.forEach(u => {
                            const date = new Date(u.creado_en).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
                            const roleBadge = u.rol === 'admin' 
                                ? '<span class="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">Admin</span>'
                                : '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">Usuario</span>';
                                
                            tbody.innerHTML += `
                                <tr class="hover:bg-gray-50 dark:bg-slate-900 transition-colors">
                                    <td class="p-4 text-gray-500 dark:text-gray-400">#${u.id}</td>
                                    <td class="p-4 font-medium text-dark dark:text-white">${u.nombre}</td>
                                    <td class="p-4 text-gray-600">${u.email}</td>
                                    <td class="p-4">${roleBadge}</td>
                                    <td class="p-4 text-gray-500 dark:text-gray-400 text-sm">${date}</td>
                                </tr>
                            `;
                        });
                    } else {
                        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-gray-500 dark:text-gray-400">No hay usuarios registrados.</td></tr>';
                    }
                } else {
                    alert('Error al cargar datos: ' + data.message);
                }
            } catch (error) {
                console.error("Error fetching admin data:", error);
            }
        });
        
        // Dark Mode Logic
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        
        if (themeToggle) {
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
