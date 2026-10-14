/**
 * GastoSmart - Core Dashboard Application
 */

let categoryChartInstance = null;
let currentExpensesData = null;
let currentExpenseCurrency = 'USD';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar sesión
  const user = await Auth.checkSession(true);
  if (!user) return;

  // Actualizar datos de usuario en UI
  document.getElementById('user-name').textContent = user.nombre;
  document.getElementById('user-role').textContent = user.rol === 'admin' ? 'Administrador' : 'Usuario';
  document.getElementById('user-avatar').textContent = (user.nombre || 'U').charAt(0).toUpperCase();

  // 2. Inicializar Cotizaciones en Tiempo Real
  await CurrencyManager.init();

  // Inicializar ajustes con datos del usuario
  initUserSettings(user);

  // Fecha fija y bloqueada por defecto en modal
  updateModalLockedDate();

  // 3. Cargar Gastos
  await loadExpenses('mes');

  // Inicializar Conversor y Pizarra de Cotizaciones
  calculateConversion();
  renderQuotesBoard();

  // Inicializar tema guardado
  initTheme();
});

// ==========================================
// Carga y Renderizado de Gastos
// ==========================================
async function loadExpenses(period = 'mes') {
  try {
    const res = await fetch(`/api/expenses?period=${period}`);
    const result = await res.json();

    if (!result.success) {
      showToast('Error al cargar datos financieros', 'error');
      return;
    }

    currentExpensesData = result.data;
    renderDashboard(result.data);
  } catch (error) {
    console.error('Error cargando gastos:', error);
    showToast('Fallo de conexión al cargar gastos', 'error');
  }
}

function renderDashboard(data) {
  const { resumen, desglose_categorias, transacciones, categorias } = data;

  const totalUSD = Number(resumen.total_usd) || 0;
  const storedPeriod = localStorage.getItem('gastosmart_budget_period') || 'mensual';
  const storedCurr = localStorage.getItem('gastosmart_budget_curr') || 'USD';
  const defaultAmount = Number(resumen.limite_usd) || 100;
  const storedAmount = parseFloat(localStorage.getItem('gastosmart_budget_amount')) || 
    (storedCurr === 'USD' ? defaultAmount : CurrencyManager.convert(defaultAmount, 'USD', storedCurr));

  // Gasto Total sincronizado con la moneda preferida del usuario
  const symbols = { USD: '$', PYG: '₲', EUR: '€', BRL: 'R$' };
  const totalEnMoneda = CurrencyManager.convert(totalUSD, 'USD', storedCurr);

  const totalLabelEl = document.getElementById('stat-total-label');
  if (totalLabelEl) totalLabelEl.textContent = `Gasto Total (${storedCurr})`;

  const totalSymEl = document.getElementById('stat-total-symbol');
  if (totalSymEl) totalSymEl.textContent = symbols[storedCurr] || '$';

  const totalUsdEl = document.getElementById('stat-total-usd');
  if (totalUsdEl) totalUsdEl.textContent = CurrencyManager.format(totalEnMoneda, storedCurr);

  const totalPygEl = document.getElementById('stat-total-pyg');
  if (totalPygEl) {
    if (storedCurr === 'USD') {
      totalPygEl.textContent = '≈ ' + CurrencyManager.format(CurrencyManager.convert(totalUSD, 'USD', 'PYG'), 'PYG');
    } else {
      totalPygEl.textContent = '≈ ' + CurrencyManager.format(totalUSD, 'USD');
    }
  }

  // Calcular gasto del período fijado (diario, semanal o mensual)
  let gastoPeriodoUSD = totalUSD;
  if (storedPeriod === 'diario') {
    const todayStr = new Date().toISOString().split('T')[0];
    gastoPeriodoUSD = (transacciones || [])
      .filter(t => t.fecha === todayStr)
      .reduce((acc, t) => acc + (Number(t.monto_usd) || 0), 0);
  } else if (storedPeriod === 'semanal') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateLimitStr = sevenDaysAgo.toISOString().split('T')[0];
    gastoPeriodoUSD = (transacciones || [])
      .filter(t => t.fecha >= dateLimitStr)
      .reduce((acc, t) => acc + (Number(t.monto_usd) || 0), 0);
  }

  const gastoPeriodoEnMoneda = CurrencyManager.convert(gastoPeriodoUSD, 'USD', storedCurr);
  const restanteEnMoneda = Math.max(0, storedAmount - gastoPeriodoEnMoneda);
  const porcentaje = storedAmount > 0 ? Math.min(Math.round((gastoPeriodoEnMoneda / storedAmount) * 100), 100) : 0;

  // Actualizar tarjeta métrica de presupuesto adaptada
  const labelEl = document.getElementById('stat-limite-label');
  if (labelEl) {
    labelEl.textContent = storedPeriod === 'diario' 
      ? 'Presupuesto Diario' 
      : storedPeriod === 'semanal' 
        ? 'Presupuesto Semanal' 
        : 'Presupuesto Mensual';
  }

  document.getElementById('stat-limite-usd').textContent = CurrencyManager.format(storedAmount, storedCurr);

  const subEl = document.getElementById('stat-limite-sub');
  if (subEl) {
    if (storedCurr === 'USD') {
      subEl.textContent = '≈ ' + CurrencyManager.format(CurrencyManager.convert(storedAmount, 'USD', 'PYG'), 'PYG');
    } else {
      subEl.textContent = '≈ ' + CurrencyManager.format(CurrencyManager.convert(storedAmount, storedCurr, 'USD'), 'USD');
    }
  }

  document.getElementById('stat-porcentaje').textContent = `${porcentaje}% consumido`;
  document.getElementById('stat-restante').textContent = `Restante: ${CurrencyManager.format(restanteEnMoneda, storedCurr)}`;

  // Barra de progreso y colores
  const progressBar = document.getElementById('stat-progress-bar');
  progressBar.style.width = `${Math.min(porcentaje, 100)}%`;

  if (porcentaje >= 95) {
    progressBar.className = 'bg-rose-500 h-2.5 rounded-full transition-all duration-500';
  } else if (porcentaje >= 75) {
    progressBar.className = 'bg-amber-500 h-2.5 rounded-full transition-all duration-500';
  } else {
    progressBar.className = 'bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full transition-all duration-500';
  }

  // Banner Alerta Presupuesto
  const alertBanner = document.getElementById('budget-alert-banner');
  if (gastoPeriodoEnMoneda >= storedAmount && storedAmount > 0) {
    alertBanner.classList.remove('hidden');
  } else {
    alertBanner.classList.add('hidden');
  }

  // Tasa de cambio en métricas (si existe)
  const ratePYGEl = document.getElementById('stat-rate-pyg');
  if (ratePYGEl) {
    const ratePYG = Math.round(CurrencyManager.rates.PYG || 7500);
    ratePYGEl.textContent = ratePYG.toLocaleString('es-PY') + ' Gs.';
  }

  // Renderizar Categorías en Select del Modal
  const catSelect = document.getElementById('modal-categoria');
  catSelect.innerHTML = '<option value="" disabled selected>Selecciona una categoría</option>';
  (categorias || []).forEach(cat => {
    catSelect.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
  });

  // Renderizar Gráficos y Listas
  renderCategoryChart(desglose_categorias);
  renderRecentExpenses(transacciones.slice(0, 5));
  renderHistoryTable(transacciones);
}

// ==========================================
// Chart.js - Gráfico de Categorías
// ==========================================
function renderCategoryChart(categories) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  const legendEl = document.getElementById('category-legend');
  legendEl.innerHTML = '';

  if (!categories || categories.length === 0) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    legendEl.innerHTML = '<div class="text-slate-400 text-center py-4">No hay gastos en este período</div>';
    return;
  }

  const labels = categories.map(c => c.nombre);
  const data = categories.map(c => Number(c.total_usd));
  const colors = categories.map(c => c.color || '#10B981');

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      cutout: '72%'
    }
  });

  // Leyenda interactiva personalizada
  categories.forEach(c => {
    legendEl.innerHTML += `
      <div class="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition text-xs border border-transparent hover:border-slate-100">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style="background-color: ${c.color}"></span>
          <span class="font-bold text-slate-800">${escapeHtml(c.nombre)}</span>
        </div>
        <div class="text-right">
          <span class="font-extrabold text-slate-900">$${Number(c.total_usd).toFixed(2)}</span>
          <span class="text-slate-500 font-semibold ml-1">(${c.porcentaje}%)</span>
        </div>
      </div>
    `;
  });
}

// ==========================================
// Formateador de Fechas Humano (Previene saltos 2026- / 10-13)
// ==========================================
function formatDateHuman(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      const today = new Date();
      if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
        return `Hoy, ${day} ${months[month]}`;
      }
      return `${day} ${months[month]} ${year}`;
    }
  } catch (e) {}
  return String(dateStr);
}

// ==========================================
// Transacciones Recientes (Dashboard)
// ==========================================
function renderRecentExpenses(expenses) {
  const listEl = document.getElementById('recent-expenses-list');
  listEl.innerHTML = '';

  if (!expenses || expenses.length === 0) {
    listEl.innerHTML = `
      <div class="py-10 text-center">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-3 border border-emerald-100">
          <i class="fas fa-receipt"></i>
        </div>
        <div class="font-bold text-sm text-slate-800">Aún no tienes gastos registrados</div>
        <p class="text-xs text-slate-500 mt-1 mb-4">Comienza anotando tu primer gasto del mes</p>
        <button onclick="openModal()" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer">
          <i class="fas fa-plus"></i>
          <span>Registrar Primer Gasto</span>
        </button>
      </div>
    `;
    return;
  }

  expenses.forEach(t => {
    const cat = t.categorias || { nombre: 'Otros', icono: 'fa-tags', color: '#10B981' };
    const dateFormatted = formatDateHuman(t.fecha);
    listEl.innerHTML += `
      <div class="py-3 flex items-center justify-between gap-2.5 hover:bg-slate-50/80 px-2 rounded-2xl transition">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs" style="background-color: ${cat.color}15; color: ${cat.color}; border: 1px solid ${cat.color}30">
            <i class="fas ${cat.icono}"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-extrabold text-sm text-slate-900 leading-snug truncate" title="${escapeHtml(t.descripcion)}">${escapeHtml(t.descripcion || 'Gasto registrado')}</div>
            <div class="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-medium overflow-hidden">
              <span class="whitespace-nowrap shrink-0 text-[10px] text-slate-400 font-semibold">${dateFormatted}</span>
              <span class="text-slate-300 shrink-0 text-[8px]">•</span>
              <span class="truncate max-w-[85px] sm:max-w-[130px] font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0" style="background-color: ${cat.color}15; color: ${cat.color}; border: 1px solid ${cat.color}25">
                ${escapeHtml(cat.nombre)}
              </span>
            </div>
          </div>
        </div>
        <div class="text-right shrink-0 pl-1.5">
          <div class="font-black text-sm text-slate-900 whitespace-nowrap">${CurrencyManager.format(t.monto, t.moneda)}</div>
          <div class="text-[10px] font-bold text-emerald-700 mt-0.5 whitespace-nowrap">${t.moneda === 'USD' ? '≈ ' + CurrencyManager.format(CurrencyManager.convert(t.monto, 'USD', 'PYG'), 'PYG') : '≈ $' + Number(t.monto_usd).toFixed(2) + ' USD'}</div>
        </div>
      </div>
    `;
  });
}

// ==========================================
// Tabla de Historial Completo (Cards Móvil + Tabla Desktop)
// ==========================================
function renderHistoryTable(expenses) {
  const tbody = document.getElementById('history-table-body');
  const cardsEl = document.getElementById('history-mobile-cards');
  if (tbody) tbody.innerHTML = '';
  if (cardsEl) cardsEl.innerHTML = '';

  if (!expenses || expenses.length === 0) {
    const emptyHtml = `
      <div class="py-12 text-center">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl mb-2">
          <i class="fas fa-folder-open"></i>
        </div>
        <div class="font-bold text-slate-700 text-sm">No hay transacciones registradas</div>
        <p class="text-xs text-slate-400 mt-1 mb-3">No se encontraron movimientos para el filtro seleccionado</p>
        <button onclick="openModal()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition cursor-pointer">
          <i class="fas fa-plus"></i> Registrar Gasto
        </button>
      </div>
    `;
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6">${emptyHtml}</td></tr>`;
    }
    if (cardsEl) {
      cardsEl.innerHTML = emptyHtml;
    }
    return;
  }

  expenses.forEach(t => {
    const cat = t.categorias || { nombre: 'Otros', icono: 'fa-tags', color: '#10B981' };
    const dateFormatted = formatDateHuman(t.fecha);

    // 1. Fila para Vista Desktop
    if (tbody) {
      tbody.innerHTML += `
        <tr class="hover:bg-emerald-50/40 transition border-b border-slate-100 last:border-none">
          <td class="py-3.5 px-4 text-slate-600 font-semibold text-xs whitespace-nowrap">${dateFormatted}</td>
          <td class="py-3.5 px-4 font-bold text-slate-900 text-sm">${escapeHtml(t.descripcion || 'Sin descripción')}</td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap" style="background-color: ${cat.color}15; color: ${cat.color}; border: 1px solid ${cat.color}25">
              <i class="fas ${cat.icono} text-[10px]"></i>
              ${escapeHtml(cat.nombre)}
            </span>
          </td>
          <td class="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">${CurrencyManager.format(t.monto, t.moneda)}</td>
          <td class="py-3.5 px-4 text-right font-bold text-emerald-700 text-xs whitespace-nowrap">$${Number(t.monto_usd).toFixed(2)} USD</td>
          <td class="py-3.5 px-4 text-center">
            <button onclick="deleteExpense('${t.id}')" class="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition cursor-pointer" title="Eliminar gasto">
              <i class="fas fa-trash-alt text-xs"></i>
            </button>
          </td>
        </tr>
      `;
    }

    // 2. Tarjetas Móviles Ultra Fluidas (Sin colisiones ni desbordamientos)
    if (cardsEl) {
      cardsEl.innerHTML += `
        <div class="p-3.5 flex items-center justify-between gap-2.5 hover:bg-slate-50/70 transition border-b border-slate-100 last:border-none">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs" style="background-color: ${cat.color}15; color: ${cat.color}; border: 1px solid ${cat.color}30">
              <i class="fas ${cat.icono}"></i>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-extrabold text-sm text-slate-900 leading-snug truncate" title="${escapeHtml(t.descripcion)}">${escapeHtml(t.descripcion || 'Gasto registrado')}</div>
              <div class="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-medium overflow-hidden">
                <span class="whitespace-nowrap shrink-0 text-[10px] text-slate-400 font-semibold">${dateFormatted}</span>
                <span class="text-slate-300 shrink-0 text-[8px]">•</span>
                <span class="truncate max-w-[85px] sm:max-w-[130px] font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0" style="background-color: ${cat.color}15; color: ${cat.color}; border: 1px solid ${cat.color}25">
                  ${escapeHtml(cat.nombre)}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 pl-1.5">
            <div class="text-right">
              <div class="font-black text-sm text-slate-900 whitespace-nowrap">${CurrencyManager.format(t.monto, t.moneda)}</div>
              <div class="text-[10px] font-bold text-emerald-700 mt-0.5 whitespace-nowrap">${t.moneda === 'USD' ? '≈ ' + CurrencyManager.format(CurrencyManager.convert(t.monto, 'USD', 'PYG'), 'PYG') : '≈ $' + Number(t.monto_usd).toFixed(2) + ' USD'}</div>
            </div>
            <button onclick="deleteExpense('${t.id}')" class="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer shrink-0" title="Eliminar gasto">
              <i class="fas fa-trash-alt text-[10px]"></i>
            </button>
          </div>
        </div>
      `;
    }
  });
}

// ==========================================
// Eliminar Gasto
// ==========================================
async function deleteExpense(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) return;

  try {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Gasto eliminado exitosamente', 'success');
      loadExpenses(document.getElementById('filter-period').value || 'mes');
    } else {
      showToast(data.message || 'Error al eliminar', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
  }
}

// ==========================================
// Asesor Financiero IA (Google Gemini)
// ==========================================
async function requestAiAdvice() {
  const btn = document.getElementById('btn-ai-advice');
  const container = document.getElementById('ai-result-container');
  const badge = document.getElementById('ai-health-badge');
  const diagnosis = document.getElementById('ai-diagnosis');
  const tipsGrid = document.getElementById('ai-tips-grid');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Analizando tus gastos...</span>';

  try {
    const res = await fetch('/api/ai/advice', { method: 'POST' });
    const result = await res.json();

    if (result.success && result.data) {
      const data = result.data;
      diagnosis.textContent = `"${data.diagnostico}"`;
      
      // Badge de salud financiera
      const health = data.salud_financiera || 'Bueno';
      let badgeColor = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      if (health === 'Precaución') badgeColor = 'bg-amber-100 text-amber-800 border border-amber-200';
      if (health === 'Crítico') badgeColor = 'bg-rose-100 text-rose-800 border border-rose-200';

      badge.className = `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeColor}`;
      badge.textContent = `Salud: ${health}`;

      // Inyectar Consejos
      tipsGrid.innerHTML = '';
      (data.consejos || []).forEach((tip, idx) => {
        tipsGrid.innerHTML += `
          <div class="p-3.5 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-start gap-3">
            <span class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">${idx + 1}</span>
            <p class="text-xs text-slate-800 leading-relaxed font-semibold">${escapeHtml(tip)}</p>
          </div>
        `;
      });

      container.classList.remove('hidden');
      showToast('¡Consejos generados con éxito!', 'success');
    } else {
      showToast(result.message || 'No se pudo obtener el consejo de ahorro', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error de conexión al consultar el asistente', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sparkles"></i> <span>Generar Consejos de Ahorro</span>';
  }
}

// ==========================================
// Enviar Reporte por Email (Brevo API)
// ==========================================
async function sendMonthlyReport() {
  const btn = document.getElementById('btn-brevo-report');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  const periodo = localStorage.getItem('gastosmart_budget_period') || 'mensual';

  try {
    const res = await fetch('/api/mail/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodo })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'Reporte enviado a tu correo', 'success');
    } else {
      showToast(data.message || 'Error al enviar email con Brevo', 'error');
    }
  } catch (err) {
    showToast('Fallo de conexión al enviar email', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-envelope"></i> <span>Enviar Email</span>';
  }
}

// ==========================================
// Modal Nuevo Gasto & Conversión en Vivo
// ==========================================
function updateModalLockedDate() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dateInput = document.getElementById('modal-fecha');
  const dateDisplay = document.getElementById('modal-fecha-texto');
  if (dateInput) dateInput.value = todayStr;
  if (dateDisplay) {
    const formatted = today.toLocaleDateString('es-PY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    dateDisplay.textContent = 'Hoy, ' + formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}

function openModal(prefillAmount, prefillCurr) {
  updateModalLockedDate();
  if (prefillAmount !== undefined && prefillAmount !== null) {
    document.getElementById('modal-monto').value = prefillAmount;
  }
  if (prefillCurr) {
    setExpenseCurrency(prefillCurr);
  }

  const modal = document.getElementById('expense-modal');
  const container = document.getElementById('modal-container');

  modal.classList.remove('hidden');
  setTimeout(() => {
    container.classList.remove('scale-95', 'opacity-0');
    container.classList.add('scale-100', 'opacity-100');
  }, 10);
  document.getElementById('modal-monto').focus();
}

function closeModal() {
  const modal = document.getElementById('expense-modal');
  const container = document.getElementById('modal-container');

  container.classList.remove('scale-100', 'opacity-100');
  container.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    document.getElementById('new-expense-form').reset();
    updateModalLockedDate();
    setExpenseCurrency('USD');
  }, 200);
}

function setExpenseCurrency(curr) {
  currentExpenseCurrency = curr;
  document.querySelectorAll('.curr-opt').forEach(btn => {
    if (btn.dataset.curr === curr) {
      btn.className = 'curr-opt active py-2 text-xs font-black rounded-lg transition bg-white text-emerald-800 shadow-xs border border-emerald-300';
    } else {
      btn.className = 'curr-opt py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900';
    }
  });

  const symbols = { USD: '$', PYG: '₲', EUR: '€', BRL: 'R$' };
  document.getElementById('modal-curr-symbol').textContent = symbols[curr] || '$';
  updateModalPreview();
}

function updateModalPreview() {
  const amount = parseFloat(document.getElementById('modal-monto').value) || 0;
  const preview = document.getElementById('modal-conversion-preview');
  
  if (currentExpenseCurrency === 'USD') {
    const inPYG = CurrencyManager.convert(amount, 'USD', 'PYG');
    preview.textContent = `≈ ${CurrencyManager.format(inPYG, 'PYG')} (Tasa en vivo ExchangeRate-API)`;
  } else {
    const inUSD = CurrencyManager.convert(amount, currentExpenseCurrency, 'USD');
    preview.textContent = `≈ ${CurrencyManager.format(inUSD, 'USD')} (Tasa en vivo)`;
  }
}

document.getElementById('new-expense-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('btn-save-expense');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

  // Asegurar fecha de hoy
  const fechaHoy = new Date().toISOString().split('T')[0];

  const payload = {
    descripcion: document.getElementById('modal-descripcion').value,
    monto: parseFloat(document.getElementById('modal-monto').value),
    moneda: currentExpenseCurrency,
    categoria_id: parseInt(document.getElementById('modal-categoria').value),
    fecha: fechaHoy,
    tasa_usd: CurrencyManager.rates.PYG || 7500
  };

  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      closeModal();
      showToast('¡Gasto registrado correctamente!', 'success');
      loadExpenses('mes');
      if (data.alerta_presupuesto) {
        showToast('⚠️ Presupuesto superado. Alerta enviada por correo.', 'error');
      }
    } else {
      showToast(data.message || 'Error al guardar gasto', 'error');
    }
  } catch (err) {
    showToast('Error de conexión al guardar gasto', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> <span>Guardar Gasto</span>';
  }
});

// ==========================================
// Conversor de Divisas Bidireccional
// ==========================================
function calculateConversion() {
  const amount = parseFloat(document.getElementById('calc-amount').value) || 0;
  const from = document.getElementById('calc-from').value;
  const to = document.getElementById('calc-to').value;
  const resEl = document.getElementById('calc-result');
  const ratesDetailEl = document.getElementById('calc-rates-detail');
  const subEl = document.getElementById('calc-sub-results');

  const converted = CurrencyManager.convert(amount, from, to);
  resEl.textContent = CurrencyManager.format(converted, to);

  // Tasas directas e inversas
  const rateDirect = CurrencyManager.convert(1, from, to);
  const rateInverse = CurrencyManager.convert(1, to, from);

  let rateDirectStr = `1 ${from} = ${CurrencyManager.format(rateDirect, to)}`;
  let rateInverseStr = `1 ${to} = ${CurrencyManager.format(rateInverse, from)}`;

  if (from === 'PYG') {
    const direct100k = CurrencyManager.convert(100000, 'PYG', to);
    rateDirectStr = `100.000 Gs. = ${CurrencyManager.format(direct100k, to)}`;
  }
  if (to === 'PYG') {
    const inverse100k = CurrencyManager.convert(100000, 'PYG', from);
    rateInverseStr = `100.000 Gs. = ${CurrencyManager.format(inverse100k, from)}`;
  }

  if (ratesDetailEl) {
    ratesDetailEl.innerHTML = `
      <span class="px-3 py-1 bg-white rounded-lg border border-emerald-200 shadow-2xs">${rateDirectStr}</span>
      <span class="text-emerald-500 font-black">•</span>
      <span class="px-3 py-1 bg-white rounded-lg border border-emerald-200 shadow-2xs">${rateInverseStr}</span>
    `;
  }

  // Equivalencias Rápidas en otras monedas
  if (subEl) {
    const inUSD = CurrencyManager.convert(amount, from, 'USD');
    const inPYG = CurrencyManager.convert(amount, from, 'PYG');
    const inEUR = CurrencyManager.convert(amount, from, 'EUR');
    const inBRL = CurrencyManager.convert(amount, from, 'BRL');
    subEl.innerHTML = `
      <span>USD: <strong class="text-slate-800">${CurrencyManager.format(inUSD, 'USD')}</strong></span>
      <span class="text-slate-300">|</span>
      <span>PYG: <strong class="text-emerald-700">${CurrencyManager.format(inPYG, 'PYG')}</strong></span>
      <span class="text-slate-300">|</span>
      <span>EUR: <strong class="text-slate-800">${CurrencyManager.format(inEUR, 'EUR')}</strong></span>
      <span class="text-slate-300">|</span>
      <span>BRL: <strong class="text-slate-800">${CurrencyManager.format(inBRL, 'BRL')}</strong></span>
    `;
  }
}

function swapCurrencies() {
  const fromEl = document.getElementById('calc-from');
  const toEl = document.getElementById('calc-to');
  const temp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = temp;
  calculateConversion();
}

function useCalcAsExpense() {
  const amount = parseFloat(document.getElementById('calc-amount').value) || 0;
  const from = document.getElementById('calc-from').value;
  openModal(amount, from);
}

function setCalcCurrencies(from, to) {
  document.getElementById('calc-from').value = from;
  document.getElementById('calc-to').value = to;
  calculateConversion();
  const input = document.getElementById('calc-amount');
  if (input) {
    input.focus();
    const len = input.value ? input.value.length : 0;
    try {
      input.setSelectionRange(len, len);
    } catch (e) {
      const val = input.value;
      input.value = '';
      input.value = val;
    }
    input.scrollLeft = input.scrollWidth;
  }
}

function renderQuotesBoard() {
  const boardGrid = document.getElementById('quotes-board-grid');
  if (!boardGrid) return;

  const pairs = [
    { from: 'USD', to: 'PYG', label: 'Dólar ↔ Guaraní' },
    { from: 'EUR', to: 'PYG', label: 'Euro ↔ Guaraní' },
    { from: 'BRL', to: 'PYG', label: 'Real ↔ Guaraní' },
    { from: 'EUR', to: 'USD', label: 'Euro ↔ Dólar' }
  ];

  boardGrid.innerHTML = '';
  pairs.forEach(p => {
    const direct = CurrencyManager.convert(1, p.from, p.to);
    const inverseVal = p.to === 'PYG' ? 100000 : 1;
    const inverse = CurrencyManager.convert(inverseVal, p.to, p.from);
    const inverseLabel = p.to === 'PYG' ? '100.000 Gs.' : `1 ${p.to}`;

    boardGrid.innerHTML += `
      <div onclick="setCalcCurrencies('${p.from}', '${p.to}')" class="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between group">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-black text-slate-800">${p.label}</span>
          <span class="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition">Calcular</span>
        </div>
        <div class="space-y-1">
          <div class="text-sm font-black text-emerald-800">1 ${p.from} = ${CurrencyManager.format(direct, p.to)}</div>
          <div class="text-xs font-bold text-slate-500">${inverseLabel} = ${CurrencyManager.format(inverse, p.from)}</div>
        </div>
      </div>
    `;
  });
}

// ==========================================
// Ajustes de Perfil y Presupuesto
// ==========================================
function initUserSettings(user) {
  if (document.getElementById('setting-name')) {
    document.getElementById('setting-name').value = user.nombre || '';
  }
  if (document.getElementById('setting-email')) {
    document.getElementById('setting-email').value = user.email || '';
  }
  if (document.getElementById('setting-email-alerts')) {
    document.getElementById('setting-email-alerts').checked = user.notificaciones_email !== false;
  }

  const storedPeriod = localStorage.getItem('gastosmart_budget_period') || 'mensual';
  const storedCurr = localStorage.getItem('gastosmart_budget_curr') || user.moneda_principal || 'USD';
  const storedAmount = localStorage.getItem('gastosmart_budget_amount') || user.limite_mensual_usd || 100;

  // Cargar configuraciones de horarios y días para reportes
  const storedTimeDaily = localStorage.getItem('gastosmart_report_time_daily') || '20:00';
  const storedDaysWeekly = localStorage.getItem('gastosmart_report_days_weekly') || 'Vie';
  const storedTimeWeekly = localStorage.getItem('gastosmart_report_time_weekly') || '19:00';
  const storedDatesMonthly = localStorage.getItem('gastosmart_report_dates_monthly') || 'ultimo';
  const storedTimeMonthly = localStorage.getItem('gastosmart_report_time_monthly') || '09:00';

  if (document.getElementById('setting-report-time-daily')) {
    document.getElementById('setting-report-time-daily').value = storedTimeDaily;
  }
  if (document.getElementById('setting-report-days-weekly')) {
    document.getElementById('setting-report-days-weekly').value = storedDaysWeekly;
    renderWeeklyDaysChips(storedDaysWeekly.split(','));
  }
  if (document.getElementById('setting-report-time-weekly')) {
    document.getElementById('setting-report-time-weekly').value = storedTimeWeekly;
  }
  if (document.getElementById('setting-report-dates-monthly')) {
    setMonthlyDateOption(storedDatesMonthly);
  }
  if (document.getElementById('setting-report-time-monthly')) {
    document.getElementById('setting-report-time-monthly').value = storedTimeMonthly;
  }

  setBudgetPeriod(storedPeriod, false);
  setBudgetCurrency(storedCurr, false);

  const limitInput = document.getElementById('setting-limit');
  if (limitInput) limitInput.value = storedAmount;

  updateBudgetEquivalences();
}

function setBudgetPeriod(period, triggerEquivalences = true) {
  const periodVal = ['diario', 'semanal', 'mensual'].includes(period) ? period : 'mensual';
  document.getElementById('setting-period').value = periodVal;

  const btnDiario = document.getElementById('btn-period-diario');
  const btnSemanal = document.getElementById('btn-period-semanal');
  const btnMensual = document.getElementById('btn-period-mensual');
  const statusEl = document.getElementById('budget-period-status');
  const badge = document.getElementById('budget-projection-badge');

  const panelDiario = document.getElementById('schedule-panel-diario');
  const panelSemanal = document.getElementById('schedule-panel-semanal');
  const panelMensual = document.getElementById('schedule-panel-mensual');

  const activeClass = 'py-2.5 px-2 rounded-lg text-xs font-black transition bg-white text-emerald-800 shadow-xs border border-emerald-300 cursor-pointer';
  const inactiveClass = 'py-2.5 px-2 rounded-lg text-xs font-bold transition text-slate-600 hover:text-slate-900 cursor-pointer';

  if (btnDiario) btnDiario.className = periodVal === 'diario' ? activeClass : inactiveClass;
  if (btnSemanal) btnSemanal.className = periodVal === 'semanal' ? activeClass : inactiveClass;
  if (btnMensual) btnMensual.className = periodVal === 'mensual' ? activeClass : inactiveClass;

  if (panelDiario) panelDiario.classList.toggle('hidden', periodVal !== 'diario');
  if (panelSemanal) panelSemanal.classList.toggle('hidden', periodVal !== 'semanal');
  if (panelMensual) panelMensual.classList.toggle('hidden', periodVal !== 'mensual');

  if (statusEl) {
    statusEl.textContent = periodVal === 'diario' ? 'Frecuencia Diaria' : periodVal === 'semanal' ? 'Frecuencia Semanal' : 'Frecuencia Mensual';
  }

  if (badge) {
    if (periodVal === 'diario') badge.textContent = 'Base Diaria (x30 proyectado)';
    else if (periodVal === 'semanal') badge.textContent = 'Base Semanal (x4.33 proyectado)';
    else badge.textContent = 'Base Mensual';
  }

  if (triggerEquivalences) updateBudgetEquivalences();
}

function toggleWeeklyDay(day) {
  const input = document.getElementById('setting-report-days-weekly');
  if (!input) return;
  let currentDays = input.value ? input.value.split(',').map(d => d.trim()).filter(Boolean) : ['Vie'];

  if (currentDays.includes(day)) {
    if (currentDays.length > 1) {
      currentDays = currentDays.filter(d => d !== day);
    }
  } else {
    currentDays.push(day);
  }

  input.value = currentDays.join(',');
  renderWeeklyDaysChips(currentDays);
}

function renderWeeklyDaysChips(selectedDays) {
  const container = document.getElementById('weekly-days-chips');
  if (!container) return;
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  container.innerHTML = days.map(d => {
    const isSelected = selectedDays.includes(d);
    return `
      <button type="button" onclick="toggleWeeklyDay('${d}')" class="weekly-day-chip px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
        isSelected 
          ? 'font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs' 
          : 'font-bold bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
      }" data-day="${d}">${d}</button>
    `;
  }).join('');
}

function setMonthlyDateOption(opt) {
  const input = document.getElementById('setting-report-dates-monthly');
  if (input) input.value = opt;

  document.querySelectorAll('.monthly-date-opt').forEach(btn => {
    const isCurrent = btn.dataset.opt === opt;
    if (isCurrent) {
      btn.className = 'monthly-date-opt p-2.5 rounded-xl text-xs border transition bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs text-left cursor-pointer';
      const title = btn.querySelector('div:first-child');
      const sub = btn.querySelector('div:last-child');
      if (title) title.className = 'font-black text-emerald-900';
      if (sub) sub.className = 'text-[10px] text-emerald-700/80 mt-0.5';
    } else {
      btn.className = 'monthly-date-opt p-2.5 rounded-xl text-xs border transition bg-white text-slate-700 border-slate-200 text-left hover:border-slate-300 cursor-pointer';
      const title = btn.querySelector('div:first-child');
      const sub = btn.querySelector('div:last-child');
      if (title) title.className = 'font-black text-slate-800';
      if (sub) sub.className = 'text-[10px] text-slate-500 mt-0.5';
    }
  });
}

function setBudgetCurrency(curr, triggerEquivalences = true) {
  document.getElementById('setting-currency').value = curr;
  localStorage.setItem('gastosmart_budget_curr', curr);
  const symbols = { USD: '$', PYG: '₲', EUR: '€', BRL: 'R$' };
  const names = { USD: 'Dólares (USD)', PYG: 'Guaraníes (PYG)', EUR: 'Euros (EUR)', BRL: 'Reales (BRL)' };

  document.querySelectorAll('.budget-curr-btn').forEach(btn => {
    if (btn.dataset.curr === curr) {
      btn.className = 'budget-curr-btn py-2.5 text-xs font-black rounded-xl transition bg-white text-emerald-800 shadow-xs border border-emerald-300';
    } else {
      btn.className = 'budget-curr-btn py-2.5 text-xs font-bold rounded-xl transition text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200';
    }
  });

  const symEl = document.getElementById('setting-curr-symbol');
  if (symEl) symEl.textContent = symbols[curr] || '$';

  const currLabel = document.getElementById('budget-curr-label');
  if (currLabel) currLabel.textContent = `En ${names[curr] || curr}`;

  if (triggerEquivalences) {
    updateBudgetEquivalences();
    if (typeof currentExpensesData !== 'undefined' && currentExpensesData) {
      renderDashboard(currentExpensesData);
    }
  }
}

function updateBudgetEquivalences() {
  const amount = parseFloat(document.getElementById('setting-limit').value) || 0;
  const curr = document.getElementById('setting-currency').value || 'USD';
  const period = document.getElementById('setting-period').value || 'mensual';
  const grid = document.getElementById('budget-equivalences-grid');
  if (!grid) return;

  const inUSD = CurrencyManager.convert(amount, curr, 'USD');
  const inPYG = CurrencyManager.convert(amount, curr, 'PYG');
  const inEUR = CurrencyManager.convert(amount, curr, 'EUR');
  const inBRL = CurrencyManager.convert(amount, curr, 'BRL');

  const suffix = period === 'diario' ? '/día' : period === 'semanal' ? '/sem' : '/mes';

  grid.innerHTML = `
    <div class="p-2.5 rounded-xl bg-white border border-emerald-200 text-center shadow-2xs overflow-hidden">
      <span class="text-[10px] uppercase font-black text-slate-500">Dólares</span>
      <div class="text-[11px] sm:text-xs font-black text-slate-900 mt-0.5 truncate" title="${CurrencyManager.format(inUSD, 'USD')} ${suffix}">${CurrencyManager.format(inUSD, 'USD')} <span class="text-[10px] font-bold text-slate-400">${suffix}</span></div>
    </div>
    <div class="p-2.5 rounded-xl bg-white border border-emerald-200 text-center shadow-2xs overflow-hidden">
      <span class="text-[10px] uppercase font-black text-slate-500">Guaraníes</span>
      <div class="text-[11px] sm:text-xs font-black text-emerald-800 mt-0.5 truncate" title="${CurrencyManager.format(inPYG, 'PYG')} ${suffix}">${CurrencyManager.format(inPYG, 'PYG')} <span class="text-[10px] font-bold text-slate-400">${suffix}</span></div>
    </div>
    <div class="p-2.5 rounded-xl bg-white border border-emerald-200 text-center shadow-2xs overflow-hidden">
      <span class="text-[10px] uppercase font-black text-slate-500">Euros</span>
      <div class="text-[11px] sm:text-xs font-black text-slate-900 mt-0.5 truncate" title="${CurrencyManager.format(inEUR, 'EUR')} ${suffix}">${CurrencyManager.format(inEUR, 'EUR')} <span class="text-[10px] font-bold text-slate-400">${suffix}</span></div>
    </div>
    <div class="p-2.5 rounded-xl bg-white border border-emerald-200 text-center shadow-2xs overflow-hidden">
      <span class="text-[10px] uppercase font-black text-slate-500">Reales</span>
      <div class="text-[11px] sm:text-xs font-black text-slate-900 mt-0.5 truncate" title="${CurrencyManager.format(inBRL, 'BRL')} ${suffix}">${CurrencyManager.format(inBRL, 'BRL')} <span class="text-[10px] font-bold text-slate-400">${suffix}</span></div>
    </div>
  `;
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-save-settings');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando ajustes...';

  const nombre = document.getElementById('setting-name').value.trim();
  const email = document.getElementById('setting-email').value.trim();
  const limitAmount = parseFloat(document.getElementById('setting-limit').value) || 0;
  const limitCurr = document.getElementById('setting-currency').value;
  const limitPeriod = document.getElementById('setting-period').value;
  const notificaciones_email = document.getElementById('setting-email-alerts').checked;

  const timeDaily = document.getElementById('setting-report-time-daily')?.value || '20:00';
  const daysWeekly = document.getElementById('setting-report-days-weekly')?.value || 'Vie';
  const timeWeekly = document.getElementById('setting-report-time-weekly')?.value || '19:00';
  const datesMonthly = document.getElementById('setting-report-dates-monthly')?.value || 'ultimo';
  const timeMonthly = document.getElementById('setting-report-time-monthly')?.value || '09:00';

  // Calcular el límite normalizado mensual en USD para Supabase
  const limitInUSD = CurrencyManager.convert(limitAmount, limitCurr, 'USD');
  const monthlyUSD = limitPeriod === 'diario'
    ? Number((limitInUSD * 30.42).toFixed(2))
    : limitPeriod === 'semanal' 
      ? Number((limitInUSD * 4.33).toFixed(2)) 
      : Number(limitInUSD.toFixed(2));

  try {
    const res = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        email,
        limite_mensual_usd: monthlyUSD,
        moneda_principal: limitCurr,
        notificaciones_email
      })
    });
    const data = await res.json();
    if (data.success) {
      // Guardar preferencias locales completas
      localStorage.setItem('gastosmart_budget_period', limitPeriod);
      localStorage.setItem('gastosmart_budget_curr', limitCurr);
      localStorage.setItem('gastosmart_budget_amount', limitAmount.toString());
      localStorage.setItem('gastosmart_report_time_daily', timeDaily);
      localStorage.setItem('gastosmart_report_days_weekly', daysWeekly);
      localStorage.setItem('gastosmart_report_time_weekly', timeWeekly);
      localStorage.setItem('gastosmart_report_dates_monthly', datesMonthly);
      localStorage.setItem('gastosmart_report_time_monthly', timeMonthly);

      document.getElementById('user-name').textContent = nombre;
      document.getElementById('user-avatar').textContent = (nombre || 'U').charAt(0).toUpperCase();

      showToast('¡Ajustes y programación guardados exitosamente!', 'success');
      await loadExpenses('mes');
    } else {
      showToast(data.message || 'Error al guardar ajustes', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error de conexión al guardar ajustes', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Guardar Ajustes';
  }
});

// ==========================================
// SPA Navegación entre Vistas
// ==========================================
function switchView(viewName) {
  document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.remove('hidden');

  // Actualizar botones desktop
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.className = 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-sm transition-all bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs';
    } else {
      btn.className = 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-slate-600 hover:bg-slate-100 hover:text-slate-900';
    }
  });

  // Actualizar botones móvil manteniendo la estructura del grid de 5 columnas
  document.querySelectorAll('.nav-btn-mobile').forEach(btn => {
    const isCurrent = btn.dataset.view === viewName;
    if (isCurrent) {
      btn.className = 'nav-btn-mobile flex flex-col items-center justify-center h-full text-emerald-700 text-center w-full transition-colors cursor-pointer';
      const label = btn.querySelector('span');
      if (label) label.className = 'text-[10px] font-black tracking-tight leading-none mt-1';
    } else {
      btn.className = 'nav-btn-mobile flex flex-col items-center justify-center h-full text-slate-400 hover:text-slate-600 text-center w-full transition-colors cursor-pointer';
      const label = btn.querySelector('span');
      if (label) label.className = 'text-[10px] font-bold tracking-tight leading-none mt-1';
    }
  });

  if (viewName === 'conversor') calculateConversion();
}

// ==========================================
// Tema y Notificaciones
// ==========================================
function initTheme() {
  // Base cálida por defecto
}

function toggleDarkMode() {
  // Modo unificado cálido
}

// ==========================================
// Notificaciones Toast
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  let bgClass = 'bg-stone-900 text-white';
  let icon = 'fas fa-info-circle';

  if (type === 'success') {
    bgClass = 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-emerald-600/30';
    icon = 'fas fa-check-circle';
  } else if (type === 'error') {
    bgClass = 'bg-rose-600 text-white shadow-rose-600/30';
    icon = 'fas fa-exclamation-circle';
  }

  toast.className = `fixed top-5 right-5 z-[100] transform transition-all duration-300 translate-y-0 opacity-100 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-medium ${bgClass}`;
  toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHtml(message)}</span>`;

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-[-100px]', 'opacity-0');
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
