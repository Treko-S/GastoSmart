// Landing Page Logic (GastoSmart)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 750,
            once: true,
            offset: 60,
            easing: 'ease-out-cubic'
        });
    }

    async function fetchLiveRates() {
        try {
            const fetchFn = window.apiFetch || fetch;
            const res = await fetchFn('/api/currency/rates');
            const data = await res.json();
            if (data.success && data.rates) {
                const r = data.rates;
                const pyg = Math.round(r.PYG || 7550).toLocaleString('es-PY');
                const eur = Number(r.EUR || 0.92).toFixed(2);
                const brl = Number(r.BRL || 5.20).toFixed(2);
                const ars = Math.round(r.ARS || 1200).toLocaleString('es-AR');

                const pygText = `${pyg} ₲`;
                const eurText = `€${eur}`;

                const elPyg = document.getElementById('ticker-pyg');
                if (elPyg) elPyg.textContent = pygText;
                
                const elHeroPyg = document.getElementById('hero-pyg-rate');
                if (elHeroPyg) elHeroPyg.textContent = `1 USD ≈ ${pygText}`;
                
                const elEur = document.getElementById('ticker-eur');
                if (elEur) elEur.textContent = eurText;
                
                const elHeroEur = document.getElementById('hero-eur-rate');
                if (elHeroEur) elHeroEur.textContent = `1 USD ≈ ${eurText}`;
                
                const elBrl = document.getElementById('ticker-brl');
                if (elBrl) elBrl.textContent = `R$ ${brl}`;
                
                const elArs = document.getElementById('ticker-ars');
                if (elArs) elArs.textContent = `$ ${ars}`;
                
                const mockupCalc = Math.round(1200 * (r.PYG || 7550)).toLocaleString('es-PY');
                const elCalc = document.getElementById('mockup-pyg-calc');
                if (elCalc) elCalc.textContent = `≈ ${mockupCalc} ₲`;
            }
        } catch (e) {
            console.warn('Usando valores de referencia:', e);
        }
    }

    fetchLiveRates();

    if (typeof Auth !== 'undefined' && typeof Auth.checkSession === 'function') {
        Auth.checkSession(false).then(user => {
            if (user) {
                const container = document.getElementById('auth-buttons-container');
                if (container) {
                    container.innerHTML = `
                        <a href="dashboard.html" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-primary to-secondary shadow-md transition-all transform hover:-translate-y-0.5">
                            <span>Ir a mi Dashboard</span>
                            <i class="fas fa-arrow-right text-xs"></i>
                        </a>
                    `;
                }
            }
        });
    }
});
