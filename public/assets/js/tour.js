/**
 * GastoSmart - Recorrido Guiado Interactivo Profesional (Spotlight Guided Tour)
 * - Oscurece el fondo con overlay oscuro semi-transparente.
 * - Enfoca y resalta con foco luminoso el botón o sección exacto de cada paso.
 * - Desplaza la pantalla suavemente hacia el elemento enfocado.
 * - Muestra un tooltip popover adyacente profesional (no tapa la pantalla).
 * - Totalmente adaptado para PC y Celulares.
 * - Permite avanzar, retroceder u omitir en cualquier momento.
 */

const GastoSmartTour = (() => {
  let currentStep = 0;
  let currentUserId = null;
  let isActive = false;
  let resizeHandlerAttached = false;

  const STEPS = [
    {
      step: 1,
      badge: '1 de 5',
      view: 'resumen',
      getTarget: () => document.getElementById('tour-card-budget'),
      icon: 'fas fa-wallet',
      title: 'Presupuesto y Control de Gastos',
      description: 'Aquí visualizas tu límite mensual (fijado en <b>$100.00 USD</b> por defecto), el dinero consumido y el porcentaje disponible en tiempo real con barra de progreso.'
    },
    {
      step: 2,
      badge: '2 de 5',
      view: 'resumen',
      getTarget: () => {
        const isMobile = window.innerWidth < 768;
        return isMobile 
          ? (document.getElementById('tour-btn-add-mobile') || document.getElementById('tour-btn-add-desktop'))
          : (document.getElementById('tour-btn-add-desktop') || document.getElementById('tour-btn-add-mobile'));
      },
      icon: 'fas fa-plus-circle',
      title: 'Anotar un Gasto en Segundos',
      description: 'Pulsa este botón para registrar compras en <b>Dólares ($)</b>, <b>Guaraníes (₲)</b>, <b>Euros (€)</b> o <b>Reales (R$)</b>. La cotización se calcula al instante con fecha exacta.'
    },
    {
      step: 3,
      badge: '3 de 5',
      view: 'historial',
      getTarget: () => document.getElementById('tour-card-history'),
      icon: 'fas fa-list-ul',
      title: 'Historial de Movimientos',
      description: 'Revisa todas tus compras organizadas cronológicamente con filtros por período. Puedes auditar, editar o eliminar cualquier gasto fácilmente.'
    },
    {
      step: 4,
      badge: '4 de 5',
      view: 'conversor',
      getTarget: () => document.getElementById('tour-card-converter'),
      icon: 'fas fa-coins',
      title: 'Conversor y Cotizaciones en Vivo',
      description: 'Consulta cotizaciones oficiales del mercado actualizadas al minuto. Convierte valores de ida y vuelta entre USD, PYG, EUR y BRL con un solo toque.'
    },
    {
      step: 5,
      badge: '5 de 5',
      view: 'ajustes',
      getTarget: () => document.getElementById('tour-card-budget-settings'),
      icon: 'fas fa-sliders-h',
      title: 'Personaliza tu Límite y Alertas',
      description: 'Establece tu presupuesto semanal o mensual en tu moneda favorita y activa avisos preventivos a tu correo antes de sobrepasar el límite fijado.'
    }
  ];

  function getStorageKey(userId) {
    return 'gastosmart_tour_v2_' + (userId || 'guest');
  }

  function injectDOMElements() {
    if (document.getElementById('gs-tour-root')) return;

    const root = document.createElement('div');
    root.id = 'gs-tour-root';
    root.className = 'fixed inset-0 pointer-events-none transition-opacity duration-300 opacity-0';
    root.style.zIndex = '99990';

    root.innerHTML = `
      <!-- Telón de Fondo Interactivo (Click en fondo oscuro también puede omitir o permanecer) -->
      <div id="gs-tour-backdrop" class="fixed inset-0 pointer-events-auto transition-opacity duration-300" style="background: rgba(15, 23, 42, 0.78);"></div>

      <!-- Recuadro Foco Luminoso (Spotlight Box) -->
      <div id="gs-tour-spotlight" class="fixed pointer-events-none transition-all duration-300" style="
        border-radius: 18px;
        box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.78), 0 0 30px rgba(16, 185, 129, 0.65);
        border: 2.5px solid #10b981;
        z-index: 99995;
      "></div>

      <!-- Popover / Tooltip Contextual Inteligente -->
      <div id="gs-tour-popover" class="fixed pointer-events-auto bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 transition-all duration-300 flex flex-col" style="
        width: calc(100vw - 32px);
        max-width: 380px;
        z-index: 100000;
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

    // Si el usuario hace clic en el fondo oscuro, no se cierra accidentalmente, pero se le da feedback
    const backdrop = document.getElementById('gs-tour-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          // Si hace clic fuera del popover, se avanza al siguiente paso para una experiencia fluida
          GastoSmartTour.next();
        }
      });
    }

    if (!resizeHandlerAttached) {
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('scroll', handleViewportChange, true);
      resizeHandlerAttached = true;
    }
  }

  function handleViewportChange() {
    if (!isActive) return;
    updateSpotlightAndPopover(currentStep, false);
  }

  function updateSpotlightAndPopover(index, doScroll = true) {
    if (index < 0 || index >= STEPS.length) return;
    const step = STEPS[index];
    const spotlight = document.getElementById('gs-tour-spotlight');
    const popover = document.getElementById('gs-tour-popover');
    if (!spotlight || !popover) return;

    let target = step.getTarget();
    if (!target) {
      // Reintentar tras un breve momento si el DOM está terminando de renderizar la vista
      setTimeout(() => {
        target = step.getTarget();
        if (target) positionElements(target, step, index, doScroll);
      }, 100);
      return;
    }

    positionElements(target, step, index, doScroll);
  }

  function positionElements(target, step, index, doScroll) {
    const spotlight = document.getElementById('gs-tour-spotlight');
    const popover = document.getElementById('gs-tour-popover');
    if (!spotlight || !popover) return;

    if (doScroll) {
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } catch (e) {}
    }

    // Tras scroll suave, calcular rect exacto
    const delay = doScroll ? 180 : 0;
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const padding = 8;

      const top = Math.max(0, rect.top - padding);
      const left = Math.max(0, rect.left - padding);
      const width = rect.width + (padding * 2);
      const height = rect.height + (padding * 2);

      // Posicionar Recuadro Foco
      spotlight.style.top = `${top}px`;
      spotlight.style.left = `${left}px`;
      spotlight.style.width = `${width}px`;
      spotlight.style.height = `${height}px`;

      // Posicionar Popover de manera inteligente
      positionPopover(rect);

      // Actualizar Contenido del Popover
      updatePopoverContent(step, index);
    }, delay);
  }

  function positionPopover(targetRect) {
    const popover = document.getElementById('gs-tour-popover');
    if (!popover) return;

    const isMobile = window.innerWidth < 640;
    const popRect = popover.getBoundingClientRect();
    const popHeight = popRect.height || 180;
    const popWidth = Math.min(380, window.innerWidth - 32);

    let popTop = 0;
    let popLeft = 16;

    if (isMobile) {
      // En móvil: centrado horizontalmente
      popLeft = Math.max(16, (window.innerWidth - popWidth) / 2);

      // Si el elemento está en la mitad inferior de la pantalla, posicionar el tooltip ARRIBA del elemento
      if (targetRect.top > window.innerHeight / 2) {
        popTop = Math.max(16, targetRect.top - popHeight - 16);
      } else {
        // Si está en la mitad superior, colocarlo DEBAJO del elemento
        popTop = Math.min(window.innerHeight - popHeight - 16, targetRect.bottom + 16);
      }
    } else {
      // En PC / Desktop:
      // Alinear horizontalmente centrado con respecto al elemento objetivo
      popLeft = targetRect.left + (targetRect.width / 2) - (popWidth / 2);
      popLeft = Math.max(20, Math.min(window.innerWidth - popWidth - 20, popLeft));

      // Verificar si cabe abajo
      if (targetRect.bottom + popHeight + 20 < window.innerHeight) {
        popTop = targetRect.bottom + 14;
      } else if (targetRect.top - popHeight - 20 > 0) {
        popTop = targetRect.top - popHeight - 14;
      } else {
        // En caso extremo, ubicar a un costado o centrado vertical
        popTop = Math.max(20, (window.innerHeight - popHeight) / 2);
      }
    }

    popover.style.top = `${popTop}px`;
    popover.style.left = `${popLeft}px`;
    popover.style.width = `${popWidth}px`;
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
      btnNextText.textContent = isLast ? '¡Entendido!' : 'Siguiente';
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

  function goTo(index) {
    if (index < 0 || index >= STEPS.length) return;
    currentStep = index;
    const step = STEPS[index];

    // Cambiar la vista de la aplicación si corresponde
    if (typeof switchView === 'function') {
      try {
        switchView(step.view);
      } catch (e) {
        console.warn('Error cambiando vista en tour:', e);
      }
    }

    // Esperar a que la vista se active y renderice
    setTimeout(() => {
      updateSpotlightAndPopover(index, true);
    }, 60);
  }

  function start(force = false, userId = null) {
    if (userId) currentUserId = userId;
    injectDOMElements();

    const root = document.getElementById('gs-tour-root');
    if (!root) return;

    isActive = true;
    currentStep = 0;

    // Mostrar root overlay
    root.classList.remove('pointer-events-none');
    root.classList.remove('opacity-0');
    root.classList.add('opacity-100');

    goTo(0);
  }

  function close() {
    const root = document.getElementById('gs-tour-root');
    if (!root) return;

    isActive = false;
    root.classList.remove('opacity-100');
    root.classList.add('opacity-0');
    root.classList.add('pointer-events-none');

    // Regresar ordenadamente a la vista principal de resumen
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
      showToast('¡Recorrido interactivo completado!', 'success');
    }
  }

  function skip() {
    markAsCompleted();
    close();
    if (typeof showToast === 'function') {
      showToast('Recorrido omitido. Puedes repetirlo desde Ajustes o con el botón (?) de ayuda.', 'info');
    }
  }

  function markAsCompleted() {
    try {
      const key = getStorageKey(currentUserId);
      localStorage.setItem(key, 'true');
      localStorage.setItem('gastosmart_tour_v2_generic', 'true');
    } catch (e) {
      console.warn('Error guardando estado tour:', e);
    }
  }

  function checkAndAutoStart(userId) {
    currentUserId = userId;
    try {
      const key = getStorageKey(userId);
      const done = localStorage.getItem(key) || localStorage.getItem('gastosmart_tour_v2_generic');
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
    checkAndAutoStart
  };
})();

window.GastoSmartTour = GastoSmartTour;
