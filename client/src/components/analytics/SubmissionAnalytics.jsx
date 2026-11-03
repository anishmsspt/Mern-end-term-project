import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSubmissionAnalytics } from '../../services/api';
import {
  IST_TIMEZONE,
  buildDailyTrend,
  findPeakHour,
  formatHourLabel,
  formatIstDateTime,
  formatIstDayKey,
  toCountMap,
} from './analyticsUtils';

const STATUS_STYLES = {
  Approved: { color: '#8fbf9c', label: 'Approved' },
  Pending: { color: '#e2ae58', label: 'Pending' },
  Rejected: { color: '#d9695c', label: 'Rejected' },
  ResubmissionRequested: { color: '#9dbca6', label: 'Resubmission requested' },
};
const FALLBACK_STATUS_COLOR = '#959b95';

const SOURCE_STYLES = {
  manual: { color: '#f2b48c', label: 'Manual' },
  automated: { color: '#739d84', label: 'Automated' },
};

/* ---------------------------- Small building blocks ---------------------------- */

function StatCard({ label, value, accent }) {
  return (
    <div className="p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-500">{label}</div>
      <div className="font-serif text-4xl text-cream-50 mt-1 leading-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  );
}

function Panel({ eyebrow, title, children, className = '' }) {
  return (
    <section className={`lc-card p-5 sm:p-6 ${className}`}>
      <div className="mb-4">
        <div className="lc-eyebrow mb-1">{eyebrow}</div>
        <h3 className="font-serif text-xl text-cream-50 font-normal">{title}</h3>
      </div>
      {children}
    </section>
  );
}

/** Horizontal stacked share bar + legend. Used for both status and source breakdowns. */
function BreakdownBar({ items, total }) {
  if (!total) {
    return <p className="text-xs text-ink-500 italic">No submissions yet.</p>;
  }
  return (
    <div className="space-y-4">
      <div
        className="flex h-3 w-full overflow-hidden rounded-sm bg-ink-800"
        role="img"
        aria-label={items.map((i) => `${i.label}: ${i.count}`).join(', ')}
      >
        {items
          .filter((i) => i.count > 0)
          .map((i) => (
            <div key={i.key} style={{ width: `${(i.count / total) * 100}%`, backgroundColor: i.color }} title={`${i.label}: ${i.count}`} />
          ))}
      </div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-cream-200">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i.color }} />
              {i.label}
            </span>
            <span className="font-mono text-cream-100">
              {i.count}
              <span className="ml-2 text-ink-500">{Math.round((i.count / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 24-bar hourly chart (IST). Pure CSS so it scales to any width. */
function HourlyChart({ hourly }) {
  const max = Math.max(1, ...hourly.map((h) => h.count));
  const peak = findPeakHour(hourly);
  return (
    <div>
      <div className="flex h-44 items-end gap-[3px] sm:gap-1" role="img" aria-label="Submissions per IST hour">
        {hourly.map((h) => (
          <div key={h.hour} className="group relative flex h-full flex-1 flex-col justify-end" title={`${formatHourLabel(h.hour)} IST: ${h.count}`}>
            <div
              className={`w-full rounded-t-sm transition-colors ${h.count ? 'bg-peach-300 group-hover:bg-peach-200' : 'bg-ink-800'}`}
              style={{ height: h.count ? `${Math.max(4, (h.count / max) * 100)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-mono text-ink-500">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
      <p className="mt-3 text-[11px] text-ink-400">
        {peak ? (
          <>
            Peak hour: <span className="text-cream-100 font-mono">{formatHourLabel(peak.hour)}</span> IST ({peak.count} submission
            {peak.count === 1 ? '' : 's'})
          </>
        ) : (
          'No activity recorded yet.'
        )}
      </p>
    </div>
  );
}

/** Daily bars + cumulative line in one SVG (responsive via viewBox). */
function TrendChart({ trend }) {
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = 200;
  const pad = { l: 34, r: 12, t: 10, b: 22 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const maxDaily = Math.max(1, ...trend.map((d) => d.count));
  const maxCum = Math.max(1, trend[trend.length - 1]?.cumulative || 1);
  const step = innerW / trend.length;
  const barW = Math.max(2, Math.min(28, step * 0.6));

  const x = (i) => pad.l + step * i + step / 2;
  const yDaily = (v) => pad.t + innerH - (v / maxDaily) * innerH;
  const yCum = (v) => pad.t + innerH - (v / maxCum) * innerH;

  const line = trend.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${yCum(d.cumulative).toFixed(1)}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(trend.length / 6));
  const active = hover != null ? trend[hover] : null;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Daily submissions and cumulative total">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + innerH * (1 - t)} y2={pad.t + innerH * (1 - t)} stroke="#272c2e" strokeWidth="1" />
            <text x={pad.l - 6} y={pad.t + innerH * (1 - t) + 3} textAnchor="end" fontSize="9" fill="#6f7672" fontFamily="monospace">
              {Math.round(maxDaily * t)}
            </text>
          </g>
        ))}
        {trend.map((d, i) => (
          <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
            <rect x={pad.l + step * i} y={pad.t} width={step} height={innerH} fill="transparent" />
            <rect
              x={x(i) - barW / 2}
              y={yDaily(d.count)}
              width={barW}
              height={d.count ? pad.t + innerH - yDaily(d.count) : 1}
              rx="1.5"
              fill={hover === i ? '#f7d3b8' : '#f2b48c'}
              opacity={d.count ? 1 : 0.35}
            />
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#6f7672" fontFamily="monospace">
                {formatIstDayKey(d.date)}
              </text>
            )}
          </g>
        ))}
        <path d={line} fill="none" stroke="#739d84" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {trend.length <= 31 && trend.map((d, i) => <circle key={d.date} cx={x(i)} cy={yCum(d.cumulative)} r="2.2" fill="#9dbca6" />)}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-peach-300" /> Daily
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-pine-400" /> Cumulative
          </span>
        </div>
        <span className="font-mono text-cream-200 min-h-[1rem]">
          {active ? `${formatIstDayKey(active.date, true)}: ${active.count} today · ${active.cumulative} total` : 'Hover a bar for details'}
        </span>
      </div>
    </div>
  );
}

function ParticipantTable({ rows }) {
  if (!rows.length) {
    return <p className="text-xs text-ink-500 italic">No participants have submitted in this challenge yet.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-5 sm:mx-0">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-cream-100/10 text-[10px] uppercase tracking-[0.2em] text-ink-500">
            <th className="py-2.5 px-5 sm:px-3 font-semibold">Participant</th>
            <th className="py-2.5 px-3 font-semibold">LeetCode</th>
            <th className="py-2.5 px-3 font-semibold text-right">Total</th>
            <th className="py-2.5 px-3 font-semibold text-right">Approved</th>
            <th className="py-2.5 px-3 font-semibold text-right">Pending</th>
            <th className="py-2.5 px-3 font-semibold text-right">Rejected</th>
            <th className="py-2.5 px-3 font-semibold">Last submission (IST)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-100/5">
          {rows.map((r) => (
            <tr key={r.participant._id} className="hover:bg-cream-100/[0.03]">
              <td className="py-3 px-5 sm:px-3 text-cream-50">{r.participant.name || <span className="italic text-ink-500">Unknown user</span>}</td>
              <td className="py-3 px-3 font-mono text-peach-300">{r.participant.leetcodeUsername ? `@${r.participant.leetcodeUsername}` : <span className="text-ink-500">—</span>}</td>
              <td className="py-3 px-3 text-right font-mono text-cream-50">{r.total}</td>
              <td className="py-3 px-3 text-right font-mono text-easy">{r.approved ?? 0}</td>
              <td className="py-3 px-3 text-right font-mono text-medium">{r.pending ?? 0}</td>
              <td className="py-3 px-3 text-right font-mono text-hard">{r.rejected ?? 0}</td>
              <td className="py-3 px-3 font-mono text-cream-200 whitespace-nowrap">{formatIstDateTime(r.lastSubmissionAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------- Main widget --------------------------------- */

export default function SubmissionAnalytics({ challenges = [] }) {
  const { token } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  // Default to the first challenge; recover if the selected one disappears.
  useEffect(() => {
    if (!challenges.length) {
      setSelectedId('');
      return;
    }
    if (!challenges.some((c) => c._id === selectedId)) {
      setSelectedId((challenges.find((c) => c.status === 'active') || challenges[0])._id);
    }
  }, [challenges, selectedId]);

  const load = useCallback(async () => {
    if (!selectedId || !token) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    setData(null); // never show a previous challenge's participants under a new selection
    try {
      const res = await getSubmissionAnalytics(selectedId, token);
      if (seq === requestSeq.current) setData(res);
    } catch (err) {
      if (seq === requestSeq.current) setError(err.message || 'Failed to load analytics.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [selectedId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const statusCounts = useMemo(() => toCountMap(data?.statusBreakdown), [data]);
  const sourceCounts = useMemo(() => toCountMap(data?.sourceBreakdown), [data]);
  const trend = useMemo(() => buildDailyTrend(data?.dailyActivity), [data]);
  const total = data?.summary?.total || 0;

  const statusItems = useMemo(() => {
    const known = Object.keys(STATUS_STYLES).filter((k) => statusCounts[k] != null || ['Approved', 'Pending', 'Rejected'].includes(k));
    const extras = Object.keys(statusCounts).filter((k) => !STATUS_STYLES[k]);
    return [...known, ...extras].map((k) => ({
      key: k,
      label: STATUS_STYLES[k]?.label || k,
      color: STATUS_STYLES[k]?.color || FALLBACK_STATUS_COLOR,
      count: statusCounts[k] || 0,
    }));
  }, [statusCounts]);

  const sourceItems = useMemo(() => {
    const keys = Object.keys(SOURCE_STYLES);
    const extras = Object.keys(sourceCounts).filter((k) => !SOURCE_STYLES[k]);
    return [...keys, ...extras].map((k) => ({
      key: k,
      label: SOURCE_STYLES[k]?.label || k,
      color: SOURCE_STYLES[k]?.color || FALLBACK_STATUS_COLOR,
      count: sourceCounts[k] || 0,
    }));
  }, [sourceCounts]);

  const selectedChallenge = challenges.find((c) => c._id === selectedId);

  return (
    <section id="submission-analytics" className="lc-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-cream-100/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="lc-eyebrow mb-1">Insights</div>
          <h2 className="font-serif text-2xl text-cream-50 font-normal">Submission analytics</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            All times shown in IST ({IST_TIMEZONE}). Automated = original LeetCode time; manual = time received.
          </p>
        </div>

        {challenges.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 sm:w-64">
              <label htmlFor="analytics-challenge-select" className="lc-label">
                Challenge
              </label>
              <select
                id="analytics-challenge-select"
                className="lc-input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {challenges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={load} disabled={loading} className="lc-btn-secondary py-2.5 px-3" aria-label="Refresh analytics" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {challenges.length === 0 ? (
          <div className="rounded border border-dashed border-cream-100/15 p-12 text-center">
            <BarChart3 className="mx-auto mb-3 h-6 w-6 text-ink-500" />
            <p className="font-serif italic text-lg text-cream-200">No challenges to analyse</p>
            <p className="mt-1 text-xs text-ink-500">Create a challenge and analytics will appear once submissions arrive.</p>
          </div>
        ) : loading && !data ? (
          <div className="flex min-h-[260px] items-center justify-center" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-peach-300" />
              <span className="text-[10px] uppercase tracking-[0.24em] text-ink-400">Loading analytics...</span>
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-col items-center gap-3 rounded border border-hard/40 bg-hard/10 p-8 text-center">
            <AlertTriangle className="h-6 w-6 text-hard" />
            <p className="text-sm text-hard">{error}</p>
            <button type="button" onClick={load} className="lc-btn-secondary py-2 px-4 text-xs">
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Overview cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 border border-cream-100/10 rounded overflow-hidden bg-ink-900/60 divide-x divide-y lg:divide-y-0 divide-cream-100/10">
              <StatCard label="Total" value={total} />
              <StatCard label="Approved" value={statusCounts.Approved || 0} accent="#8fbf9c" />
              <StatCard label="Pending" value={statusCounts.Pending || 0} accent="#e2ae58" />
              <StatCard label="Rejected" value={statusCounts.Rejected || 0} accent="#d9695c" />
              <StatCard label="Manual" value={sourceCounts.manual || 0} accent="#f2b48c" />
              <StatCard label="Automated" value={sourceCounts.automated || 0} accent="#739d84" />
            </div>

            {total === 0 ? (
              <div className="rounded border border-dashed border-cream-100/15 p-12 text-center">
                <BarChart3 className="mx-auto mb-3 h-6 w-6 text-ink-500" />
                <p className="font-serif italic text-lg text-cream-200">No submissions yet for {selectedChallenge?.title || 'this challenge'}</p>
                <p className="mt-1 text-xs text-ink-500">Charts and the participant table fill in as soon as the first submission arrives.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel eyebrow="Activity" title="Hourly activity (IST)">
                    <HourlyChart hourly={data.hourlyActivity || []} />
                  </Panel>
                  <Panel eyebrow="Activity" title="Daily activity & trend">
                    <TrendChart trend={trend} />
                  </Panel>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Panel eyebrow="Breakdown" title="By status">
                    <BreakdownBar items={statusItems} total={total} />
                  </Panel>
                  <Panel eyebrow="Breakdown" title="By source">
                    <BreakdownBar items={sourceItems} total={total} />
                  </Panel>
                </div>

                <Panel eyebrow="Participants" title="Participant analytics">
                  <ParticipantTable rows={data.participantActivity || []} />
                </Panel>

                <p className="text-[11px] text-ink-500">
                  First submission: {formatIstDateTime(data.summary?.firstSubmissionAt)} · Latest: {formatIstDateTime(data.summary?.lastSubmissionAt)}
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
