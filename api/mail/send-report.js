import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { sendEmail } from '../_lib/brevo.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    // 1. Obtener datos del usuario
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nombre, email, limite_mensual_usd')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // 2. Obtener gastos del mes actual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: transacciones } = await supabase
      .from('transacciones')
      .select(`
        monto,
        moneda,
        monto_usd,
        descripcion,
        fecha,
        categorias ( nombre )
      `)
      .eq('usuario_id', user.id)
      .gte('fecha', firstDay)
      .order('fecha', { ascending: false });

    let totalUSD = 0;
    const catMap = {};

    (transacciones || []).forEach(t => {
      const m = Number(t.monto_usd) || 0;
      totalUSD += m;
      const c = t.categorias?.nombre || 'Otros';
      catMap[c] = (catMap[c] || 0) + m;
    });

    const mesNombre = now.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    // 3. Generar HTML para el reporte
    let rowsHtml = '';
    Object.keys(catMap).forEach(cat => {
      rowsHtml += `
        <tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; color: #374151;">${cat}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: bold; color: #111827;">$${catMap[cat].toFixed(2)} USD</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background-color: #F3F4F6; padding: 20px; color: #1F2937;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">📊 Resumen Mensual de Gastos</h1>
            <p style="margin: 6px 0 0; opacity: 0.9; text-transform: capitalize;">${mesNombre}</p>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Hola <strong>${userData.nombre}</strong>,</p>
            <p style="color: #4B5563;">Aquí tienes el balance detallado de tus finanzas personales durante el mes en curso:</p>

            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 13px; color: #065F46; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Gasto Total Acumulado</span>
              <h2 style="margin: 8px 0 0; font-size: 32px; color: #047857;">$${totalUSD.toFixed(2)} USD</h2>
              <p style="margin: 4px 0 0; font-size: 13px; color: #059669;">≈ Gs. ${(totalUSD * 7500).toLocaleString('es-PY')}</p>
            </div>

            <h3 style="font-size: 16px; color: #111827; margin: 25px 0 10px;">Desglose por Categorías:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #F9FAFB;">
                  <th style="padding: 10px 14px; text-align: left; color: #6B7280; font-size: 12px; text-transform: uppercase;">Categoría</th>
                  <th style="padding: 10px 14px; text-align: right; color: #6B7280; font-size: 12px; text-transform: uppercase;">Monto (USD)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="2" style="padding: 15px; text-align: center; color: #9CA3AF;">No hay gastos registrados este mes</td></tr>'}
              </tbody>
            </table>

            <p style="margin-top: 30px; text-align: center;">
              <a href="https://gastosmart.vercel.app/dashboard" style="background-color: #10B981; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver Dashboard Completo</a>
            </p>
          </div>
          <div style="background: #F9FAFB; padding: 15px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB;">
            Generado por GastoSmart vía Brevo API.
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Enviar vía Brevo
    const emailResult = await sendEmail({
      toEmail: userData.email,
      toName: userData.nombre,
      subject: `📊 Resumen Financiero GastoSmart - ${mesNombre}`,
      htmlContent
    });

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: 'No se pudo enviar el correo', error: emailResult.error });
    }

    return res.status(200).json({
      success: true,
      message: `Reporte financiero enviado con éxito a ${userData.email}`
    });
  } catch (error) {
    console.error('Error al generar reporte:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
