/**
 * GastoSmart - CurrencyManager
 * Conexión en tiempo real con ExchangeRate-API a través de nuestro endpoint seguro
 */
const CurrencyManager = {
  rates: {
    USD: 1,
    PYG: 7550,
    EUR: 0.92,
    BRL: 5.15,
    ARS: 1200
  },
  lastUpdated: null,
  isLoaded: false,

  async init() {
    try {
      const res = await fetch('/api/currency/rates');
      const data = await res.json();
      if (data.success && data.rates) {
        this.rates = data.rates;
        this.lastUpdated = data.updated;
        this.isLoaded = true;
      }
    } catch (e) {
      console.warn('Usando tasas de contingencia:', e);
    }
    this.renderTicker();
    return this.rates;
  },

  convert(amount, from = 'USD', to = 'PYG') {
    const val = parseFloat(amount) || 0;
    const fromRate = this.rates[from] || 1;
    const toRate = this.rates[to] || 1;
    // Convierte primero a USD base, luego a moneda destino
    const inUSD = val / fromRate;
    return inUSD * toRate;
  },

  format(amount, currency = 'USD') {
    const num = parseFloat(amount) || 0;
    if (currency === 'PYG') {
      return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(Math.round(num));
    }
    if (currency === 'EUR') {
      return '€ ' + new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }
    if (currency === 'BRL') {
      return 'R$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    }
    // Default USD
    return '$ ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  },

  renderTicker() {
    const tickerEl = document.getElementById('currency-ticker');
    if (tickerEl) {
      const pyg = Math.round(this.rates.PYG || 7500);
      const eur = (this.rates.EUR || 0.92).toFixed(2);
      tickerEl.innerHTML = `
        <div class="inline-flex items-center gap-3 text-xs font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>1 USD ≈ <strong>${pyg.toLocaleString('es-PY')} Gs.</strong></span>
          <span class="hidden sm:inline opacity-60">|</span>
          <span class="hidden sm:inline">1 USD ≈ <strong>€${eur}</strong></span>
          <span class="text-[10px] bg-emerald-200 dark:bg-emerald-900 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-200">En vivo</span>
        </div>
      `;
    }
  }
};

window.CurrencyManager = CurrencyManager;
