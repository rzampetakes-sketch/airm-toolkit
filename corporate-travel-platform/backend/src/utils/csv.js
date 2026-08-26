// Minimal CSV writer — no dependency needed for a handful of columns.
// Handles the RFC 4180 cases that actually come up in this app's data
// (commas, quotes, newlines in free-text fields like traveler names/notes).
function escapeCsvField(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows, headers) {
  const lines = [headers.map((h) => escapeCsvField(h.label)).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(h.value(row))).join(','));
  }
  return lines.join('\r\n');
}

module.exports = { toCsv };
