const IST_OFFSET_MINUTES = 330;
function dateKey(input) {
  if (!input) return '';
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() + IST_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}
function toLocalDateString(input) { return dateKey(input); }
function parseDateBoundary(input, boundary = 'default') {
  if (!input) return null;
  const key = dateKey(input);
  if (!key) return new Date(NaN);
  const [year, month, day] = key.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MINUTES * 60000);
  if (boundary === 'start') return start;
  if (boundary === 'end') return new Date(start.getTime() + 86400000 - 1);
  return new Date(start.getTime() + 12 * 60 * 60 * 1000);
}
module.exports = { toLocalDateString, parseDateBoundary };
