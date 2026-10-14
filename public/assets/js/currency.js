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
      const fetchFn = window.apiFetch || fetch;
      const res = await fetchFn('/api/currency/rates');
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
        <div class="inline-flex items-center gap-2.5 text-xs font-medium px-3.5 py-1.5 bg-white text-slate-800 rounded-full border border-emerald-200 shadow-sm">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>1 USD ≈ <strong class="text-emerald-700 font-extrabold">${pyg.toLocaleString('es-PY')} Gs.</strong></span>
          <span class="hidden sm:inline text-slate-300">|</span>
          <span class="hidden sm:inline">1 USD ≈ <strong class="text-emerald-700 font-extrabold">€${eur}</strong></span>
          <span class="text-[10px] bg-emerald-600 px-2 py-0.5 rounded-full font-bold text-white tracking-wide shadow-xs">En vivo</span>
        </div>
      `;
    }
  }
};

window.CurrencyManager = CurrencyManager;
