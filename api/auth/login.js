import bcrypt from 'bcryptjs';
import { supabase } from '../_lib/supabase.js';
import { signToken, createAuthCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' });
    }

    // Buscar usuario en Supabase
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, password_hash, rol, limite_mensual_usd')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Validar contraseña con bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Generar token JWT y cookie segura
    const token = signToken({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    });

    res.setHeader('Set-Cookie', createAuthCookie(token));

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        limite_mensual_usd: user.limite_mensual_usd
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
