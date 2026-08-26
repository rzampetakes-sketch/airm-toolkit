import { auth, admin } from './api.js';
import { escapeHtml, formatMoney } from './utils.js';

let currentTargetId = null;

function renderCompanies(companies) {
  document.getElementById('companies-body').innerHTML = companies
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.billing_email)}</td>
        <td>${c.userCount}</td>
        <td>${c.bookingCount}</td>
        <td>${formatMoney(c.totalSpend, 'USD')}</td>
      </tr>`
    )
    .join('');
}

function renderPendingQuotes(requests) {
  const body = document.getElementById('pending-quotes-body');
  const empty = document.getElementById('pending-quotes-empty');
  const pending = requests.filter((r) => r.status === 'quote_requested');

  if (pending.length === 0) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = pending
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.companyName)}</td>
        <td>${escapeHtml(r.traveler_name)}</td>
        <td>${escapeHtml(r.origin)} → ${escapeHtml(r.destination)}</td>
        <td>${escapeHtml(r.cabin_class)}</td>
        <td>${escapeHtml(r.depart_date)}</td>
        <td class="max-w-xs truncate" title="${escapeHtml(r.quote_notes || '')}">${escapeHtml(r.quote_notes || '—')}</td>
        <td><button type="button" class="resolve-btn btn-outline-gold text-xs" data-id="${r.id}">Resolve</button></td>
      </tr>`
    )
    .join('');

  body.querySelectorAll('.resolve-btn').forEach((btn) => {
    btn.addEventListener('click', () => openResolveModal(Number(btn.dataset.id)));
  });
}

function renderAllBookings(bookings) {
  document.getElementById('all-bookings-body').innerHTML = bookings
    .map(
      (b) => `
      <tr>
        <td>${escapeHtml(b.depart_date)}</td>
        <td>${escapeHtml(b.companyName)}</td>
        <td>${escapeHtml(b.traveler_name)}</td>
        <td>${escapeHtml(b.origin)} → ${escapeHtml(b.destination)}</td>
        <td>${escapeHtml(b.cabin_class)}</td>
        <td><span class="status-pill ${escapeHtml(b.status)}">${b.status}</span></td>
        <td>${formatMoney(b.price, b.currency)}</td>
      </tr>`
    )
    .join('');
}

async function refreshAll() {
  const [companiesRes, quotesRes, bookingsRes] = await Promise.all([
    admin.companies(),
    admin.quoteRequests(),
    admin.bookings(),
  ]);
  renderCompanies(companiesRes.companies);
  renderPendingQuotes(quotesRes.requests);
  renderAllBookings(bookingsRes.bookings);
}

function openResolveModal(id) {
  currentTargetId = id;
  document.getElementById('resolve-status').value = 'quoted';
  document.getElementById('resolve-amount').value = '';
  document.getElementById('resolve-notes').value = '';
  document.getElementById('resolve-error').classList.add('hidden');
  document.getElementById('invoice-amount-wrapper').classList.remove('hidden');
  const modal = document.getElementById('resolve-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeResolveModal() {
  const modal = document.getElementById('resolve-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  currentTargetId = null;
}

function initResolveModal() {
  const statusSelect = document.getElementById('resolve-status');
  statusSelect.addEventListener('change', () => {
    document.getElementById('invoice-amount-wrapper').classList.toggle('hidden', statusSelect.value !== 'quoted');
  });

  document.getElementById('resolve-cancel-btn').addEventListener('click', closeResolveModal);
  document.getElementById('resolve-modal').addEventListener('click', (event) => {
    if (event.target.id === 'resolve-modal') closeResolveModal();
  });

  document.getElementById('resolve-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentTargetId) return;
    const status = statusSelect.value;
    const errorEl = document.getElementById('resolve-error');
    try {
      await admin.resolveQuote(currentTargetId, {
        status,
        invoiceAmount: status === 'quoted' ? Number(document.getElementById('resolve-amount').value) : undefined,
        notes: document.getElementById('resolve-notes').value,
      });
      closeResolveModal();
      await refreshAll();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    }
  });
}

async function init() {
  let user;
  try {
    ({ user } = await auth.me());
  } catch {
    window.location.href = '/login.html?next=/admin.html';
    return;
  }
  if (user.role !== 'admin') {
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('admin-name').textContent = user.fullName;
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await auth.logout();
    window.location.href = '/';
  });

  initResolveModal();

  try {
    await refreshAll();
  } catch (err) {
    document.querySelector('main').insertAdjacentHTML(
      'afterbegin',
      `<div class="mb-6 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-300">${escapeHtml(err.message)}</div>`
    );
  }
}

init();
