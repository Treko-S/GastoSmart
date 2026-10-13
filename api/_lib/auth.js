import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'gastosmart_super_secure_jwt_secret_token_2026_exam_final';
const TOKEN_NAME = 'gastosmart_token';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(req) {
  // 1. Extraer desde cookies (HttpOnly)
  const cookieHeader = req.headers.cookie || '';
  const cookies = parse(cookieHeader);
  const token = cookies[TOKEN_NAME];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) return decoded;
  }

  // 2. Extraer desde Authorization Bearer Header (fallback para API)
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7);
    const decoded = verifyToken(bearerToken);
    if (decoded) return decoded;
  }

  return null;
}

export function createAuthCookie(token) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  return serialize(TOKEN_NAME, token, {
    httpOnly: true,
    secure: isProd, // Solo HTTPS en producción
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/'
  });
}

export function createLogoutCookie() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  return serialize(TOKEN_NAME, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
}
