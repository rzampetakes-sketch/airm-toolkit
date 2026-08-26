// Small, dependency-free helpers shared by the frontend modules.

export function debounce(fn, delayMs = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// Escapes user- and API-provided text before it is interpolated into an
// innerHTML template, preventing stored/reflected XSS from upstream data.
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMoney(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${Math.round(amount)}`;
  }
}

export function formatDurationMinutes(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function formatClockTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateLabel(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function stopsLabel(stops) {
  if (stops === 0) return 'Direct';
  if (stops === 1) return '1 stop';
  return `${stops} stops`;
}

export function stopsBadgeClass(stops) {
  if (stops === 0) return 'direct';
  if (stops === 1) return 'one-stop';
  return 'multi-stop';
}
