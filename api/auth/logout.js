import { createLogoutCookie } from '../_lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', createLogoutCookie());
  return res.status(200).json({ success: true, message: 'Sesión cerrada exitosamente' });
}
