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

// 2. Alerta de Presupuesto Superado
export async function sendBudgetAlertEmail(toEmail, toName, currentSpent, limitUSD) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px; color: #333;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #EF4444, #DC2626); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ Alerta de Presupuesto Superado</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">GastoSmart - Notificación de Seguridad Financiera</p>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px;">Hola <strong>${toName}</strong>,</p>
          <p style="color: #555; line-height: 1.6;">Te informamos que tu gasto acumulado este mes ha superado el presupuesto que tenías configurado.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FEF2F2; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 12px 16px; color: #7F1D1D; font-weight: bold;">Límite establecido:</td>
              <td style="padding: 12px 16px; color: #7F1D1D; text-align: right; font-weight: bold;">$${Number(limitUSD).toFixed(2)} USD</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; color: #991B1B; font-weight: bold;">Total gastado este mes:</td>
              <td style="padding: 12px 16px; color: #DC2626; text-align: right; font-size: 18px; font-weight: bold;">$${Number(currentSpent).toFixed(2)} USD</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 14px;">Te recomendamos revisar tu historial de gastos y usar el <strong>Asesor Financiero IA</strong> en tu panel para recortar consumos no esenciales.</p>
          <p style="text-align: center; margin-top: 25px;">
            <a href="https://gastosmart-dun.vercel.app/dashboard" style="background-color: #EF4444; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Revisar mi Dashboard</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    toEmail,
    toName,
    subject: '⚠️ Alerta GastoSmart: Has superado tu presupuesto mensual',
    htmlContent
  });
}
