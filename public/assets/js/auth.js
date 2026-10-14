/**
 * GastoSmart - Auth Client Helper & API Bridge
 * Compatible universalmente con Vercel, Hostinger (/Kevinio/) y Entornos Locales
 */

const API_BASE = (
  window.location.hostname.includes('programacionutcd2.tech') || 
  (window.location.hostname === 'localhost' && window.location.port !== '3000' && window.location.port !== '')
) ? 'https://gastosmart-dun.vercel.app' : '';

window.API_BASE = API_BASE;

function getAuthHeaders(extra = {}) {
  const headers = { ...extra };
  const token = localStorage.getItem('gastosmart_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
window.getAuthHeaders = getAuthHeaders;

function apiFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : (API_BASE + (url.startsWith('/') ? url : '/' + url));
  const headers = getAuthHeaders(options.headers || {});
  const credentialsMode = options.credentials || (API_BASE ? 'omit' : 'same-origin');
  return fetch(fullUrl, {
    ...options,
    headers,
    credentials: credentialsMode
  });
}
window.apiFetch = apiFetch;

const Auth = {
  getAuthHeaders,
  apiFetch,

  async checkSession(requireAuth = true) {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          window.currentUser = data.user;
          // Si estamos en login o register con sesión activa, ir al dashboard
          if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
            window.location.href = data.user.rol === 'admin' ? 'admin.html' : 'dashboard.html';
          }
          return data.user;
        }
      }
    } catch (e) {
      console.warn('Error verificando sesión:', e);
    }

    if (requireAuth) {
      window.location.href = 'login.html';
    }
    return null;
  },

  async login(email, password) {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem('gastosmart_auth_token', data.token);
      if (data.user) {
        localStorage.setItem('gastosmart_user', JSON.stringify(data.user));
      }
    }
    return data;
  },

  async register(nombre, email, password) {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem('gastosmart_auth_token', data.token);
      if (data.user) {
        localStorage.setItem('gastosmart_user', JSON.stringify(data.user));
      }
    }
    return data;
  },

  async logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Error al comunicarse con logout endpoint:', e);
    }
    try {
      localStorage.removeItem('gastosmart_auth_token');
      localStorage.removeItem('gastosmart_user');
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = 'login.html';
  }
};

window.confirmLogout = function() {
  if (confirm('¿Deseas cerrar sesión en GastoSmart?')) {
    Auth.logout();
  }
};

window.Auth = Auth;
