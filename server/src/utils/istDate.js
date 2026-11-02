const IST_OFFSET_MINUTES = 330;
function istDateKey(input = new Date()) {
  const d = new Date(input.getTime ? input.getTime() : input);
  return new Date(d.getTime() + IST_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}
function istDayBounds(input = new Date()) {
  const key = istDateKey(input);
  const [y, m, day] = key.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, day) - IST_OFFSET_MINUTES * 60000);
  return { start, end: new Date(start.getTime() + 86400000 - 1), key };
}
function parseIstDateBoundary(value, boundary = 'start') {
  const key = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : istDateKey(value);
  const [y, m, d] = key.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MINUTES * 60000);
  return boundary === 'end' ? new Date(start.getTime() + 86400000 - 1) : start;
}
module.exports = { IST_OFFSET_MINUTES, istDateKey, istDayBounds, parseIstDateBoundary };
