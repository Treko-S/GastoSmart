/**
 * GastoSmart - Recorrido Guiado Interactivo (Onboarding Tour)
 * Funciona perfectamente tanto en PC como en móviles.
 * Permite avanzar, retroceder, saltar u omitir en cualquier momento.
 */

const GastoSmartTour = (() => {
  let currentStep = 0;
  let currentUserId = null;
  let isOpen = false;

  const STEPS = [
    {
      step: 1,
      badge: 'Paso 1 de 5',
      progress: 20,
      view: 'resumen',
      icon: 'fas fa-chart-pie',
      iconBg: 'bg-emerald-100 text-emerald-700',
      title: '¡Bienvenido a GastoSmart! 🚀',
      subtitle: 'Tu centro de control financiero',
      description: 'Aquí tienes un resumen en tiempo real de tu balance, tu gasto total y el margen de presupuesto disponible. Además, el gráfico de dona clasifica visualmente todas tus compras por categoría.',
      tip: 'Tip: Los valores se actualizan al instante con cada movimiento.'
    },
    {
      step: 2,
      badge: 'Paso 2 de 5',
      progress: 40,
      view: 'resumen',
      icon: 'fas fa-plus-circle',
      iconBg: 'bg-teal-100 text-teal-700',
      title: 'Registra Gastos en Segundos ➕',
      subtitle: 'Multi-moneda y fecha automática',
      description: 'Anota compras en Dólares ($), Guaraníes (₲), Euros (€) o Reales (R$). La app convierte los montos de forma automática a tu moneda base y bloquea la fecha para mantener un registro histórico fiable.',
      tip: 'En móvil: Toca el botón verde "+" al centro de la barra inferior.<br>En PC: Usa el botón "Registrar Gasto" superior.'
    },
    {
      step: 3,
      badge: 'Paso 3 de 5',
      progress: 60,
      view: 'historial',
      icon: 'fas fa-list-ul',
      iconBg: 'bg-blue-100 text-blue-700',
      title: 'Historial y Filtros 📜',
      subtitle: 'Audita y administra cada movimiento',
      description: 'Revisa todas tus compras organizadas cronológicamente. En computadora dispones de una tabla completa y en celular de tarjetas táctiles compactas con categoría, monto y fecha.',
      tip: 'Puedes filtrar por mes, semana o año, además de editar o eliminar cualquier registro.'
    },
    {
      step: 4,
      badge: 'Paso 4 de 5',
      progress: 80,
      view: 'conversor',
      icon: 'fas fa-coins',
      iconBg: 'bg-amber-100 text-amber-700',
      title: 'Conversor y Cotizaciones en Vivo 💱',
      subtitle: 'Tasas cambiarias en tiempo real',
      description: 'Consulta cotizaciones oficiales del mercado (USD, PYG, EUR, BRL) actualizadas automáticamente. Convierte cualquier monto de ida y vuelta y pásalo directo a gasto con un toque.',
      tip: 'Toca cualquier tarjeta de la pizarra para cargarla instantáneamente en el conversor.'
    },
    {
      step: 5,
      badge: 'Paso 5 de 5',
      progress: 100,
      view: 'ajustes',
      icon: 'fas fa-sliders-h',
      iconBg: 'bg-purple-100 text-purple-700',
      title: 'Ajustes y Alertas Preventivas ⚙️',
      subtitle: 'Límites personalizados a tu medida',
      description: 'Fija un presupuesto límite (semanal o mensual) en la moneda que elijas. Si te acercas o sobrepasas tu límite, GastoSmart te alertará en pantalla y te enviará un correo preventivo.',
      tip: 'Aquí también puedes cambiar tu nombre, correo y cerrar sesión de forma segura.'
    }
  ];

  function getStorageKey(userId) {
    return 'gastosmart_tour_v1_' + (userId || 'guest');
  }

  function createTourElements() {
    if (document.getElementById('gs-tour-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'gs-tour-overlay';
    overlay.className = 'fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-300 opacity-0 pointer-events-none';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'gs-tour-title');

    overlay.innerHTML = `
      <div id="gs-tour-card" class="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-6 sm:p-7 shadow-2xl border border-slate-200/80 transform transition-all duration-300 scale-95 flex flex-col relative">
        
        <!-- Barra de Progreso Superior -->
        <div class="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
          <div id="gs-tour-progress" class="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 transition-all duration-300" style="width: 20%"></div>
        </div>

        <!-- Cabecera del Tour -->
        <div class="flex items-center justify-between pt-1 mb-4">
          <span id="gs-tour-badge" class="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Paso 1 de 5
          </span>
          <button type="button" onclick="GastoSmartTour.skip()" class="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg transition cursor-pointer" title="Omitir recorrido guiado">
            <span>Omitir</span>
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>

        <!-- Cuerpo del Paso -->
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div id="gs-tour-icon-box" class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 bg-emerald-100 text-emerald-700 shadow-2xs">
              <i id="gs-tour-icon" class="fas fa-chart-pie"></i>
            </div>
            <div>
              <h3 id="gs-tour-title" class="font-display font-black text-lg text-slate-900 leading-tight">Título del Paso</h3>
              <p id="gs-tour-subtitle" class="text-xs text-slate-500 font-bold mt-0.5">Subtítulo explicativo</p>
            </div>
          </div>

          <p id="gs-tour-desc" class="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium pt-1">
            Descripción detallada del paso...
          </p>

          <div id="gs-tour-tip-box" class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-semibold flex items-start gap-2">
            <i class="fas fa-lightbulb text-amber-500 mt-0.5 shrink-0"></i>
            <span id="gs-tour-tip">Consejo útil</span>
          </div>
        </div>

        <!-- Indicador de Puntos (Dots) -->
        <div class="flex items-center justify-center gap-1.5 my-5" id="gs-tour-dots">
          ${STEPS.map((_, i) => `
            <button type="button" onclick="GastoSmartTour.goTo(${i})" class="gs-tour-dot w-2 h-2 rounded-full transition-all duration-200 ${i === 0 ? 'bg-emerald-600 w-6' : 'bg-slate-200 hover:bg-slate-300'}" aria-label="Ir al paso ${i + 1}"></button>
          `).join('')}
        </div>

        <!-- Botones de Acción Inferiores -->
        <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button type="button" id="gs-tour-btn-prev" onclick="GastoSmartTour.prev()" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <i class="fas fa-arrow-left mr-1"></i>
            <span>Anterior</span>
          </button>

          <div class="flex items-center gap-2">
            <button type="button" id="gs-tour-btn-next" onclick="GastoSmartTour.next()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5">
              <span id="gs-tour-btn-next-text">Siguiente</span>
              <i id="gs-tour-btn-next-icon" class="fas fa-arrow-right text-[11px]"></i>
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
  }

  function renderStep(index) {
    if (index < 0 || index >= STEPS.length) return;
    currentStep = index;
    const s = STEPS[index];

    // Cambiar la vista de la SPA si corresponde para que el usuario vea la sección real
    if (typeof switchView === 'function') {
      try {
        switchView(s.view);
      } catch (e) {
        console.warn('Error al cambiar vista en tour:', e);
      }
    }

    // Actualizar elementos visuales del modal
    const badge = document.getElementById('gs-tour-badge');
    const title = document.getElementById('gs-tour-title');
    const subtitle = document.getElementById('gs-tour-subtitle');
    const desc = document.getElementById('gs-tour-desc');
    const tip = document.getElementById('gs-tour-tip');
    const iconBox = document.getElementById('gs-tour-icon-box');
    const icon = document.getElementById('gs-tour-icon');
    const progress = document.getElementById('gs-tour-progress');
    const btnPrev = document.getElementById('gs-tour-btn-prev');
    const btnNextText = document.getElementById('gs-tour-btn-next-text');
    const btnNextIcon = document.getElementById('gs-tour-btn-next-icon');

    if (badge) badge.textContent = s.badge;
    if (title) title.textContent = s.title;
    if (subtitle) subtitle.textContent = s.subtitle;
    if (desc) desc.innerHTML = s.description;
    if (tip) tip.innerHTML = s.tip;
    if (progress) progress.style.width = `${s.progress}%`;

    if (iconBox) {
      iconBox.className = `w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-2xs ${s.iconBg}`;
    }
    if (icon) {
      icon.className = s.icon;
    }

    // Manejar estado de botón Anterior
    if (btnPrev) {
      btnPrev.disabled = (index === 0);
    }

    // Manejar estado de botón Siguiente / Finalizar
    const isLast = (index === STEPS.length - 1);
    if (btnNextText) {
      btnNextText.textContent = isLast ? '¡Comenzar ahora!' : 'Siguiente';
    }
    if (btnNextIcon) {
      btnNextIcon.className = isLast ? 'fas fa-check text-[11px]' : 'fas fa-arrow-right text-[11px]';
    }

    // Actualizar Puntos (Dots)
    const dots = document.querySelectorAll('.gs-tour-dot');
    dots.forEach((dot, i) => {
      if (i === index) {
        dot.className = 'gs-tour-dot w-6 h-2 rounded-full transition-all duration-200 bg-emerald-600';
      } else {
        dot.className = 'gs-tour-dot w-2 h-2 rounded-full transition-all duration-200 bg-slate-200 hover:bg-slate-300';
      }
    });
  }

  function start(force = false, userId = null) {
    if (userId) currentUserId = userId;
    createTourElements();

    const overlay = document.getElementById('gs-tour-overlay');
    const card = document.getElementById('gs-tour-card');
    if (!overlay || !card) return;

    isOpen = true;
    currentStep = 0;
    renderStep(0);

    // Animación de entrada
    overlay.classList.remove('pointer-events-none');
    overlay.classList.remove('opacity-0');
    overlay.classList.add('opacity-100');

    card.classList.remove('scale-95');
    card.classList.add('scale-100');
  }

  function close() {
    const overlay = document.getElementById('gs-tour-overlay');
    const card = document.getElementById('gs-tour-card');
    if (!overlay || !card) return;

    isOpen = false;
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    overlay.classList.add('pointer-events-none');

    card.classList.remove('scale-100');
    card.classList.add('scale-95');

    // Volver a la vista de resumen por orden
    if (typeof switchView === 'function') {
      try {
        switchView('resumen');
      } catch (e) {}
    }
  }

  function next() {
    if (currentStep < STEPS.length - 1) {
      renderStep(currentStep + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (currentStep > 0) {
      renderStep(currentStep - 1);
    }
  }

  function goTo(index) {
    renderStep(index);
  }

  function finish() {
    markAsCompleted();
    close();
    // Feedback amigable
    if (typeof showToast === 'function') {
      showToast('¡Recorrido completado! Ya puedes usar GastoSmart.', 'success');
    }
  }

  function skip() {
    markAsCompleted();
    close();
    if (typeof showToast === 'function') {
      showToast('Recorrido omitido. Puedes repetirlo cuando quieras en Ajustes.', 'info');
    }
  }

  function markAsCompleted() {
    try {
      const key = getStorageKey(currentUserId);
      localStorage.setItem(key, 'true');
      localStorage.setItem('gastosmart_tour_v1_generic', 'true');
    } catch (e) {
      console.warn('No se pudo guardar estado del tour en localStorage:', e);
    }
  }

  function checkAndAutoStart(userId) {
    currentUserId = userId;
    try {
      const key = getStorageKey(userId);
      const done = localStorage.getItem(key) || localStorage.getItem('gastosmart_tour_v1_generic');
      if (!done) {
        // Breve retraso para que los datos financieros iniciales se rendericen primero
        setTimeout(() => {
          start(false, userId);
        }, 850);
      }
    } catch (e) {
      console.warn('Error verificando tour de nuevo usuario:', e);
    }
  }

  return {
    start,
    next,
    prev,
    goTo,
    skip,
    close,
    finish,
    checkAndAutoStart
  };
})();

window.GastoSmartTour = GastoSmartTour;
