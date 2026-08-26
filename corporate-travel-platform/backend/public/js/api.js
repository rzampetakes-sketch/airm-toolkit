// Thin fetch wrapper for our own backend (/api/*). The backend is the only
// thing that ever talks to Amadeus/Travelpayouts, so no API keys ever touch
// this file or the browser. `credentials: 'include'` is required on the
// corporate-portal calls so the session cookie is sent/received.

async function getJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function postJson(url, payload) {
  return getJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function patchJson(url, payload) {
  return getJson(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function fetchAutocomplete(term) {
  const url = new URL('/api/autocomplete/locations', window.location.origin);
  url.searchParams.set('term', term);
  return getJson(url).then((body) => body.locations || []);
}

export function searchFlights({ legs, adults, cabinClass }) {
  return postJson('/api/flights/search', { legs, adults, cabinClass });
}

// --- Auth ---------------------------------------------------------------------
export const auth = {
  me: () => getJson('/api/auth/me'),
  login: (email, password) => postJson('/api/auth/login', { email, password }),
  logout: () => postJson('/api/auth/logout', {}),
};

// --- Corporate portal (role: client) --------------------------------------------
export const corporate = {
  bookings: () => getJson('/api/corporate/bookings'),
  expenseSummary: () => getJson('/api/corporate/expenses/summary'),
  quoteRequests: () => getJson('/api/corporate/quote-requests'),
  requestQuote: (payload) => postJson('/api/corporate/quote-requests', payload),
  logBooking: (payload) => postJson('/api/corporate/bookings', payload),
};

// --- Admin panel (role: admin) ------------------------------------------------
export const admin = {
  companies: () => getJson('/api/admin/companies'),
  bookings: () => getJson('/api/admin/bookings'),
  quoteRequests: (status) => getJson(`/api/admin/quote-requests${status ? `?status=${status}` : ''}`),
  resolveQuote: (id, payload) => patchJson(`/api/admin/quote-requests/${id}`, payload),
};
