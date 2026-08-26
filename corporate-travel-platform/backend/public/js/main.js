import { auth } from './api.js';
import { session } from './state.js';
import { initFlightsSearch } from './flights.js';

async function loadSession() {
  try {
    const { user } = await auth.me();
    session.user = user;
  } catch {
    session.user = null;
  }

  const portalLink = document.getElementById('portal-link');
  if (!portalLink) return;
  if (session.user) {
    portalLink.textContent = session.user.role === 'admin' ? 'Admin Panel' : 'My Dashboard';
    portalLink.href = session.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
  } else {
    portalLink.textContent = 'Corporate Portal';
    portalLink.href = '/login.html';
  }
}

async function init() {
  await loadSession();
  initFlightsSearch();
}

init();
