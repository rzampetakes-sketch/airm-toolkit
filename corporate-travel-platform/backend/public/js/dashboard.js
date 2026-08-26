import { auth, corporate } from './api.js';
import { escapeHtml, formatMoney } from './utils.js';

function statusLabel(status) {
  return { booked: 'Booked', quote_requested: 'Quote Requested', quoted: 'Quoted', declined: 'Declined' }[status] || status;
}

function renderBookings(bookings) {
  const body = document.getElementById('bookings-body');
  const empty = document.getElementById('bookings-empty');
  const historyRows = bookings.filter((b) => b.status === 'booked');

  if (historyRows.length === 0) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = historyRows
    .map(
      (b) => `
      <tr>
        <td>${escapeHtml(b.depart_date)}</td>
        <td>${escapeHtml(b.traveler_name)}</td>
        <td>${escapeHtml(b.origin)} → ${escapeHtml(b.destination)}</td>
        <td>${escapeHtml(b.cabin_class)}</td>
        <td>${escapeHtml(b.airline_name)}</td>
        <td><span class="status-pill ${escapeHtml(b.status)}">${statusLabel(b.status)}</span></td>
        <td>${formatMoney(b.price, b.currency)}</td>
      </tr>`
    )
    .join('');

  document.getElementById('stat-total-spend').textContent = formatMoney(
    historyRows.reduce((sum, b) => sum + b.price, 0),
    historyRows[0]?.currency || 'USD'
  );
  document.getElementById('stat-trip-count').textContent = String(bookings.length);
}

function renderExpenseSummary(months) {
  const body = document.getElementById('expense-summary-body');
  const empty = document.getElementById('expense-empty');
  if (months.length === 0) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = months
    .map(
      (m) => `
      <tr>
        <td>${escapeHtml(m.month)}</td>
        <td>${m.tripCount}</td>
        <td>${formatMoney(m.totalSpend, 'USD')}</td>
      </tr>`
    )
    .join('');
}

function renderQuoteRequests(requests) {
  const body = document.getElementById('quotes-body');
  const empty = document.getElementById('quotes-empty');
  if (requests.length === 0) {
    body.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  body.innerHTML = requests
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.created_at)}</td>
        <td>${escapeHtml(r.traveler_name)}</td>
        <td>${escapeHtml(r.origin)} → ${escapeHtml(r.destination)}</td>
        <td>${escapeHtml(r.cabin_class)}</td>
        <td><span class="status-pill ${escapeHtml(r.status)}">${statusLabel(r.status)}</span></td>
        <td>${r.invoice_amount ? formatMoney(r.invoice_amount, r.currency) : '—'}</td>
        <td class="max-w-xs truncate" title="${escapeHtml(r.quote_notes || '')}">${escapeHtml(r.quote_notes || '—')}</td>
      </tr>`
    )
    .join('');

  document.getElementById('stat-pending-quotes').textContent = String(
    requests.filter((r) => r.status === 'quote_requested').length
  );
}

async function init() {
  let user;
  try {
    ({ user } = await auth.me());
  } catch {
    window.location.href = '/login.html?next=/dashboard.html';
    return;
  }
  if (user.role !== 'client') {
    window.location.href = '/admin.html';
    return;
  }

  document.getElementById('user-name').textContent = user.fullName;
  document.getElementById('company-name').textContent = user.companyName || 'Corporate Account';

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await auth.logout();
    window.location.href = '/';
  });

  try {
    const [bookingsRes, summaryRes, quotesRes] = await Promise.all([
      corporate.bookings(),
      corporate.expenseSummary(),
      corporate.quoteRequests(),
    ]);
    renderBookings(bookingsRes.bookings);
    renderExpenseSummary(summaryRes.months);
    renderQuoteRequests(quotesRes.requests);
  } catch (err) {
    document.querySelector('main').insertAdjacentHTML(
      'afterbegin',
      `<div class="mb-6 rounded-xl border border-rose-800 bg-rose-950/40 p-4 text-rose-300">${escapeHtml(err.message)}</div>`
    );
  }
}

init();
