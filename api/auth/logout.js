import { createLogoutCookie } from '../_lib/auth.js';
import { applyCors } from '../_lib/cors.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;

  res.setHeader('Set-Cookie', createLogoutCookie());
  return res.status(200).json({ success: true, message: 'Sesión cerrada exitosamente' });
}
