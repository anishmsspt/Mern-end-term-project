/**
 * Date normalization utilities for calendar date (YYYY-MM-DD) handling.
 * Avoids UTC timezone conversion shifts where local days roll forward or backward.
 */

/**
 * Format a Date object or ISO string to local 'YYYY-MM-DD'
 * @param {Date|string|number} dateInput
 * @returns {string} YYYY-MM-DD
 */
function toLocalDateString(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a 'YYYY-MM-DD' or ISO date string into a Date object representing
 * start of day or end of day in local time.
 * @param {string|Date} dateStr
 * @param {'start'|'end'|'default'} boundary
 * @returns {Date}
 */
function parseDateBoundary(dateStr, boundary = 'default') {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    const d = new Date(dateStr);
    if (boundary === 'start') d.setHours(0, 0, 0, 0);
    else if (boundary === 'end') d.setHours(23, 59, 59, 999);
    return d;
  }

  const str = String(dateStr).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (boundary === 'start') {
      return new Date(year, month, day, 0, 0, 0, 0);
    } else if (boundary === 'end') {
      return new Date(year, month, day, 23, 59, 59, 999);
    }
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  const d = new Date(dateStr);
  if (boundary === 'start') d.setHours(0, 0, 0, 0);
  else if (boundary === 'end') d.setHours(23, 59, 59, 999);
  return d;
}

module.exports = {
  toLocalDateString,
  parseDateBoundary,
};
