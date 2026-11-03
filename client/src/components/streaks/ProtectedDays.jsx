import React from 'react';
import { ShieldCheck } from 'lucide-react';

const formatDayKey = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * Participant view of streak credits. Deliberately separate from the
 * submissions table: protected days are NOT LeetCode submissions and carry no points.
 */
export default function ProtectedDays({ adjustments = [], streak }) {
  if (!streak && adjustments.length === 0) return null;

  return (
    <section id="protected-days" className="lc-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-cream-100/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="lc-eyebrow mb-0.5">Streak</div>
          <h2 className="font-serif text-2xl text-cream-50 font-normal">Your streak</h2>
        </div>
        {streak && (
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-ink-500">Current</span>
              <span className="font-semibold text-orange-300">🔥 {streak.currentStreak}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.22em] text-ink-500">Best</span>
              <span className="font-semibold text-cream-100">{streak.longestStreak}</span>
            </div>
          </div>
        )}
      </div>

      {adjustments.length === 0 ? (
        <p className="px-6 py-5 text-xs text-ink-500">
          No host-protected days. Your streak is built from your approved submissions.
        </p>
      ) : (
        <div className="px-6 py-4">
          <p className="mb-3 text-[11px] text-ink-400">
            Host-protected days keep your streak intact after a technical issue. They are not LeetCode
            submissions and do not earn points.
          </p>
          <ul className="space-y-2">
            {adjustments.map((adj) => (
              <li
                key={adj._id}
                className="flex flex-col gap-1 rounded-sm border border-dashed border-peach-300/30 bg-peach-300/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs text-cream-100">{formatDayKey(adj.date)}</div>
                  <p className="break-words text-[11px] text-ink-400">“{adj.reason}”</p>
                </div>
                <span className="lc-badge lc-badge-role shrink-0 self-start sm:self-auto">
                  <ShieldCheck className="h-3 w-3" />
                  Host Protected
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
