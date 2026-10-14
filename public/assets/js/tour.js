/**
 * GastoSmart - Recorrido Guiado Interactivo Profesional
 * - Jerarquía Z-Index Infalible: Popover (1000120) y Spotlight (1000105) siempre por encima de cualquier elemento
 * - Ninguna tarjeta del DOM recibe z-index elevado, evitando totalmente que tapen o corten el popover
 * - Foco esmeralda (Spotlight) sincronizado en tiempo real a 60fps con rastreo de scroll en <main> y animación de seguimiento
 * - Desactivación de transiciones CSS durante scroll para evitar retrasos o rebotes visuales
 * - Posicionamiento adaptativo ultra robusto: evalúa 4 cuadrantes (abajo, arriba, derecha, izquierda) con fallback dock visible 100%
 * - Paso 2 Interactivo con Modo Demostración que no guarda datos reales
 */

const GastoSmartTour = (() => {
  let currentStep = 0;
  let currentUserId = null;
  let isActive = false;
  let isDemoModeActive = false;
  let currentTargetEl = null;
  let rafId = null;
  let listenersAttached = false;

  const STEPS = [
    {
      step: 1,
      badge: '1 de 5',
      category: 'Presupuesto y Gasto',
      view: 'resumen',
      getTarget: () => document.getElementById('tour-card-total') || document.getElementById('tour-card-budget'),
      icon: 'fas fa-wallet',
      title: 'Control Financiero en Vivo',
      description: 'Visualiza tu <b>Gasto Total</b> en tu moneda preferida y tu <b>Presupuesto</b> con barra de progreso y saldo restante en tiempo real.',
      nextText: 'Siguiente'
    },
    {
      step: 2,
      badge: '2 de 5',
      category: 'Acción Interactiva',
      view: 'resumen',
      getTarget: () => {
        const modal = document.getElementById('expense-modal');
        if (modal && !modal.classList.contains('hidden')) {
          return document.getElementById('modal-container') || modal;
        }
        const isMobile = window.innerWidth < 768;
        return isMobile
          ? (document.getElementById('tour-btn-add-mobile') || document.getElementById('tour-btn-add-desktop'))
          : (document.getElementById('tour-btn-add-desktop') || document.getElementById('tour-btn-add-mobile'));
      },
      icon: 'fas fa-plus-circle',
      title: '¡Haz clic en + Registrar Gasto!',
      description: '👉 <b>Haz clic en el botón verde resaltado</b> para abrir la demostración en vivo. Podrás probar cómo funciona el formulario sin guardar datos reales.',
      nextText: 'Abrir Demostración'
    },
    {
      step: 3,
      badge: '3 de 5',
      category: 'Historial y Reportes',
      view: 'historial',
      getTarget: () => document.getElementById('tour-card-history-all') || document.getElementById('tour-card-export') || document.getElementById('tour-card-history'),
      icon: 'fas fa-file-invoice-dollar',
      title: 'Historial y Centro de Reportes',
      description: '💡 Revisa todos tus movimientos anotados, filtra por fechas, descarga extractos en <b>CSV</b> o envía un resumen periódico consolidado a tu correo.',
      nextText: 'Siguiente'
    },
    {
      step: 4,
      badge: '4 de 5',
      category: 'Conversor y Cotizaciones',
      view: 'conversor',
      getTarget: () => document.getElementById('tour-card-converter') || document.getElementById('tour-card-converter-result'),
      icon: 'fas fa-coins',
      title: 'Conversor de Divisas en Vivo',
      description: '💡 Convierte cualquier monto al instante entre Dólares, Guaraníes, Euros y Reales con cotizaciones oficiales en directo y cálculo inverso.',
      nextText: 'Siguiente'
    },
    {
      step: 5,
      badge: '5 de 5',
      category: 'Ajustes y Frecuencia',
      view: 'ajustes',
      getTarget: () => document.getElementById('tour-card-budget-settings') || document.getElementById('settings-form'),
      icon: 'fas fa-sliders-h',
      title: 'Personaliza tu Límite y Reportes',
      description: '💡 Configura tu presupuesto como <b>Diario, Semanal o Mensual</b>, programa el horario de entrega por correo y selecciona tu moneda preferida.',
      nextText: '¡Entendido, Empezar!'
    }
  ];

  function getStorageKey(userId) {
    return 'gastosmart_tour_v7_' + (userId || 'guest');
  }

  function clearTargetHighlight() {
    if (currentTargetEl) {
      currentTargetEl.classList.remove('gs-tour-highlighted-element');
      currentTargetEl = null;
    }
  }

  function injectDOMElements() {
    let root = document.getElementById('gs-tour-root');
    if (root) return root;

    root = document.createElement('div');
    root.id = 'gs-tour-root';
    root.style.display = 'none';
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '1000100'; // Raíz superior absoluta en el viewport
    root.style.pointerEvents = 'none';

    root.innerHTML = `
      <style>
        @keyframes gs-pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.58), 0 0 25px rgba(16, 185, 129, 0.7);
          }
          50% {
            box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.58), 0 0 40px rgba(16, 185, 129, 0.95);
          }
        }
        .gs-spotlight-pulse {
          animation: gs-pulse-glow 2s infinite ease-in-out;
        }
      </style>

      <!-- Botón flotante para cerrar/omitir el recorrido en cualquier momento -->
      <button type="button" onclick="GastoSmartTour.skip()" class="fixed top-4 right-4 z-[1000130] pointer-events-auto bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xl border border-slate-700/60 transition flex items-center gap-2 cursor-pointer backdrop-blur-md active:scale-95">
        <i class="fas fa-times text-rose-400"></i>
        <span>Cerrar Guía (Esc)</span>
      </button>

      <!-- Foco Esmeralda con orificio perimetral (pointer-events: none) -->
      <div id="gs-tour-spotlight" class="fixed pointer-events-none gs-spotlight-pulse" style="
        border-radius: 24px;
        box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.58), 0 0 25px rgba(16, 185, 129, 0.65);
        border: 2.5px solid #10b981;
        z-index: 1000105;
        display: none;
      "></div>

      <!-- Popover / Tooltip Contextual Inteligente (z-index superior garantizado) -->
      <div id="gs-tour-popover" class="fixed pointer-events-auto bg-white/98 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-200 ring-1 ring-emerald-500/20 flex flex-col" style="
        width: calc(100vw - 32px);
        max-width: 380px;
        z-index: 1000120 !important;
      ">
        <!-- Cabecera Popover -->
        <div class="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span id="gs-popover-badge" class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider shrink-0">
              PASO 1 DE 5
            </span>
            <span id="gs-popover-category" class="text-xs font-black text-slate-700 truncate">Presupuesto</span>
          </div>
          <button type="button" onclick="GastoSmartTour.skip()" class="text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0" title="Omitir recorrido">
            <span>Omitir</span>
            <i class="fas fa-times text-[10px]"></i>
          </button>
        </div>

        <!-- Cuerpo del Paso -->
        <div class="py-1">
          <div class="flex items-start gap-3 mb-1.5">
            <div id="gs-popover-icon-box" class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0 mt-0.5 text-sm font-black shadow-2xs">
              <i id="gs-popover-icon" class="fas fa-wallet"></i>
            </div>
            <div>
              <h4 id="gs-popover-title" class="font-display font-black text-sm sm:text-base text-slate-900 leading-snug">Título del apartado</h4>
            </div>
          </div>
          <p id="gs-popover-desc" class="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mt-1">
            Descripción clara del apartado.
          </p>
        </div>

        <!-- Indicador de Puntos y Navegación -->
        <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 gap-2">
          <!-- Botón Anterior -->
          <button type="button" id="gs-popover-prev" onclick="GastoSmartTour.prev()" class="shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1">
            <i class="fas fa-arrow-left text-[10px]"></i>
            <span>Anterior</span>
          </button>

          <!-- Puntos (Dots) -->
          <div class="flex items-center gap-1.5 shrink-0" id="gs-popover-dots">
            ${STEPS.map((_, i) => `
              <button type="button" onclick="GastoSmartTour.goTo(${i})" class="gs-tour-dot w-2 h-2 rounded-full transition-all duration-200 ${i === 0 ? 'bg-emerald-600 w-5' : 'bg-slate-200'}" aria-label="Paso ${i + 1}"></button>
            `).join('')}
          </div>

          <!-- Botón Siguiente / Acción -->
          <button type="button" id="gs-popover-next" onclick="GastoSmartTour.handleNextClick()" class="shrink-0 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5">
            <span id="gs-popover-next-text">Siguiente</span>
            <i id="gs-popover-next-icon" class="fas fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    if (!listenersAttached) {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isActive) {
          GastoSmartTour.skip();
        }
      });

      // Rastreo activo de scroll en window, document (<main>) y contenedores con overflow
      window.addEventListener('scroll', handleViewportChange, { passive: true });
      document.addEventListener('scroll', handleViewportChange, { passive: true, capture: true });
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('orientationchange', handleViewportChange);

      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.addEventListener('scroll', handleViewportChange, { passive: true });
      }

      listenersAttached = true;
    }

    return root;
  }

  function handleViewportChange() {
    if (!isActive) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      updateSpotlightAndPopover(currentStep, false);
    });
  }

  function isModalOpen() {
    const modal = document.getElementById('expense-modal');
    return modal && !modal.classList.contains('hidden');
  }

  function trackSmoothScroll(duration = 450) {
    const startTime = performance.now();
    function tick(now) {
      if (!isActive) return;
      updateSpotlightAndPopover(currentStep, false);
      if (now - startTime < duration) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }

  function updateSpotlightAndPopover(index, doScroll = true, retryCount = 0) {
    if (!isActive || index < 0 || index >= STEPS.length) return;
    const step = STEPS[index];

    let target = step.getTarget();
    if (!target || !target.isConnected) {
      if (retryCount < 4) {
        setTimeout(() => {
          updateSpotlightAndPopover(index, doScroll, retryCount + 1);
        }, 100);
        return;
      }
      positionPopoverCenter(step, index);
      return;
    }

    const rect = target.getBoundingClientRect();
    if ((rect.width === 0 || rect.height === 0) && retryCount < 4) {
      setTimeout(() => {
        updateSpotlightAndPopover(index, doScroll, retryCount + 1);
      }, 100);
      return;
    }

    positionElements(target, step, index, doScroll);
  }

  function positionElements(target, step, index, doScroll) {
    if (!isActive) return;
    clearTargetHighlight();
    currentTargetEl = target;

    const spotlight = document.getElementById('gs-tour-spotlight');
    const popover = document.getElementById('gs-tour-popover');
    if (!spotlight || !popover) return;

    if (doScroll && !isModalOpen()) {
      const rectNow = target.getBoundingClientRect();
      const inView = rectNow.top >= 70 && rectNow.bottom <= (window.innerHeight - 70);
      if (!inView) {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {}
        trackSmoothScroll(450);
      }
    }

    const rect = target.getBoundingClientRect();
    const padding = 12;

    // Foco esmeralda con coordenadas reales fijadas al viewport
    const top = rect.top - padding;
    const left = rect.left - padding;
    const width = rect.width + (padding * 2);
    const height = rect.height + (padding * 2);

    if (doScroll) {
      spotlight.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      popover.style.transition = 'top 0.25s cubic-bezier(0.16, 1, 0.3, 1), left 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
    } else {
      spotlight.style.transition = 'none';
      popover.style.transition = 'none';
    }

    spotlight.style.display = 'block';
    spotlight.style.top = `${Math.round(top)}px`;
    spotlight.style.left = `${Math.round(left)}px`;
    spotlight.style.width = `${Math.round(width)}px`;
    spotlight.style.height = `${Math.round(height)}px`;
    spotlight.style.borderRadius = '24px';

    updatePopoverContent(step, index);
    positionPopover(rect);
  }

  function positionPopover(targetRect) {
    const popover = document.getElementById('gs-tour-popover');
    if (!popover) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;
    const popRect = popover.getBoundingClientRect();
    const popHeight = Math.max(180, popRect.height || 210);
    const popWidth = Math.min(380, vw - 32);

    let popTop = 80;
    let popLeft = Math.max(16, (vw - popWidth) / 2);

    const modalOpen = isModalOpen();

    if (isMobile) {
      popLeft = Math.max(16, (vw - popWidth) / 2);
      if (modalOpen) {
        popTop = Math.max(70, vh - popHeight - 16);
      } else {
        const spaceBelow = (vh - 80) - targetRect.bottom;
        const spaceAbove = targetRect.top - 65;

        if (spaceBelow >= popHeight + 14) {
          popTop = targetRect.bottom + 12;
        } else if (spaceAbove >= popHeight + 14) {
          popTop = targetRect.top - popHeight - 12;
        } else {
          popTop = Math.max(68, vh - popHeight - 76);
        }
      }
      popTop = Math.max(68, Math.min(vh - popHeight - 74, popTop));
    } else {
      // Desktop: margen lateral izquierdo reservado (sidebar = 256px -> minLeft = 264px)
      const minLeft = 264;

      if (modalOpen) {
        // En modal: intentar situar a la derecha o izquierda del modal
        if (vw - targetRect.right >= popWidth + 24) {
          popLeft = targetRect.right + 20;
          popTop = Math.max(76, Math.min(vh - popHeight - 24, targetRect.top + 20));
        } else if (targetRect.left - minLeft >= popWidth + 24) {
          popLeft = targetRect.left - popWidth - 20;
          popTop = Math.max(76, Math.min(vh - popHeight - 24, targetRect.top + 20));
        } else {
          popLeft = Math.max(minLeft, (vw - popWidth) / 2);
          popTop = Math.max(76, vh - popHeight - 24);
        }
      } else {
        // Evaluación exhaustiva de espacios alrededor del elemento
        const spaceBelow = (vh - 24) - targetRect.bottom;
        const spaceAbove = targetRect.top - 76;
        const spaceRight = (vw - 24) - targetRect.right;
        const spaceLeft = targetRect.left - minLeft;

        // 1. Prioridad: Colocar DEBAJO si hay espacio suficiente
        if (spaceBelow >= popHeight + 16) {
          popTop = targetRect.bottom + 14;
          popLeft = targetRect.left + (targetRect.width / 2) - (popWidth / 2);
        }
        // 2. Prioridad: Colocar ARRIBA si hay espacio
        else if (spaceAbove >= popHeight + 16) {
          popTop = targetRect.top - popHeight - 14;
          popLeft = targetRect.left + (targetRect.width / 2) - (popWidth / 2);
        }
        // 3. Prioridad: Colocar a la DERECHA si cabe
        else if (spaceRight >= popWidth + 16) {
          popLeft = targetRect.right + 14;
          popTop = Math.max(76, targetRect.top + 10);
        }
        // 4. Prioridad: Colocar a la IZQUIERDA si cabe y no toca la barra lateral
        else if (spaceLeft >= popWidth + 16) {
          popLeft = targetRect.left - popWidth - 14;
          popTop = Math.max(76, targetRect.top + 10);
        }
        // 5. Caso de elemento o tarjeta grande que ocupa casi toda la pantalla (Conversor, Ajustes):
        // Acoplar como tarjeta flotante en la esquina inferior derecha garantizando visibilidad 100% frontal
        else {
          popLeft = vw - popWidth - 28;
          popTop = vh - popHeight - 24;
        }
      }

      // Salvaguardas finales Desktop para evitar solapamientos con la barra lateral o desbordes de pantalla
      popTop = Math.max(74, Math.min(vh - popHeight - 20, popTop));
      popLeft = Math.max(minLeft, Math.min(vw - popWidth - 24, popLeft));
    }

    popover.style.top = `${Math.round(popTop)}px`;
    popover.style.left = `${Math.round(popLeft)}px`;
    popover.style.width = `${Math.round(popWidth)}px`;
  }

  function positionPopoverCenter(step, index) {
    const spotlight = document.getElementById('gs-tour-spotlight');
    if (spotlight) spotlight.style.display = 'none';

    updatePopoverContent(step, index);
    const popover = document.getElementById('gs-tour-popover');
    if (!popover) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const popWidth = Math.min(380, vw - 32);
    const popHeight = 220;
    const minLeft = (vw >= 768) ? 264 : 16;

    popover.style.top = `${Math.round(Math.max(76, (vh - popHeight) / 2))}px`;
    popover.style.left = `${Math.round(Math.max(minLeft, (vw - popWidth) / 2))}px`;
    popover.style.width = `${Math.round(popWidth)}px`;
  }

  function updatePopoverContent(step, index) {
    const badge = document.getElementById('gs-popover-badge');
    const category = document.getElementById('gs-popover-category');
    const icon = document.getElementById('gs-popover-icon');
    const title = document.getElementById('gs-popover-title');
    const desc = document.getElementById('gs-popover-desc');
    const btnPrev = document.getElementById('gs-popover-prev');
    const btnNextText = document.getElementById('gs-popover-next-text');
    const btnNextIcon = document.getElementById('gs-popover-next-icon');

    const modalOpen = isModalOpen();

    if (badge) badge.textContent = `PASO ${step.badge.toUpperCase()}`;
    if (category) {
      if (index === 1 && modalOpen) {
        category.textContent = 'Demostración en Vivo';
      } else {
        category.textContent = step.category;
      }
    }
    if (icon) icon.className = step.icon;

    if (index === 1 && modalOpen) {
      if (title) title.textContent = 'Formulario Multidivisa en Acción';
      if (desc) desc.innerHTML = '💡 <b>¡Pruébalo ahora!</b> Cambia las monedas (USD, PYG, EUR, BRL) para ver el cálculo instantáneo. Haz clic en <b>Guardar Gasto</b> (simulación) para continuar.';
      if (btnNextText) btnNextText.textContent = 'Continuar a Historial';
      if (btnNextIcon) btnNextIcon.className = 'fas fa-arrow-right text-[10px]';
    } else {
      if (title) title.textContent = step.title;
      if (desc) desc.innerHTML = step.description;
      if (btnNextText) btnNextText.textContent = step.nextText;
      const isLast = (index === STEPS.length - 1);
      if (btnNextIcon) {
        btnNextIcon.className = isLast ? 'fas fa-check text-[10px]' : 'fas fa-arrow-right text-[10px]';
      }
    }

    if (btnPrev) {
      btnPrev.disabled = (index === 0);
    }

    const dots = document.querySelectorAll('.gs-tour-dot');
    dots.forEach((dot, i) => {
      if (i === index) {
        dot.className = 'gs-tour-dot w-5 h-2 rounded-full transition-all duration-200 bg-emerald-600';
      } else {
        dot.className = 'gs-tour-dot w-2 h-2 rounded-full transition-all duration-200 bg-slate-200 hover:bg-slate-300';
      }
    });
  }

  function handleNextClick() {
    if (currentStep === 1) {
      if (!isModalOpen()) {
        if (typeof openModal === 'function') {
          openModal(150, 'USD', true);
        }
        return;
      } else {
        if (typeof closeModal === 'function') {
          closeModal();
        }
        goTo(2);
        return;
      }
    }

    next();
  }

  function goTo(index, triggerSwitchView = true) {
    if (index < 0 || index >= STEPS.length) return;

    currentStep = index;
    const step = STEPS[index];

    if (index !== 1 && isModalOpen()) {
      if (typeof closeModal === 'function') {
        try { closeModal(); } catch (e) {}
      }
    }

    if (triggerSwitchView && typeof switchView === 'function') {
      try {
        switchView(step.view);
      } catch (e) {
        console.warn('Error cambiando vista en tour:', e);
      }
    }

    setTimeout(() => {
      updateSpotlightAndPopover(index, true);
    }, 140);
  }

  function syncWithView(viewName) {
    if (!isActive) return;
    const viewToStep = {
      'resumen': (currentStep === 1 ? 1 : 0),
      'historial': 2,
      'conversor': 3,
      'ajustes': 4
    };
    const targetIndex = viewToStep[viewName];
    if (targetIndex !== undefined && targetIndex !== currentStep) {
      goTo(targetIndex, false);
    }
  }

  function start(force = false, userId = null) {
    if (userId) currentUserId = userId;
    const root = injectDOMElements();
    if (!root) return;

    isActive = true;
    isDemoModeActive = false;
    currentStep = 0;
    root.style.display = 'block';

    goTo(0);
  }

  function close() {
    clearTargetHighlight();
    const root = document.getElementById('gs-tour-root');
    isActive = false;
    isDemoModeActive = false;

    if (isModalOpen() && typeof closeModal === 'function') {
      try { closeModal(); } catch (e) {}
    }

    if (root) {
      root.style.display = 'none';
      const spotlight = document.getElementById('gs-tour-spotlight');
      if (spotlight) spotlight.style.display = 'none';
    }
  }

  function next() {
    if (currentStep < STEPS.length - 1) {
      goTo(currentStep + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (currentStep > 0) {
      goTo(currentStep - 1);
    }
  }

  function finish() {
    markAsCompleted();
    close();
    if (typeof switchView === 'function') {
      try { switchView('resumen'); } catch (e) {}
    }
    if (typeof showToast === 'function') {
      showToast('¡Recorrido completado! Ya puedes usar GastoSmart al máximo.', 'success');
    }
  }

  function skip() {
    markAsCompleted();
    close();
    if (typeof showToast === 'function') {
      showToast('Recorrido finalizado. Puedes repetirlo cuando gustes.', 'info');
    }
  }

  function markAsCompleted() {
    try {
      const key = getStorageKey(currentUserId);
      localStorage.setItem(key, 'true');
      localStorage.setItem('gastosmart_tour_v7_generic', 'true');
    } catch (e) {
      console.warn('Error guardando estado tour:', e);
    }
  }

  function checkAndAutoStart(userId) {
    currentUserId = userId;
    try {
      const key = getStorageKey(userId);
      const done = localStorage.getItem(key) || localStorage.getItem('gastosmart_tour_v7_generic');
      if (!done) {
        setTimeout(() => {
          start(false, userId);
        }, 900);
      }
    } catch (e) {
      console.warn('Error en auto-start tour:', e);
    }
  }

  function onModalOpened() {
    if (!isActive || currentStep !== 1) return;
    isDemoModeActive = true;
    setTimeout(() => {
      const modalContainer = document.getElementById('modal-container');
      if (modalContainer) {
        positionElements(modalContainer, STEPS[1], 1, false);
      }
    }, 80);
  }

  function onDemoExpenseSaved() {
    isDemoModeActive = false;
    setTimeout(() => {
      goTo(2);
    }, 250);
  }

  function onModalClosed() {
    if (!isActive || currentStep !== 1) return;
    isDemoModeActive = false;
    setTimeout(() => {
      if (isActive && currentStep === 1) {
        goTo(2);
      }
    }, 150);
  }

  return {
    start,
    next,
    prev,
    goTo,
    skip,
    close,
    finish,
    checkAndAutoStart,
    syncWithView,
    handleNextClick,
    onModalOpened,
    onDemoExpenseSaved,
    onModalClosed,
    setDemoMode: (val) => { isDemoModeActive = Boolean(val); },
    isDemoMode: () => isDemoModeActive,
    isActive: () => isActive,
    getCurrentStep: () => currentStep
  };
})();

window.GastoSmartTour = GastoSmartTour;
