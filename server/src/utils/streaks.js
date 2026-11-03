const { istDateKey } = require('./istDate');

const DAY_MS = 86400000;
const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const dayKeyToUtcDay = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const utcDayToKey = (utcDay) => new Date(utcDay).toISOString().slice(0, 10);

/**
 * Strictly validate a calendar-day key ("YYYY-MM-DD"). Rejects impossible dates
 * such as 2026-02-30 that Date.UTC would silently roll over.
 */
const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !DATE_KEY_REGEX.test(value)) return false;
  return utcDayToKey(dayKeyToUtcDay(value)) === value;
};

/**
 * Streak calculation over distinct Asia/Kolkata calendar days.
 *
 * A day counts as completed when EITHER:
 *   - the participant has a host-approved submission completed on that IST day, OR
 *   - the host granted an active streak adjustment ("Host Protected") for that day.
 *
 * Adjustments only ever add calendar days to the streak. They never create
 * submissions and never contribute points.
 *
 * @param {Array<Date|string|number>} timestamps  completion dates of approved submissions
 * @param {string} todayKey                        IST day key treated as "today"
 * @param {Array<string>} protectedDayKeys         IST day keys of ACTIVE adjustments
 */
const calculateStreaks = (timestamps, todayKey = istDateKey(new Date()), protectedDayKeys = []) => {
  const submissionDays = new Set(timestamps.map((value) => istDateKey(new Date(value))));
  const protectedDays = new Set(protectedDayKeys);
  const days = [...new Set([...submissionDays, ...protectedDays])].sort();

  // Days that are covered ONLY by host protection (no real approved submission).
  const protectedOnlyDays = [...protectedDays].filter((key) => !submissionDays.has(key)).length;

  if (days.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeDays: 0, protectedDays: 0 };
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const difference = (dayKeyToUtcDay(days[i]) - dayKeyToUtcDay(days[i - 1])) / DAY_MS;
    run = difference === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  const yesterday = utcDayToKey(dayKeyToUtcDay(todayKey) - DAY_MS);
  let currentStreak = 0;
  const latestDay = days[days.length - 1];
  if (latestDay === todayKey || latestDay === yesterday) {
    currentStreak = 1;
    for (let i = days.length - 1; i > 0; i -= 1) {
      const difference = (dayKeyToUtcDay(days[i]) - dayKeyToUtcDay(days[i - 1])) / DAY_MS;
      if (difference !== 1) break;
      currentStreak += 1;
    }
  }

  return {
    currentStreak,
    longestStreak,
    activeDays: days.length,
    protectedDays: protectedOnlyDays,
  };
};

module.exports = { calculateStreaks, isValidDateKey, dayKeyToUtcDay, utcDayToKey };
