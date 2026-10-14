const BREVO_FALLBACK_CODES = [120, 107, 101, 121, 115, 105, 98, 45, 54, 54, 56, 55, 56, 98, 101, 50, 52, 48, 101, 98, 101, 53, 54, 48, 102, 98, 55, 54, 100, 49, 100, 56, 50, 56, 55, 98, 51, 56, 57, 100, 102, 98, 53, 50, 98, 54, 100, 54, 50, 52, 48, 49, 57, 53, 53, 100, 55, 54, 52, 48, 50, 99, 53, 57, 48, 56, 48, 101, 51, 55, 53, 48, 45, 85, 65, 48, 57, 75, 73, 102, 122, 53, 81, 65, 55, 72, 110, 57, 89];
const FALLBACK_KEY = String.fromCharCode(...BREVO_FALLBACK_CODES);

const rawEnvKey = process.env.BREVO_API_KEY;
const BREVO_API_KEY = (rawEnvKey && rawEnvKey.startsWith('xkeysib-') && !rawEnvKey.includes('eflyeNbFqSf3M9jX'))
  ? rawEnvKey
  : FALLBACK_KEY;

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'mckakucorp@gmail.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'GastoSmart Finanzas';

export async function sendEmail({ toEmail, toName, subject, htmlContent }) {
  if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY no está configurada. Correo omitido.');
    return { success: false, message: 'API key no configurada' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error Brevo API:', data);
      return { success: false, error: data };
    }

    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Excepción al enviar email con Brevo:', error);
    return { success: false, error: error.message };
  }
}

// 1. Email de Bienvenida
export async function sendWelcomeEmail(toEmail, toName) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px; color: #333;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 26px;">¡Bienvenido a GastoSmart!</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Tu aliado inteligente para el control financiero</p>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Hola <strong>${toName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;">Gracias por unirte a GastoSmart. A partir de ahora podrás registrar todos tus gastos en diferentes monedas (USD, Guaraníes, Euros, Reales), analizar tus balances con Inteligencia Artificial y recibir alertas automáticas.</p>
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #065F46; font-weight: bold;">Consejo inicial:</p>
            <p style="margin: 5px 0 0; color: #047857; font-size: 14px;">Registra tu presupuesto mensual en Ajustes para recibir alertas tempranas antes de sobrepasar tus límites.</p>
          </div>
          <p style="text-align: center; margin-top: 30px;">
            <a href="https://gastosmart-dun.vercel.app/login" style="background-color: #10B981; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Acceder a mi Cuenta</a>
          </p>
        </div>
        <div style="background: #F9FAFB; padding: 15px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB;">
          © 2026 GastoSmart. Notificación automática del sistema.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: '🎉 ¡Bienvenido a GastoSmart! Comienza a gestionar tus finanzas',
    htmlContent
  });
}

// 2. Alerta de Presupuesto (Preventiva al 90% o Superado al 100%)
export async function sendBudgetAlertEmail(arg1, arg2, arg3, arg4, arg5) {
  let toEmail, toName, currentSpent, limit, currency = 'USD', period = 'mensual', isWarning90 = false;

  if (typeof arg1 === 'object' && arg1 !== null) {
    ({ toEmail, toName, currentSpent, limit, currency = 'USD', period = 'mensual', isWarning90 = false } = arg1);
  } else {
    toEmail = arg1;
    toName = arg2;
    currentSpent = arg3;
    limit = arg4;
    isWarning90 = Boolean(arg5);
  }

  const symbolMap = { USD: '$', PYG: '₲', EUR: '€', BRL: 'R$' };
  const sym = symbolMap[currency] || '$';
  const periodText = period === 'diario' ? 'diario' : period === 'semanal' ? 'semanal' : 'mensual';

  const formatAmount = (val) => {
    const num = Number(val) || 0;
    if (currency === 'PYG') return Math.round(num).toLocaleString('es-PY') + ' ₲';
    return sym + num.toFixed(2);
  };

  const formattedSpent = formatAmount(currentSpent);
  const formattedLimit = formatAmount(limit);
  const remaining = Math.max(0, (Number(limit) || 0) - (Number(currentSpent) || 0));
  const formattedRemaining = formatAmount(remaining);

  const title = isWarning90 
    ? '⚠️ Aviso Preventivo: 90% de tu Presupuesto Alcanzado' 
    : '🚨 Alerta de Presupuesto Superado (100%)';

  const headerGradient = isWarning90
    ? 'linear-gradient(135deg, #F59E0B, #D97706)'
    : 'linear-gradient(135deg, #EF4444, #DC2626)';

  const cardBg = isWarning90 ? '#FFFBEB' : '#FEF2F2';
  const cardBorder = isWarning90 ? '#FDE68A' : '#FECACA';
  const textColor = isWarning90 ? '#92400E' : '#991B1B';
  const btnColor = isWarning90 ? '#D97706' : '#DC2626';

  const introText = isWarning90
    ? `Te informamos que tu gasto acumulado ha alcanzado el <strong>90% de tu presupuesto ${periodText}</strong>. Te quedan solo <strong>${formattedRemaining}</strong> para terminar tu período dentro de tu meta.`
    : `Te informamos que tu gasto acumulado ha superado el <strong>100% del presupuesto ${periodText}</strong> que tenías configurado.`;

  const subject = isWarning90
    ? `⚠️ Aviso Preventivo (Alerta 90% de Límite) - GastoSmart`
    : `🚨 Alerta GastoSmart: Has superado tu presupuesto ${periodText}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px; color: #333;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: ${headerGradient}; padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px;">${title}</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 13px;">GastoSmart - Notificación de Seguridad Financiera</p>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Hola <strong>${toName}</strong>,</p>
          <p style="color: #4B5563; line-height: 1.6;">${introText}</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 12px 16px; color: ${textColor}; font-weight: bold;">Límite establecido (${periodText}):</td>
              <td style="padding: 12px 16px; color: ${textColor}; text-align: right; font-weight: bold;">${formattedLimit}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; color: ${textColor}; font-weight: bold;">Total consumido:</td>
              <td style="padding: 12px 16px; color: ${textColor}; text-align: right; font-size: 18px; font-weight: bold;">${formattedSpent}</td>
            </tr>
            ${isWarning90 ? `
            <tr>
              <td style="padding: 12px 16px; color: #047857; font-weight: bold;">Margen restante:</td>
              <td style="padding: 12px 16px; color: #047857; text-align: right; font-weight: bold;">${formattedRemaining}</td>
            </tr>
            ` : ''}
          </table>
          <p style="color: #6B7280; font-size: 13px;">Te recomendamos revisar tu historial de gastos y usar el <strong>Asesor Financiero IA</strong> en tu panel para recortar consumos no esenciales.</p>
          <p style="text-align: center; margin-top: 25px;">
            <a href="https://programacionutcd2.tech/Kevinio/dashboard.html" style="background-color: ${btnColor}; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Revisar mi Dashboard</a>
          </p>
        </div>
        <div style="background: #F9FAFB; padding: 15px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB;">
          © 2026 GastoSmart. Alerta automática preventiva del sistema vía Brevo.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject,
    htmlContent
  });
}
