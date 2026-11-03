/**
 * Pure helpers for the host analytics dashboard.
 * All date/time formatting is pinned to Asia/Kolkata (IST).
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/** Format an ISO timestamp as "03 Nov 2026, 07:45 pm IST". Returns an em dash when missing/invalid. */
export function formatIstDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${dateTimeFormatter.format(date)} IST`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format an IST "YYYY-MM-DD" key (already IST, produced by the server) as "03 Nov". */
export function formatIstDayKey(key, withYear = false) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!m) return key || '—';
  const label = `${m[3]} ${MONTHS[Number(m[2]) - 1]}`;
  return withYear ? `${label} ${m[1]}` : label;
}

/** "HH:00" label for an IST hour 0-23. */
export function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

function dayKeyToUtcMs(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToDayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Fill gaps between the first and last active IST day with zero counts so the
 * trend line reflects real elapsed time. Adds a running cumulative total.
 * Pure calendar arithmetic on date keys, so no timezone drift is possible.
 */
export function buildDailyTrend(dailyActivity = []) {
  if (!dailyActivity.length) return [];
  const counts = new Map(dailyActivity.map((d) => [d.date, d.count]));
  const keys = [...counts.keys()].sort();
  const start = dayKeyToUtcMs(keys[0]);
  const end = dayKeyToUtcMs(keys[keys.length - 1]);

  const out = [];
  let cumulative = 0;
  for (let ms = start; ms <= end; ms += 86400000) {
    const date = utcMsToDayKey(ms);
    const count = counts.get(date) || 0;
    cumulative += count;
    out.push({ date, count, cumulative });
  }
  return out;
}

/** Turn [{_id, count}] into a { key: count } lookup. */
export function toCountMap(list = []) {
  return list.reduce((acc, item) => {
    acc[item._id ?? 'unknown'] = item.count;
    return acc;
  }, {});
}

/** Peak hour (ties -> earliest). Returns null when there is no activity. */
export function findPeakHour(hourlyActivity = []) {
  let best = null;
  for (const h of hourlyActivity) {
    if (h.count > 0 && (!best || h.count > best.count)) best = h;
  }
  return best;
}
