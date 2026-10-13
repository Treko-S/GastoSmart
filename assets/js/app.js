document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const totalAmountEl = document.getElementById('total-amount');
    const recentExpensesList = document.getElementById('recent-expenses-list');
    const categorySelect = document.getElementById('categoria_id');
    const alertBanner = document.getElementById('alert-banner');
    
    // Modal Elements
    const modal = document.getElementById('expense-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    const fabBtn = document.getElementById('fab-button');
    const closeModalBtn = document.getElementById('close-modal');
    const expenseForm = document.getElementById('expense-form');
    const dateInput = document.getElementById('fecha');

    // Chart Instance
    let chartInstance = null;

    // Configuration
    const MONTHLY_LIMIT = 2000;
    const API_URL = 'api/expenses.php';

    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // --- Navigation / SPA Logic ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');

    window.switchView = (viewName) => {
        // Hide all views
        views.forEach(v => v.classList.add('hidden'));
        views.forEach(v => v.classList.remove('block'));
        
        // Show target view
        const targetView = document.getElementById(`view-${viewName}`);
        if(targetView) {
            targetView.classList.remove('hidden');
            targetView.classList.add('block');
        }

        // Update nav styles
        navBtns.forEach(btn => {
            if(btn.dataset.view === viewName) {
                btn.classList.add('text-primary', 'md:text-white', 'md:bg-primary/20', 'md:hover:bg-primary/30');
                btn.classList.remove('text-gray-500', 'md:text-gray-400', 'md:hover:bg-white/10', 'md:hover:text-white');
            } else {
                btn.classList.remove('text-primary', 'md:text-white', 'md:bg-primary/20', 'md:hover:bg-primary/30');
                btn.classList.add('text-gray-500', 'md:text-gray-400', 'md:hover:bg-white/10', 'md:hover:text-white');
            }
        });

        if (viewName === 'historial') {
            loadHistory();
        }
    };

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const view = btn.dataset.view;
            if(view) switchView(view);
        });
    });

    // --- Modal Logic ---
    const openModal = () => {
        modal.classList.remove('hidden');
        // Small delay for CSS transitions to work
        setTimeout(() => {
            modalBackdrop.classList.remove('opacity-0');
            modalContent.classList.remove('opacity-0', 'scale-95');
            modalContent.classList.add('opacity-100', 'scale-100');
        }, 10);
    };

    const closeModal = () => {
        modalBackdrop.classList.add('opacity-0');
        modalContent.classList.remove('opacity-100', 'scale-100');
        modalContent.classList.add('opacity-0', 'scale-95');
        // Wait for transition before hiding
        setTimeout(() => {
            modal.classList.add('hidden');
            expenseForm.reset();
            dateInput.value = today;
            setCurrency('USD');
        }, 300);
    };

    fabBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    // --- Currency Selection & Conversion Logic ---
    const EXCHANGE_RATE = 7500; // 1 USD = 7.500 Gs.
    const btnCurrencyUsd = document.getElementById('btn-currency-usd');
    const btnCurrencyPyg = document.getElementById('btn-currency-pyg');
    const monedaInput = document.getElementById('moneda');
    const montoInput = document.getElementById('monto');
    const montoLabel = document.getElementById('monto-label');
    const currencySymbol = document.getElementById('currency-symbol');
    const conversionText = document.getElementById('conversion-text');

    const updateConversionPreview = () => {
        if (!conversionText || !montoInput) return;
        const val = parseFloat(montoInput.value) || 0;
        const currentCurrency = monedaInput ? monedaInput.value : 'USD';

        if (currentCurrency === 'USD') {
            const approxPyg = Math.round(val * EXCHANGE_RATE);
            conversionText.textContent = `≈ Gs. ${formatPYG(approxPyg)} (Tasa: 1 USD = 7.500 Gs.)`;
        } else {
            const approxUsd = val / EXCHANGE_RATE;
            conversionText.textContent = `≈ $${formatUSD(approxUsd)} USD (Tasa: 1 USD = 7.500 Gs.)`;
        }
    };

    const setCurrency = (curr) => {
        if (!monedaInput) return;
        monedaInput.value = curr;

        if (curr === 'USD') {
            if (btnCurrencyUsd) {
                btnCurrencyUsd.className = 'currency-toggle-btn active flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-white dark:bg-slate-800 text-primary shadow-sm border border-emerald-500/20';
            }
            if (btnCurrencyPyg) {
                btnCurrencyPyg.className = 'currency-toggle-btn flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-sm transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200';
            }
            if (currencySymbol) currencySymbol.textContent = '$';
            if (montoLabel) montoLabel.textContent = 'Monto en Dólares (USD)';
            if (montoInput) {
                montoInput.step = '0.01';
                montoInput.placeholder = '0.00';
            }
        } else {
            if (btnCurrencyPyg) {
                btnCurrencyPyg.className = 'currency-toggle-btn active flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-sm transition-all duration-200 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20';
            }
            if (btnCurrencyUsd) {
                btnCurrencyUsd.className = 'currency-toggle-btn flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-sm transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200';
            }
            if (currencySymbol) currencySymbol.textContent = 'Gs.';
            if (montoLabel) montoLabel.textContent = 'Monto en Guaraníes (PYG)';
            if (montoInput) {
                montoInput.step = '1';
                montoInput.placeholder = '50.000';
            }
        }
        updateConversionPreview();
    };

    if (btnCurrencyUsd) btnCurrencyUsd.addEventListener('click', () => setCurrency('USD'));
    if (btnCurrencyPyg) btnCurrencyPyg.addEventListener('click', () => setCurrency('PYG'));
    if (montoInput) montoInput.addEventListener('input', updateConversionPreview);

    // --- Data Fetching & UI Updates ---
    
    const formatUSD = (amount) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const formatPYG = (amount) => {
        return new Intl.NumberFormat('es-PY', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(Math.round(amount || 0));
    };

    const formatCurrency = formatUSD;

    const formatDate = (dateString) => {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        // Handle timezone issues by adding T12:00:00
        return new Date(dateString + 'T12:00:00').toLocaleDateString('es-ES', options);
    };

    const updateChart = (chartData) => {
        
        if (chartData.labels.length === 0) {
            // Default empty chart
            chartData = {
                labels: ['Sin gastos'],
                data: [1],
                colors: ['#E5E7EB']
            };
        }

        const config = {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.data,
                    backgroundColor: chartData.colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.raw !== null) {
                                    if(chartData.labels[0] !== 'Sin gastos') {
                                        label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.raw);
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        };

        const renderToCanvas = (canvasId) => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                // Store instance on the canvas object to destroy it later
                if (canvas.chartInstance) {
                    canvas.chartInstance.destroy();
                }
                canvas.chartInstance = new Chart(ctx, config);
            }
        };

        renderToCanvas('expensesChart');
        renderToCanvas('expensesChartInicio');
    };

    let currentEvolutionData = null;
    let currentEvoCurrency = 'USD'; // 'USD' or 'PYG'

    const renderEvolutionChart = () => {
        const canvas = document.getElementById('evolutionChart');
        if (!canvas) return;

        if (!currentEvolutionData || !currentEvolutionData.labels || currentEvolutionData.labels.length === 0) {
            currentEvolutionData = {
                labels: ['Sin datos'],
                data: [0],
                data_pyg: [0]
            };
        }

        const isPYG = (currentEvoCurrency === 'PYG');
        const rawValues = isPYG 
            ? (currentEvolutionData.data_pyg || currentEvolutionData.data.map(d => Math.round(d * EXCHANGE_RATE)))
            : currentEvolutionData.data;

        // Calculate summary metrics
        const numericValues = rawValues.map(v => Number(v) || 0);
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const count = numericValues.length || 1;
        const avg = sum / count;
        
        let maxVal = -1;
        let maxMonth = '-';
        numericValues.forEach((val, idx) => {
            if (val > maxVal) {
                maxVal = val;
                maxMonth = currentEvolutionData.labels[idx] || '-';
            }
        });

        // Update metric badges in the DOM
        const avgEl = document.getElementById('evo-promedio');
        const maxEl = document.getElementById('evo-max-mes');
        const totalPeriodoEl = document.getElementById('evo-total-periodo');
        
        if (avgEl) {
            avgEl.textContent = isPYG ? `Gs. ${formatPYG(avg)}` : `$${formatUSD(avg)}`;
        }
        if (maxEl) {
            maxEl.textContent = maxVal > 0 ? `${maxMonth} (${isPYG ? 'Gs. ' + formatPYG(maxVal) : '$' + formatUSD(maxVal)})` : '-';
        }
        if (totalPeriodoEl) {
            totalPeriodoEl.textContent = isPYG ? `Gs. ${formatPYG(sum)}` : `$${formatUSD(sum)}`;
        }

        // Prepare Canvas Gradient
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        gradient.addColorStop(0.8, 'rgba(16, 185, 129, 0.05)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        const isDarkMode = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
        const textColor = isDarkMode ? '#94A3B8' : '#64748B';

        const config = {
            type: 'line',
            data: {
                labels: currentEvolutionData.labels,
                datasets: [{
                    label: isPYG ? 'Gasto (Guaraníes)' : 'Gasto (USD)',
                    data: numericValues,
                    borderColor: '#10B981',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#10B981',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2.5,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#059669',
                    pointHoverBorderColor: '#FFFFFF',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDarkMode ? '#1E293B' : '#0F172A',
                        titleColor: '#F8FAFC',
                        bodyColor: '#E2E8F0',
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: false,
                        titleFont: { size: 13, weight: 'bold', family: 'Inter' },
                        bodyFont: { size: 13, family: 'Inter' },
                        callbacks: {
                            label: function(context) {
                                const val = context.raw;
                                if (isPYG) {
                                    const equivUsd = val / EXCHANGE_RATE;
                                    return [
                                        `💸 Total: Gs. ${formatPYG(val)} PYG`,
                                        `≈ $${formatUSD(equivUsd)} USD`
                                    ];
                                } else {
                                    const equivPyg = val * EXCHANGE_RATE;
                                    return [
                                        `💸 Total: $${formatUSD(val)} USD`,
                                        `≈ Gs. ${formatPYG(equivPyg)} PYG`
                                    ];
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '12%',
                        grid: {
                            color: gridColor,
                            borderDash: [5, 5]
                        },
                        ticks: {
                            color: textColor,
                            font: { size: 11, family: 'Inter' },
                            callback: function(value) {
                                if (isPYG) {
                                    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M Gs.';
                                    if (value >= 1000) return (value / 1000).toFixed(0) + 'k Gs.';
                                    return value + ' Gs.';
                                } else {
                                    return '$' + value;
                                }
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: textColor,
                            font: { size: 11, weight: '500', family: 'Inter' }
                        }
                    }
                }
            }
        };

        if (canvas.chartInstance) {
            canvas.chartInstance.destroy();
        }
        canvas.chartInstance = new Chart(ctx, config);
    };

    const updateEvolutionChart = (evolutionData) => {
        currentEvolutionData = evolutionData;
        renderEvolutionChart();
    };

    // Evolution Currency Switcher Listeners
    const btnEvoUsd = document.getElementById('btn-evo-usd');
    const btnEvoPyg = document.getElementById('btn-evo-pyg');

    if (btnEvoUsd) {
        btnEvoUsd.addEventListener('click', () => {
            currentEvoCurrency = 'USD';
            btnEvoUsd.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 bg-white dark:bg-slate-800 text-primary shadow-sm border border-emerald-500/20';
            if (btnEvoPyg) btnEvoPyg.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200';
            renderEvolutionChart();
        });
    }

    if (btnEvoPyg) {
        btnEvoPyg.addEventListener('click', () => {
            currentEvoCurrency = 'PYG';
            btnEvoPyg.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20';
            if (btnEvoUsd) btnEvoUsd.className = 'px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200';
            renderEvolutionChart();
        });
    }

    const updateRecentList = (expenses) => {
        recentExpensesList.innerHTML = '';
        
        if (expenses.length === 0) {
            recentExpensesList.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <div class="bg-gray-100 p-4 rounded-full mb-3">
                        <i class="fas fa-receipt text-2xl"></i>
                    </div>
                    <p class="font-medium text-sm">No hay gastos recientes</p>
                    <p class="text-xs mt-1">Registra tu primer gasto con el botón +</p>
                </div>
            `;
            return;
        }

        expenses.forEach(exp => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-slate-600';
            
            const isPYG = (exp.moneda === 'PYG');
            const formattedAmount = isPYG ? `Gs. ${formatPYG(exp.monto)}` : `$${formatUSD(exp.monto)}`;
            const badgeClass = isPYG 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
            const badgeText = isPYG ? 'PYG' : 'USD';

            item.innerHTML = `
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm" style="background-color: ${exp.color}">
                    <i class="${exp.icono} text-lg"></i>
                </div>
                <div class="ml-4 flex-1">
                    <h4 class="font-semibold text-gray-800 dark:text-white text-sm md:text-base">${exp.descripcion}</h4>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600">${exp.categoria_nombre}</span>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}">${badgeText}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(exp.fecha)}</span>
                    </div>
                </div>
                <div class="text-right ml-4">
                    <span class="font-bold text-danger text-sm md:text-base">-${formattedAmount}</span>
                </div>
            `;
            recentExpensesList.appendChild(item);
        });
    };

    const updateCategoriesSelect = (categories) => {
        // Keep the placeholder, remove the rest
        categorySelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            categorySelect.appendChild(option);
        });
    };

    const checkLimitAlert = (total) => {
        const threshold = MONTHLY_LIMIT * 0.8;
        if (total >= threshold) {
            alertBanner.classList.remove('hidden');
            // Animate in
            setTimeout(() => {
                alertBanner.classList.remove('-translate-y-full');
                alertBanner.classList.add('translate-y-0');
            }, 50);
        } else {
            alertBanner.classList.add('-translate-y-full');
            setTimeout(() => alertBanner.classList.add('hidden'), 500);
        }
    };

    const loadDashboardData = async () => {
        try {
            const response = await fetch(API_URL);
            if (response.status === 401) {
                window.location.href = 'login.php';
                return;
            }
            const data = await response.json();
            
            // Update Totals (USD & PYG)
            const totalUsdEl = document.getElementById('total-amount-usd');
            const totalPygEl = document.getElementById('total-amount-pyg');
            if (totalUsdEl) totalUsdEl.textContent = formatUSD(data.total_usd ?? data.total);
            if (totalPygEl) totalPygEl.textContent = formatPYG(data.total_pyg ?? 0);
            if (totalAmountEl) totalAmountEl.textContent = formatUSD(data.total_usd ?? data.total);
            
            // Update Chart
            updateChart(data.chart);
            if (data.evolution) {
                updateEvolutionChart(data.evolution);
            }
            
            // Update Recent
            updateRecentList(data.recent);
            
            // Update Categories Select
            if(categorySelect.options.length <= 1) {
                updateCategoriesSelect(data.categories);
            }

            // Check Limits
            checkLimitAlert(data.total);

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    // --- History Logic ---
    const fullHistoryList = document.getElementById('full-history-list');
    const historyTotal = document.getElementById('history-total');
    const historyPeriodSelect = document.getElementById('history-period');
    const btnExportCsv = document.getElementById('btn-export-csv');

    const updateFullHistoryList = (expenses) => {
        fullHistoryList.innerHTML = '';
        
        if (expenses.length === 0) {
            fullHistoryList.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                    <p class="font-medium text-sm">No hay gastos en este periodo.</p>
                </div>
            `;
            return;
        }

        expenses.forEach(exp => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-slate-600';
            
            const isPYG = (exp.moneda === 'PYG');
            const formattedAmount = isPYG ? `Gs. ${formatPYG(exp.monto)}` : `$${formatUSD(exp.monto)}`;
            const badgeClass = isPYG 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
            const badgeText = isPYG ? 'PYG' : 'USD';

            item.innerHTML = `
                <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm" style="background-color: ${exp.color}">
                    <i class="${exp.icono} text-lg"></i>
                </div>
                <div class="ml-4 flex-1">
                    <h4 class="font-semibold text-gray-800 dark:text-white text-sm md:text-base">${exp.descripcion}</h4>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600">${exp.categoria_nombre}</span>
                        <span class="text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}">${badgeText}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(exp.fecha)}</span>
                    </div>
                </div>
                <div class="text-right ml-4">
                    <span class="font-bold text-danger text-sm md:text-base">-${formattedAmount}</span>
                </div>
            `;
            fullHistoryList.appendChild(item);
        });
    };

    const loadHistory = async () => {
        const period = historyPeriodSelect.value;
        try {
            fullHistoryList.innerHTML = '<div class="flex justify-center items-center h-32 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';
            const response = await fetch(`${API_URL}?action=history&period=${period}`);
            if (response.status === 401) {
                window.location.href = 'login.php';
                return;
            }
            const data = await response.json();
            if (data.success) {
                const historyTotalUsd = document.getElementById('history-total-usd');
                const historyTotalPyg = document.getElementById('history-total-pyg');
                if (historyTotalUsd) historyTotalUsd.textContent = formatUSD(data.total_usd ?? data.total);
                if (historyTotalPyg) historyTotalPyg.textContent = formatPYG(data.total_pyg ?? 0);
                if (historyTotal) historyTotal.textContent = formatUSD(data.total_usd ?? data.total);
                updateFullHistoryList(data.history);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            fullHistoryList.innerHTML = '<p class="text-danger text-center mt-4">Error cargando historial.</p>';
        }
    };

    historyPeriodSelect.addEventListener('change', loadHistory);

    btnExportCsv.addEventListener('click', () => {
        const period = historyPeriodSelect.value;
        window.location.href = `${API_URL}?action=export&period=${period}`;
    });

    // --- Form Submission ---
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-btn');
        const originalContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Procesando...';
        submitBtn.disabled = true;

        const formData = {
            monto: document.getElementById('monto').value,
            moneda: document.getElementById('moneda') ? document.getElementById('moneda').value : 'USD',
            categoria_id: document.getElementById('categoria_id').value,
            descripcion: document.getElementById('descripcion').value,
            fecha: document.getElementById('fecha').value
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                closeModal();
                // Reload dashboard data smoothly
                await loadDashboardData();
            } else {
                alert(result.message || 'Error al guardar el gasto');
            }
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('Error de conexión al servidor.');
        } finally {
            submitBtn.innerHTML = originalContent;
            submitBtn.disabled = false;
        }
    });

    // --- Configuration Logic ---
    const loadConfigData = async () => {
        try {
            const response = await fetch('api/user.php?action=get');
            const result = await response.json();
            if (result.success && result.data) {
                const waNumero = document.getElementById('wa-numero');
                const waFrecuencia = document.getElementById('wa-frecuencia');
                
                if (waNumero && result.data.whatsapp_numero) waNumero.value = result.data.whatsapp_numero;
                if (waFrecuencia && result.data.whatsapp_frecuencia) waFrecuencia.value = result.data.whatsapp_frecuencia;
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
    };

    const whatsappForm = document.getElementById('whatsapp-settings-form');
    if(whatsappForm) {
        whatsappForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = whatsappForm.querySelector('button[type="submit"]');
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            try {
                const response = await fetch('api/user.php?action=update_whatsapp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        numero: document.getElementById('wa-numero').value,
                        frecuencia: document.getElementById('wa-frecuencia').value
                    })
                });
                const result = await response.json();
                alert(result.message);
            } catch (error) {
                alert('Error al guardar preferencias de WhatsApp.');
            } finally {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        });
    }

    const accountForm = document.getElementById('account-settings-form');
    if(accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('acc-email').value;
            const pass = document.getElementById('acc-pass').value;
            
            if(!email && !pass) {
                alert('Debes ingresar al menos un dato nuevo para actualizar.');
                return;
            }

            const btn = accountForm.querySelector('button[type="submit"]');
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            btn.disabled = true;

            try {
                const response = await fetch('api/user.php?action=update_account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: pass })
                });
                const result = await response.json();
                alert(result.message);
                if(result.success) {
                    accountForm.reset();
                }
            } catch (error) {
                alert('Error al actualizar la cuenta.');
            } finally {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        });
    }

    // Config Theme Toggle
    const themeToggleConfig = document.getElementById('theme-toggle-config');
    const themeIconConfig = document.getElementById('theme-icon-config');
    
    if (themeToggleConfig) {
        const updateThemeConfigUI = () => {
            if (document.body.classList.contains('dark')) {
                if(themeIconConfig) themeIconConfig.classList.replace('fa-moon', 'fa-sun');
            } else {
                if(themeIconConfig) themeIconConfig.classList.replace('fa-sun', 'fa-moon');
            }
        };
        
        // Initial sync
        updateThemeConfigUI();
        
        themeToggleConfig.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Sync nav toggle if it exists
            if(themeIcon) {
                themeIcon.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
                if(themeText) themeText.textContent = isDark ? 'Claro' : 'Oscuro';
            }
            updateThemeConfigUI();
        });
    }

    // Initial Load
    loadDashboardData();
    loadConfigData();
});
