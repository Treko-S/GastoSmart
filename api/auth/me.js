import { getUserFromRequest } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }

  try {
    if (req.method === 'GET') {
      const { data: dbUser, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, limite_mensual_usd, moneda_principal, notificaciones_email, creado_en')
        .eq('id', user.id)
        .single();

      if (error || !dbUser) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      return res.status(200).json({ success: true, user: dbUser });
    }

    if (req.method === 'PUT') {
      const { nombre, email, limite_mensual_usd, notificaciones_email, moneda_principal } = req.body || {};
      const updates = {};

      if (nombre) updates.nombre = nombre.trim();
      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return res.status(400).json({ success: false, message: 'Formato de correo electrónico inválido' });
        }
        updates.email = cleanEmail;
      }
      if (limite_mensual_usd !== undefined && !isNaN(limite_mensual_usd)) {
        updates.limite_mensual_usd = Number(limite_mensual_usd);
      }
      if (notificaciones_email !== undefined) updates.notificaciones_email = Boolean(notificaciones_email);
      if (moneda_principal) updates.moneda_principal = moneda_principal;

      updates.actualizado_en = new Date().toISOString();

      const { data: updatedUser, error: updateError } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', user.id)
        .select('id, nombre, email, rol, limite_mensual_usd, moneda_principal, notificaciones_email')
        .single();

      if (updateError) {
        console.error('Error al actualizar usuario:', updateError);
        if (updateError.code === '23505') {
          return res.status(400).json({ success: false, message: 'Este correo ya pertenece a otra cuenta' });
        }
        return res.status(500).json({ success: false, message: 'Error al actualizar perfil: ' + (updateError.message || '') });
      }

      return res.status(200).json({ success: true, message: 'Ajustes guardados correctamente', user: updatedUser });
    }

    return res.status(405).json({ success: false, message: 'Método no permitido' });
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
}
