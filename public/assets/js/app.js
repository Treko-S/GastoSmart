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

  // Inicializar ajustes
  if (document.getElementById('setting-name')) document.getElementById('setting-name').value = user.nombre || '';
  if (document.getElementById('setting-limit')) document.getElementById('setting-limit').value = user.limite_mensual_usd || 1000;
  if (document.getElementById('setting-email-alerts')) document.getElementById('setting-email-alerts').checked = user.notificaciones_email !== false;

  // 2. Inicializar Cotizaciones en Tiempo Real
  await CurrencyManager.init();

  // Fecha por defecto en modal
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('modal-fecha').value = today;

  // 3. Cargar Gastos
  await loadExpenses('mes');

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

  // Métricas principales
  const totalUSD = Number(resumen.total_usd) || 0;
  const limiteUSD = Number(resumen.limite_usd) || 1000;
  const restanteUSD = Number(resumen.restante_usd) || 0;
  const porcentaje = Number(resumen.porcentaje_usado) || 0;

  document.getElementById('stat-total-usd').textContent = CurrencyManager.format(totalUSD, 'USD');
  document.getElementById('stat-total-pyg').textContent = '≈ ' + CurrencyManager.format(CurrencyManager.convert(totalUSD, 'USD', 'PYG'), 'PYG');
  
  document.getElementById('stat-limite-usd').textContent = CurrencyManager.format(limiteUSD, 'USD');
  document.getElementById('stat-porcentaje').textContent = `${porcentaje}% consumido`;
  document.getElementById('stat-restante').textContent = `Restante: ${CurrencyManager.format(restanteUSD, 'USD')}`;

  // Barra de progreso y colores
  const progressBar = document.getElementById('stat-progress-bar');
  progressBar.style.width = `${Math.min(porcentaje, 100)}%`;

  if (porcentaje >= 95) {
    progressBar.className = 'bg-red-500 h-2 rounded-full transition-all duration-500';
  } else if (porcentaje >= 75) {
    progressBar.className = 'bg-amber-500 h-2 rounded-full transition-all duration-500';
  } else {
    progressBar.className = 'bg-primary h-2 rounded-full transition-all duration-500';
  }

  // Banner Alerta Presupuesto
  const alertBanner = document.getElementById('budget-alert-banner');
  if (resumen.alerta_superada) {
    alertBanner.classList.remove('hidden');
  } else {
    alertBanner.classList.add('hidden');
  }

  // Tasa de cambio en métricas
  const ratePYG = Math.round(CurrencyManager.rates.PYG || 7500);
  document.getElementById('stat-rate-pyg').textContent = ratePYG.toLocaleString('es-PY') + ' Gs.';

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
      <div class="flex items-center justify-between text-slate-600 dark:text-slate-400">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${c.color}"></span>
          <span>${c.nombre}</span>
        </div>
        <span class="font-bold text-slate-800 dark:text-slate-200">$${Number(c.total_usd).toFixed(2)} (${c.porcentaje}%)</span>
      </div>
    `;
  });
}

// ==========================================
// Transacciones Recientes (Dashboard)
// ==========================================
function renderRecentExpenses(expenses) {
  const listEl = document.getElementById('recent-expenses-list');
  listEl.innerHTML = '';

  if (!expenses || expenses.length === 0) {
    listEl.innerHTML = '<div class="py-6 text-center text-slate-400 text-sm">No has registrado transacciones aún.</div>';
    return;
  }

  expenses.forEach(t => {
    const cat = t.categorias || { nombre: 'Otros', icono: 'fa-tags', color: '#6B7280' };
    listEl.innerHTML += `
      <div class="py-3.5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0" style="background-color: ${cat.color}20; color: ${cat.color}">
            <i class="fas ${cat.icono}"></i>
          </div>
          <div>
            <div class="font-bold text-sm text-slate-800 dark:text-white">${escapeHtml(t.descripcion)}</div>
            <div class="text-xs text-slate-400">${t.fecha} • <span style="color: ${cat.color}">${cat.nombre}</span></div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-extrabold text-sm text-slate-900 dark:text-white">${CurrencyManager.format(t.monto, t.moneda)}</div>
          <div class="text-[11px] text-slate-400">≈ $${Number(t.monto_usd).toFixed(2)} USD</div>
        </div>
      </div>
    `;
  });
}

// ==========================================
// Tabla de Historial Completo
// ==========================================
function renderHistoryTable(expenses) {
  const tbody = document.getElementById('history-table-body');
  tbody.innerHTML = '';

  if (!expenses || expenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">No hay transacciones registradas</td></tr>';
    return;
  }

  expenses.forEach(t => {
    const cat = t.categorias || { nombre: 'Otros', icono: 'fa-tags', color: '#6B7280' };
    tbody.innerHTML += `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
        <td class="py-3.5 px-4 text-slate-500 font-medium">${t.fecha}</td>
        <td class="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${escapeHtml(t.descripcion)}</td>
        <td class="py-3.5 px-4">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style="background-color: ${cat.color}15; color: ${cat.color}">
            <i class="fas ${cat.icono} text-[10px]"></i>
            ${cat.nombre}
          </span>
        </td>
        <td class="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">${CurrencyManager.format(t.monto, t.moneda)}</td>
        <td class="py-3.5 px-4 text-right font-semibold text-slate-500">$${Number(t.monto_usd).toFixed(2)}</td>
        <td class="py-3.5 px-4 text-center">
          <button onclick="deleteExpense('${t.id}')" class="text-slate-400 hover:text-red-500 transition p-1.5" title="Eliminar gasto">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </td>
      </tr>
    `;
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
  btn.innerHTML = '<i class="fas fa-brain fa-spin"></i> <span>Analizando con Gemini...</span>';

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
          <div class="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm flex items-start gap-3">
            <span class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">${idx + 1}</span>
            <p class="text-xs text-textMain leading-relaxed font-medium">${tip}</p>
          </div>
        `;
      });

      container.classList.remove('hidden');
      showToast('¡Análisis de IA completado con éxito!', 'success');
    } else {
      showToast(result.message || 'No se pudo obtener el consejo de IA', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error de conexión al consultar Gemini', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-brain"></i> <span>Analizar mis Gastos con IA</span>';
  }
}

// ==========================================
// Enviar Reporte por Email (Brevo API)
// ==========================================
async function sendMonthlyReport() {
  const btn = document.getElementById('btn-brevo-report');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  try {
    const res = await fetch('/api/mail/send-report', { method: 'POST' });
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
function openModal() {
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
    document.getElementById('modal-fecha').value = new Date().toISOString().split('T')[0];
    setExpenseCurrency('USD');
  }, 200);
}

function setExpenseCurrency(curr) {
  currentExpenseCurrency = curr;
  document.querySelectorAll('.curr-opt').forEach(btn => {
    if (btn.dataset.curr === curr) {
      btn.className = 'curr-opt active py-1.5 text-xs font-bold rounded-lg transition bg-white text-emerald-700 shadow-sm border border-emerald-200';
    } else {
      btn.className = 'curr-opt py-1.5 text-xs font-bold rounded-lg transition text-textMuted hover:text-textMain';
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

  const payload = {
    descripcion: document.getElementById('modal-descripcion').value,
    monto: parseFloat(document.getElementById('modal-monto').value),
    moneda: currentExpenseCurrency,
    categoria_id: parseInt(document.getElementById('modal-categoria').value),
    fecha: document.getElementById('modal-fecha').value,
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
        showToast('⚠️ Presupuesto mensual superado. Alerta enviada por Brevo.', 'error');
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
// Conversor de Divisas Interactivo
// ==========================================
function calculateConversion() {
  const amount = parseFloat(document.getElementById('calc-amount').value) || 0;
  const from = document.getElementById('calc-from').value;
  const resEl = document.getElementById('calc-result');
  const subEl = document.getElementById('calc-sub-results');

  const inUSD = CurrencyManager.convert(amount, from, 'USD');
  const inPYG = CurrencyManager.convert(amount, from, 'PYG');
  const inEUR = CurrencyManager.convert(amount, from, 'EUR');
  const inBRL = CurrencyManager.convert(amount, from, 'BRL');

  if (from === 'USD') {
    resEl.textContent = CurrencyManager.format(inPYG, 'PYG');
  } else {
    resEl.textContent = CurrencyManager.format(inUSD, 'USD');
  }

  subEl.innerHTML = `
    <span>${CurrencyManager.format(inEUR, 'EUR')}</span> • 
    <span>${CurrencyManager.format(inBRL, 'BRL')}</span> • 
    <span>${CurrencyManager.format(inPYG, 'PYG')}</span>
  `;
}

// ==========================================
// Ajustes de Perfil
// ==========================================
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('setting-name').value;
  const limite_mensual_usd = parseFloat(document.getElementById('setting-limit').value);
  const notificaciones_email = document.getElementById('setting-email-alerts').checked;

  try {
    const res = await fetch('/api/auth/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, limite_mensual_usd, notificaciones_email })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Ajustes guardados exitosamente', 'success');
      document.getElementById('user-name').textContent = nombre;
      loadExpenses('mes');
    } else {
      showToast(data.message || 'Error al actualizar', 'error');
    }
  } catch (err) {
    showToast('Error de conexión', 'error');
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
      btn.className = 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm';
    } else {
      btn.className = 'nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all text-textMuted hover:bg-surfaceSoft hover:text-textMain';
    }
  });

  // Actualizar botones móvil
  document.querySelectorAll('.nav-btn-mobile').forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.className = 'nav-btn-mobile flex flex-col items-center gap-1 text-emerald-700 text-xs font-bold';
    } else {
      btn.className = 'nav-btn-mobile flex flex-col items-center gap-1 text-textLight text-xs font-semibold';
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
