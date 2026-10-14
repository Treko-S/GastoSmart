// Soporte Técnico Interactivo (GastoSmart - Programación IV)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('support-form');
    const successBox = document.getElementById('ticket-success');
    const ticketCodeEl = document.getElementById('ticket-code');
    const submitBtn = document.getElementById('btn-submit-ticket');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('ticket-name').value.trim();
            const email = document.getElementById('ticket-email').value.trim();
            const subject = document.getElementById('ticket-subject').value.trim();
            const message = document.getElementById('ticket-message').value.trim();

            if (!name || !email || !subject || !message) {
                alert('Por favor, completa todos los campos requeridos.');
                return;
            }

            // Simular estado de carga
            const originalBtnContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Generando Ticket Académico...</span>
            `;

            setTimeout(() => {
                // Generar código aleatorio estilo #TK-7482
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                const ticketId = `#TK-${randomNum}`;

                if (ticketCodeEl) {
                    ticketCodeEl.textContent = ticketId;
                }

                if (successBox) {
                    successBox.classList.remove('hidden');
                    successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                form.reset();

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }, 800);
        });
    }
});
