import bcrypt from 'bcryptjs';
import { supabase } from '../_lib/supabase.js';
import { signToken, createAuthCookie } from '../_lib/auth.js';
import { sendWelcomeEmail } from '../_lib/brevo.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { nombre, email, password } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verificar si ya existe
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado' });
    }

    // 2. Hash de contraseña seguro
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Crear usuario en Supabase
    const { data: newUser, error: insertError } = await supabase
      .from('usuarios')
      .insert([
        {
          nombre: nombre.trim(),
          email: cleanEmail,
          password_hash: passwordHash,
          rol: 'usuario',
          limite_mensual_usd: 100.00,
          moneda_principal: 'USD'
        }
      ])
      .select('id, nombre, email, rol, limite_mensual_usd')
      .single();

    if (insertError || !newUser) {
      console.error('Error al insertar usuario en Supabase:', insertError);
      return res.status(500).json({ success: false, message: 'No se pudo crear la cuenta' });
    }

    // 4. Enviar email de bienvenida en segundo plano con Brevo
    sendWelcomeEmail(cleanEmail, newUser.nombre).catch(err => {
      console.error('Error enviando email de bienvenida:', err);
    });

    // 5. Autenticar inmediatamente con Cookie HttpOnly
    const token = signToken({
      id: newUser.id,
      nombre: newUser.nombre,
      email: newUser.email,
      rol: newUser.rol
    });

    res.setHeader('Set-Cookie', createAuthCookie(token));

    return res.status(201).json({
      success: true,
      message: 'Cuenta creada exitosamente',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
}
