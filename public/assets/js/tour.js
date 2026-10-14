/**
 * GastoSmart - Recorrido Guiado Interactivo Profesional y No Bloqueante
 * - Experiencia suave, interactiva y segura: NUNCA congela ni bloquea la app
 * - Spotlight perimetral inteligente (pointer-events: none)
 * - Popover contextual flotante con botones claros y soporte de tecla Escape
 * - Sincronización automática con las vistas de la aplicación
 */

const GastoSmartTour = (() => {
  let currentStep = 0;
  let currentUserId = null;
  let isActive = false;
  let currentTargetEl = null;
  let rafId = null;
  let escapeHandlerAttached = false;

  const STEPS = [
    {
      step: 1,
      badge: '1 de 5 • Presupuesto y Gasto',
      view: 'resumen',
      getTarget: () => document.getElementById('tour-card-total') || document.getElementById('tour-card-budget'),
      icon: 'fas fa-wallet',
      title: 'Control Financiero en Vivo',
      description: 'Visualiza tu <b>Gasto Total</b> sincronizado en tu moneda favorita y tu <b>Presupuesto</b> con barra de consumo y saldo restante en tiempo real.'
    },
    {
      step: 2,
      badge: '2 de 5 • Registro Rápido',
      view: 'resumen',
      getTarget: () => {
        const isMobile = window.innerWidth < 768;
        return isMobile
          ? (document.getElementById('tour-btn-add-mobile') || document.getElementById('tour-btn-add-desktop'))
          : (document.getElementById('tour-btn-add-desktop') || document.getElementById('tour-btn-add-mobile'));
      },
      icon: 'fas fa-plus-circle',
      title: 'Anotar un Gasto en Segundos',
      description: '💡 Toca en <b>+ Registrar Gasto</b> en cualquier momento para añadir consumos multidivisa (USD, PYG, EUR, BRL) con cálculo automático.'
    },
    {
      step: 3,
      badge: '3 de 5 • Historial y Reportes',
      view: 'historial',
      getTarget: () => document.getElementById('tour-card-export') || document.getElementById('tour-card-history'),
      icon: 'fas fa-file-invoice-dollar',
      title: 'Historial y Centro de Reportes',
      description: '💡 Revisa todos tus movimientos, filtra por categoría, descarga extractos en <b>CSV</b> o envía un resumen financiero a tu correo.'
    },
    {
      step: 4,
      badge: '4 de 5 • Divisas en Vivo',
      view: 'conversor',
      getTarget: () => document.getElementById('tour-card-converter') || document.getElementById('tour-card-converter-result'),
      icon: 'fas fa-coins',
      title: 'Conversor y Cotizaciones en Vivo',
      description: '💡 Convierte cualquier monto al instante entre Dólares, Guaraníes, Euros y Reales con cotizaciones oficiales actualizadas en directo.'
    },
    {
      step: 5,
      badge: '5 de 5 • Ajustes de Perfil',
      view: 'ajustes',
      getTarget: () => document.getElementById('tour-card-budget-settings'),
      icon: 'fas fa-sliders-h',
      title: 'Personaliza tu Límite y Frecuencia',
      description: '💡 Configura tu presupuesto como <b>Diario, Semanal o Mensual</b>, elige el horario de reporte por correo y selecciona tu moneda preferida.'
    }
  ];

  function getStorageKey(userId) {
    return 'gastosmart_tour_v4_' + (userId || 'guest');
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
    root.style.zIndex = '1000030';
    root.style.pointerEvents = 'none'; // CRUCIAL: El contenedor raíz nunca bloquea clicks

    root.innerHTML = `
      <style>
        .gs-tour-highlighted-element {
          position: relative !important;
          z-index: 1000032 !important;
        }
      </style>

      <!-- Botón flotante siempre accesible para cerrar el recorrido -->
      <button type="button" onclick="GastoSmartTour.skip()" class="fixed top-4 right-4 z-[1000060] pointer-events-auto bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xl border border-slate-700/60 transition flex items-center gap-1.5 cursor-pointer backdrop-blur-sm active:scale-95">
        <i class="fas fa-times text-rose-400"></i>
        <span>Cerrar Guía (Esc)</span>
      </button>

      <!-- Foco Esmeralda Luminoso con recorte que NO bloquea clics -->
      <div id="gs-tour-spotlight" class="fixed pointer-events-none" style="
        border-radius: 18px;
        box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55), 0 0 22px rgba(16, 185, 129, 0.6);
        border: 2.5px solid #10b981;
        z-index: 1000031;
        transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        display: none;
      "></div>

      <!-- Popover / Tooltip Contextual Flotante -->
      <div id="gs-tour-popover" class="fixed pointer-events-auto bg-white rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col" style="
        width: calc(100vw - 24px);
        max-width: 380px;
        z-index: 1000050 !important;
        transition: top 0.25s cubic-bezier(0.16, 1, 0.3, 1), left 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      ">
        <!-- Cabecera Popover -->
        <div class="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span id="gs-popover-badge" class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              Paso 1 de 5
            </span>
            <span class="text-[11px] font-bold text-slate-400">Guía Interactiva</span>
          </div>
          <button type="button" onclick="GastoSmartTour.skip()" class="text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1" title="Cerrar y omitir recorrido">
            <span>Omitir</span>
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>

        <!-- Cuerpo del Paso -->
        <div class="py-1">
          <div class="flex items-start gap-2.5 mb-1.5">
            <div id="gs-popover-icon-box" class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-sm font-black">
              <i id="gs-popover-icon" class="fas fa-wallet"></i>
            </div>
            <div>
              <h4 id="gs-popover-title" class="font-display font-black text-sm sm:text-base text-slate-900 leading-snug">Título del apartado</h4>
            </div>
          </div>
          <p id="gs-popover-desc" class="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-medium mt-1">
            Descripción breve y concisa de la funcionalidad.
          </p>
        </div>

        <!-- Indicador de Puntos y Navegación -->
        <div class="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
          <!-- Botón Anterior -->
          <button type="button" id="gs-popover-prev" onclick="GastoSmartTour.prev()" class="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
            <i class="fas fa-arrow-left text-[10px] mr-1"></i> Anterior
          </button>

          <!-- Puntos (Dots) -->
          <div class="flex items-center gap-1.5" id="gs-popover-dots">
            ${STEPS.map((_, i) => `
              <button type="button" onclick="GastoSmartTour.goTo(${i})" class="gs-tour-dot w-2 h-2 rounded-full transition-all duration-200 ${i === 0 ? 'bg-emerald-600 w-5' : 'bg-slate-200'}" aria-label="Paso ${i + 1}"></button>
            `).join('')}
          </div>

          <!-- Botón Siguiente / Finalizar -->
          <button type="button" id="gs-popover-next" onclick="GastoSmartTour.next()" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5">
            <span id="gs-popover-next-text">Siguiente</span>
            <i id="gs-popover-next-icon" class="fas fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    if (!escapeHandlerAttached) {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isActive) {
          GastoSmartTour.skip();
        }
      });
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('orientationchange', handleViewportChange);
      escapeHandlerAttached = true;
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

  function updateSpotlightAndPopover(index, doScroll = true, retryCount = 0) {
    if (!isActive || index < 0 || index >= STEPS.length) return;
    const step = STEPS[index];

    let target = step.getTarget();
    if (!target || !target.isConnected) {
      if (retryCount < 4) {
        setTimeout(() => {
          updateSpotlightAndPopover(index, doScroll, retryCount + 1);
        }, 120);
        return;
      }
      // Fallback: mostrar popover centrado si el elemento no existe en el DOM
      positionPopoverCenter(step, index);
      return;
    }

    const rect = target.getBoundingClientRect();
    if ((rect.width === 0 || rect.height === 0) && retryCount < 4) {
      setTimeout(() => {
        updateSpotlightAndPopover(index, doScroll, retryCount + 1);
      }, 120);
      return;
    }

    positionElements(target, step, index, doScroll);
  }

  function positionElements(target, step, index, doScroll) {
    if (!isActive) return;
    clearTargetHighlight();
    currentTargetEl = target;
    target.classList.add('gs-tour-highlighted-element');

    const spotlight = document.getElementById('gs-tour-spotlight');
    const popover = document.getElementById('gs-tour-popover');
    if (!spotlight || !popover) return;

    if (doScroll) {
      const rectNow = target.getBoundingClientRect();
      const inView = rectNow.top >= 70 && rectNow.bottom <= (window.innerHeight - 70);
      if (!inView) {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {}
      }
    }

    const delay = doScroll ? 150 : 0;
    setTimeout(() => {
      if (!isActive) return;
      const rect = target.getBoundingClientRect();
      const padding = 10;

      const top = Math.max(0, rect.top - padding);
      const left = Math.max(0, rect.left - padding);
      const width = rect.width + (padding * 2);
      const height = rect.height + (padding * 2);

      // Posicionar foco esmeralda
      spotlight.style.display = 'block';
      spotlight.style.top = `${Math.round(top)}px`;
      spotlight.style.left = `${Math.round(left)}px`;
      spotlight.style.width = `${Math.round(width)}px`;
      spotlight.style.height = `${Math.round(height)}px`;

      // Actualizar Contenido y Posición del Popover
      updatePopoverContent(step, index);
      positionPopover(rect);
    }, delay);
  }

  function positionPopover(targetRect) {
    const popover = document.getElementById('gs-tour-popover');
    if (!popover) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 768;
    const popRect = popover.getBoundingClientRect();
    const popHeight = Math.max(180, popRect.height || 210);
    const popWidth = Math.min(380, vw - 24);

    let popTop = 80;
    let popLeft = Math.max(12, (vw - popWidth) / 2);

    if (isMobile) {
      popLeft = Math.max(12, (vw - popWidth) / 2);
      const spaceBelow = (vh - 74) - targetRect.bottom;
      const spaceAbove = targetRect.top - 65;

      if (spaceBelow >= popHeight + 14) {
        popTop = targetRect.bottom + 12;
      } else if (spaceAbove >= popHeight + 14) {
        popTop = targetRect.top - popHeight - 12;
      } else {
        popTop = Math.max(68, vh - popHeight - 74);
      }
      popTop = Math.max(68, Math.min(vh - popHeight - 74, popTop));
      popLeft = Math.max(12, Math.min(vw - popWidth - 12, popLeft));
    } else {
      popLeft = targetRect.left + (targetRect.width / 2) - (popWidth / 2);
      popLeft = Math.max(24, Math.min(vw - popWidth - 24, popLeft));

      const spaceBelow = (vh - 24) - targetRect.bottom;
      const spaceAbove = targetRect.top - 74;

      if (spaceBelow >= popHeight + 18) {
        popTop = targetRect.bottom + 14;
      } else if (spaceAbove >= popHeight + 18) {
        popTop = targetRect.top - popHeight - 14;
      } else {
        if (vw - targetRect.right >= popWidth + 24) {
          popLeft = targetRect.right + 16;
          popTop = Math.max(74, Math.min(vh - popHeight - 24, targetRect.top));
        } else if (targetRect.left >= popWidth + 24) {
          popLeft = targetRect.left - popWidth - 16;
          popTop = Math.max(74, Math.min(vh - popHeight - 24, targetRect.top));
        } else {
          popLeft = vw - popWidth - 24;
          popTop = vh - popHeight - 24;
        }
      }
      popTop = Math.max(74, Math.min(vh - popHeight - 24, popTop));
      popLeft = Math.max(20, Math.min(vw - popWidth - 20, popLeft));
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
    const popWidth = Math.min(380, vw - 24);
    const popHeight = 220;

    popover.style.top = `${Math.round(Math.max(74, (vh - popHeight) / 2))}px`;
    popover.style.left = `${Math.round(Math.max(12, (vw - popWidth) / 2))}px`;
    popover.style.width = `${Math.round(popWidth)}px`;
  }

  function updatePopoverContent(step, index) {
    const badge = document.getElementById('gs-popover-badge');
    const icon = document.getElementById('gs-popover-icon');
    const title = document.getElementById('gs-popover-title');
    const desc = document.getElementById('gs-popover-desc');
    const btnPrev = document.getElementById('gs-popover-prev');
    const btnNextText = document.getElementById('gs-popover-next-text');
    const btnNextIcon = document.getElementById('gs-popover-next-icon');

    if (badge) badge.textContent = `Paso ${step.badge}`;
    if (icon) icon.className = step.icon;
    if (title) title.textContent = step.title;
    if (desc) desc.innerHTML = step.description;

    if (btnPrev) {
      btnPrev.disabled = (index === 0);
    }

    const isLast = (index === STEPS.length - 1);
    if (btnNextText) {
      btnNextText.textContent = isLast ? '¡Entendido, Empezar!' : 'Siguiente';
    }
    if (btnNextIcon) {
      btnNextIcon.className = isLast ? 'fas fa-check text-[10px]' : 'fas fa-arrow-right text-[10px]';
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

  function goTo(index, triggerSwitchView = true) {
    if (index < 0 || index >= STEPS.length) return;

    currentStep = index;
    const step = STEPS[index];

    if (triggerSwitchView && typeof switchView === 'function') {
      try {
        switchView(step.view);
      } catch (e) {
        console.warn('Error cambiando vista en tour:', e);
      }
    }

    setTimeout(() => {
      updateSpotlightAndPopover(index, true);
    }, 120);
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
    currentStep = 0;
    root.style.display = 'block';

    goTo(0);
  }

  function close() {
    clearTargetHighlight();
    const root = document.getElementById('gs-tour-root');
    isActive = false;

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
      localStorage.setItem('gastosmart_tour_v4_generic', 'true');
    } catch (e) {
      console.warn('Error guardando estado tour:', e);
    }
  }

  function checkAndAutoStart(userId) {
    currentUserId = userId;
    try {
      const key = getStorageKey(userId);
      const done = localStorage.getItem(key) || localStorage.getItem('gastosmart_tour_v4_generic');
      if (!done) {
        setTimeout(() => {
          start(false, userId);
        }, 900);
      }
    } catch (e) {
      console.warn('Error en auto-start tour:', e);
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
    checkAndAutoStart,
    syncWithView,
    isActive: () => isActive
  };
})();

window.GastoSmartTour = GastoSmartTour;
