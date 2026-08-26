import { auth } from './api.js';

function redirectTarget(role) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (next && next.startsWith('/')) return next;
  return role === 'admin' ? '/admin.html' : '/dashboard.html';
}

async function init() {
  // Already logged in? Skip straight to the right portal.
  try {
    const { user } = await auth.me();
    window.location.href = redirectTarget(user.role);
    return;
  } catch {
    // not logged in — show the form
  }

  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.classList.add('hidden');
    try {
      const { user } = await auth.login(
        document.getElementById('email').value.trim(),
        document.getElementById('password').value
      );
      window.location.href = redirectTarget(user.role);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}

init();
