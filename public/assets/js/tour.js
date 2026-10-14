/**
 * GastoSmart - Recorrido Guiado Interactivo Profesional
 * Arquitectura de 4 Paneles de Apertura (Aperture Spotlight):
 * - El elemento enfocado NUNCA queda oscurecido porque no hay ninguna capa sobre él.
 * - Brillo y colores 100% naturales en la tarjeta o botón enfocado.
 * - Interacción 100% real: el usuario puede tocar botones, cambiar monedas y probar conversiones.
 * - Sincronización inteligente con modales y vistas en PC y Móvil.
 * - Al cerrarse, se oculta completamente (display: none) para garantizar rendimiento nativo.
 */

const GastoSmartTour = (() => {
  let currentStep = 0;
  let currentUserId = null;
  let isActive = false;
  let resizeHandlerAttached = false;
  let currentTargetEl = null;
  let modalObserver = null;
  let rafId = null;

  const STEPS = [
    {
      step: 1,
      badge: '1 de 5 • Presupuesto',
      view: 'resumen',
      getTarget: () => document.getElementById('tour-card-budget'),
      icon: 'fas fa-wallet',
      title: 'Control de Presupuesto en Vivo',
      description: 'Aquí visualizas tu presupuesto (fijado en <b>$100.00 USD</b> de base), el total consumido y el saldo restante en tiempo real con barra de progreso.'
    },
    {
      step: 2,
      badge: '2 de 5 • Registro Rápido',
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
      title: 'Anotar un Gasto en Segundos',
      description: '💡 <b>¡Pruébalo ahora!</b> Toca en <b>+ Registrar Gasto</b> para abrir el formulario interactivo multidivisa con fecha asegurada.'
    },
    {
      step: 3,
      badge: '3 de 5 • Movimientos',
      view: 'historial',
      getTarget: () => document.getElementById('tour-card-history'),
      icon: 'fas fa-list-ul',
      title: 'Historial y Reportes CSV',
      description: '💡 <b>¡Pruébalo!</b> Revisa todas tus transacciones por fecha. Puedes cambiar el filtro de períodos o tocar <b>Exportar CSV</b> para auditar tus finanzas.'
    },
    {
      step: 4,
      badge: '4 de 5 • Divisas en Vivo',
      view: 'conversor',
      getTarget: () => document.getElementById('tour-card-converter') || document.getElementById('tour-card-converter-result'),
      icon: 'fas fa-coins',
      title: 'Conversor y Cotizaciones en Vivo',
      description: '💡 <b>¡Pruébalo ahora!</b> Escribe un monto, cambia las monedas o pulsa <b>(⇄)</b> para invertir las cotizaciones oficiales en tiempo real.'
    },
    {
      step: 5,
      badge: '5 de 5 • Configuración',
      view: 'ajustes',
      getTarget: () => document.getElementById('tour-card-budget-settings') || document.getElementById('tour-card-budget-config'),
      icon: 'fas fa-sliders-h',
      title: 'Personaliza tu Límite y Alertas',
      description: '💡 <b>¡Pruébalo ahora!</b> Alterna entre <b>Presupuesto Mensual</b> y <b>Semanal</b>, o toca las monedas (USD, PYG, EUR, BRL) para proyectar tus finanzas.'
    }
  ];

  function getStorageKey(userId) {
    return 'gastosmart_tour_v3_' + (userId || 'guest');
  }

  function clearTargetHighlight() {
    if (currentTargetEl) {
      currentTargetEl.classList.remove('gs-tour-active-element');
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
    root.style.zIndex = '999990';
    root.style.pointerEvents = 'none';

    root.innerHTML = `
      <style>
        .gs-tour-panel {
          position: fixed;
          background: rgba(15, 23, 42, 0.72);
          pointer-events: auto;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 999991;
        }
        .gs-tour-active-element {
          /* Centro al descubierto para permitir clics e interacción nativa */
        }
      </style>

      <!-- 4 Paneles que rodean el elemento dejando el centro 100% interactivo y transparente -->
      <div id="gs-panel-top" class="gs-tour-panel"></div>
      <div id="gs-panel-bottom" class="gs-tour-panel"></div>
      <div id="gs-panel-left" class="gs-tour-panel"></div>
      <div id="gs-panel-right" class="gs-tour-panel"></div>

      <!-- Borde Foco Esmeralda Luminoso -->
      <div id="gs-tour-spotlight" class="fixed pointer-events-none" style="
        border-radius: 18px;
        box-shadow: 0 0 25px rgba(16, 185, 129, 0.65), inset 0 0 8px rgba(16, 185, 129, 0.20);
        border: 2.5px solid #10b981;
        z-index: 999995;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      "></div>

      <!-- Popover / Tooltip Contextual Inteligente -->
      <div id="gs-tour-popover" class="fixed pointer-events-auto bg-white rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col" style="
        width: calc(100vw - 24px);
        max-width: 370px;
        z-index: 1000000;
        transition: top 0.25s cubic-bezier(0.16, 1, 0.3, 1), left 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      ">
        <!-- Cabecera Popover -->
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span id="gs-popover-badge" class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              Paso 1 de 5
            </span>
            <span class="text-[11px] font-bold text-slate-400">Guía Interactiva</span>
          </div>
          <button type="button" onclick="GastoSmartTour.skip()" class="text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition cursor-pointer flex items-center gap-1" title="Omitir recorrido">
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

    if (!resizeHandlerAttached) {
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('scroll', handleViewportChange, true);
      window.addEventListener('orientationchange', handleViewportChange);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
      }
      resizeHandlerAttached = true;
    }

    setupModalObserver();

    return root;
  }

  function setupModalObserver() {
    if (modalObserver) return;
    const modal = document.getElementById('expense-modal');
    if (!modal) return;

    modalObserver = new MutationObserver(() => {
      if (!isActive || currentStep !== 1) return;
      const isOpen = !modal.classList.contains('hidden');
      if (isOpen) {
        setTimeout(() => {
          const container = document.getElementById('modal-container');
          if (container && isActive && currentStep === 1) {
            positionElements(container, {
              step: 2,
              badge: '2 de 5 • ¡En Acción!',
              view: 'resumen',
              icon: 'fas fa-edit',
              title: 'Formulario Multidivisa en Acción',
              description: '💡 <b>¡Pruébalo!</b> Toca las monedas (USD, PYG, EUR, BRL) o escribe un monto. La fecha está asegurada. Pulsa la <b>X</b> para cerrar o <b>Siguiente</b> para continuar.'
            }, 1, false);
          }
        }, 80);
      } else {
        setTimeout(() => {
          if (isActive && currentStep === 1) {
            updateSpotlightAndPopover(1, false);
          }
        }, 120);
      }
    });

    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  function handleViewportChange() {
    if (!isActive) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      updateSpotlightAndPopover(currentStep, false);
    });
  }

  function updateSpotlightAndPopover(index, doScroll = true) {
    if (index < 0 || index >= STEPS.length) return;
    const step = STEPS[index];

    let target = step.getTarget();
    if (!target) {
      setTimeout(() => {
        target = step.getTarget();
        if (target) positionElements(target, step, index, doScroll);
      }, 100);
      return;
    }

    positionElements(target, step, index, doScroll);
  }

  function positionElements(target, step, index, doScroll) {
    clearTargetHighlight();
    currentTargetEl = target;
    target.classList.add('gs-tour-active-element');

    const pTop = document.getElementById('gs-panel-top');
    const pBottom = document.getElementById('gs-panel-bottom');
    const pLeft = document.getElementById('gs-panel-left');
    const pRight = document.getElementById('gs-panel-right');
    const spotlight = document.getElementById('gs-tour-spotlight');
    const popover = document.getElementById('gs-tour-popover');
    if (!pTop || !pBottom || !pLeft || !pRight || !spotlight || !popover) return;

    if (doScroll) {
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } catch (e) {}
    }

    const delay = doScroll ? 250 : 0;
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const padding = 8;

      const top = Math.max(0, rect.top - padding);
      const left = Math.max(0, rect.left - padding);
      const width = rect.width + (padding * 2);
      const height = rect.height + (padding * 2);
      const right = left + width;
      const bottom = top + height;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 1. Panel Superior
      pTop.style.top = '0px';
      pTop.style.left = '0px';
      pTop.style.width = '100vw';
      pTop.style.height = `${top}px`;

      // 2. Panel Inferior
      pBottom.style.top = `${bottom}px`;
      pBottom.style.left = '0px';
      pBottom.style.width = '100vw';
      pBottom.style.height = `${Math.max(0, vh - bottom)}px`;

      // 3. Panel Izquierdo
      pLeft.style.top = `${top}px`;
      pLeft.style.left = '0px';
      pLeft.style.width = `${left}px`;
      pLeft.style.height = `${height}px`;

      // 4. Panel Derecho
      pRight.style.top = `${top}px`;
      pRight.style.left = `${right}px`;
      pRight.style.width = `${Math.max(0, vw - right)}px`;
      pRight.style.height = `${height}px`;

      // 5. Borde Foco Esmeralda
      spotlight.style.top = `${top}px`;
      spotlight.style.left = `${left}px`;
      spotlight.style.width = `${width}px`;
      spotlight.style.height = `${height}px`;

      // 6. Actualizar Contenido PRIMERO para que el alto del popover sea real
      updatePopoverContent(step, index);

      // 7. Posicionar Popover con clamping y docking inteligente para PC y Móvil
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
    const popHeight = Math.max(170, popRect.height || 200);
    const popWidth = Math.min(370, vw - 24);

    let popTop = 0;
    let popLeft = 12;

    if (isMobile) {
      popLeft = Math.max(12, (vw - popWidth) / 2);

      // En móvil:
      // Zona segura vertical: bajo el header (65px) y sobre el bottom navigation (vh - 74px)
      const spaceBelow = (vh - 74) - targetRect.bottom;
      const spaceAbove = targetRect.top - 65;

      if (spaceBelow >= popHeight + 14) {
        popTop = targetRect.bottom + 12;
      } else if (spaceAbove >= popHeight + 14) {
        popTop = targetRect.top - popHeight - 12;
      } else {
        // Elementos amplios (como conversor o ajustes): anclar limpiamente sobre la barra inferior
        popTop = vh - popHeight - 74;
      }

      // Clamping estricto en móvil
      popTop = Math.max(68, Math.min(vh - popHeight - 74, popTop));
      popLeft = Math.max(12, Math.min(vw - popWidth - 12, popLeft));
    } else {
      // En PC / Escritorio
      popLeft = targetRect.left + (targetRect.width / 2) - (popWidth / 2);
      popLeft = Math.max(24, Math.min(vw - popWidth - 24, popLeft));

      const spaceBelow = (vh - 24) - targetRect.bottom;
      const spaceAbove = targetRect.top - 74;

      if (spaceBelow >= popHeight + 18) {
        popTop = targetRect.bottom + 14;
      } else if (spaceAbove >= popHeight + 18) {
        popTop = targetRect.top - popHeight - 14;
      } else {
        // En elementos grandes: intentar lateral o dock en esquina inferior derecha
        if (vw - targetRect.right >= popWidth + 30) {
          popLeft = targetRect.right + 20;
          popTop = Math.max(74, Math.min(vh - popHeight - 24, targetRect.top));
        } else if (targetRect.left >= popWidth + 30) {
          popLeft = targetRect.left - popWidth - 20;
          popTop = Math.max(74, Math.min(vh - popHeight - 24, targetRect.top));
        } else {
          // Dock limpio en esquina inferior derecha
          popLeft = vw - popWidth - 24;
          popTop = vh - popHeight - 24;
        }
      }

      // Clamping estricto en PC
      popTop = Math.max(74, Math.min(vh - popHeight - 24, popTop));
      popLeft = Math.max(20, Math.min(vw - popWidth - 20, popLeft));
    }

    popover.style.top = `${Math.round(popTop)}px`;
    popover.style.left = `${Math.round(popLeft)}px`;
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

    // Actualizar dots
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

    // Si el modal de gastos estaba abierto, cerrarlo limpiamente al cambiar de paso
    const modal = document.getElementById('expense-modal');
    if (modal && !modal.classList.contains('hidden') && typeof closeModal === 'function') {
      try { closeModal(); } catch (e) {}
    }

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
    }, 60);
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

    // Mostrar root únicamente cuando se inicia el tour
    root.style.display = 'block';

    goTo(0);
  }

  function close() {
    clearTargetHighlight();
    const root = document.getElementById('gs-tour-root');
    isActive = false;

    // Si el modal de gastos estaba abierto, cerrarlo
    const modal = document.getElementById('expense-modal');
    if (modal && !modal.classList.contains('hidden') && typeof closeModal === 'function') {
      try { closeModal(); } catch (e) {}
    }

    if (root) {
      // Ocultar por completo del árbol de renderizado para no bloquear ningún clic
      root.style.display = 'none';
    }

    if (typeof switchView === 'function') {
      try {
        switchView('resumen');
      } catch (e) {}
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
      showToast('Recorrido omitido. Puedes repetirlo desde el menú lateral o en Ajustes.', 'info');
    }
  }

  function markAsCompleted() {
    try {
      const key = getStorageKey(currentUserId);
      localStorage.setItem(key, 'true');
      localStorage.setItem('gastosmart_tour_v3_generic', 'true');
    } catch (e) {
      console.warn('Error guardando estado tour:', e);
    }
  }

  function checkAndAutoStart(userId) {
    currentUserId = userId;
    try {
      const key = getStorageKey(userId);
      const done = localStorage.getItem(key) || localStorage.getItem('gastosmart_tour_v3_generic');
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
