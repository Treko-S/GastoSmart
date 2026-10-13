/**
 * GastoSmart - Auth Client Helper
 */
const Auth = {
  async checkSession(requireAuth = true) {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          window.currentUser = data.user;
          // Si estamos en login o register con sesión activa, ir al dashboard
          if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
            window.location.href = data.user.rol === 'admin' ? '/admin.html' : '/dashboard.html';
          }
          return data.user;
        }
      }
    } catch (e) {
      console.warn('Error verificando sesión:', e);
    }

    if (requireAuth) {
      window.location.href = '/login.html';
    }
    return null;
  },

  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await res.json();
  },

  async register(nombre, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password })
    });
    return await res.json();
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  }
};

window.Auth = Auth;
