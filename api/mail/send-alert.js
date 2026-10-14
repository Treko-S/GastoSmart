import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';
import { sendBudgetAlertEmail } from '../_lib/brevo.js';
import { applyCors } from '../_lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('nombre, email, notificaciones_email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (!userData.email) {
      return res.status(400).json({ success: false, message: 'El usuario no tiene correo configurado' });
    }

    const { type = 'warning_90', currentSpent = 0, limit = 0, currency = 'USD', period = 'mensual' } = req.body || {};
    const isWarning90 = type === 'warning_90';

    const result = await sendBudgetAlertEmail({
      toEmail: userData.email,
      toName: userData.nombre || 'Usuario',
      currentSpent,
      limit,
      currency,
      period,
      isWarning90
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: 'Error enviando alerta con Brevo', error: result.error });
    }

    return res.status(200).json({
      success: true,
      message: isWarning90 ? 'Aviso preventivo (90%) enviado con éxito' : 'Alerta de presupuesto superado enviada con éxito',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error en /api/mail/send-alert:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
