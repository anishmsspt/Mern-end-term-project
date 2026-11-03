import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, Undo2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getChallengeLeaderboard,
  getStreakAdjustments,
  grantStreakAdjustment,
  revokeStreakAdjustment,
} from '../../services/api';

const istTodayKey = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
const istKeyOf = (value) => new Date(new Date(value).getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);

const formatDayKey = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatStamp = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' IST'
    : '';

/**
 * Host-only "Streak Protection" panel.
 * Grants/revokes streak credits (calendar days only; never submissions or points).
 */
export default function StreakProtection({ challenges = [] }) {
  const { token } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [participants, setParticipants] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [participantId, setParticipantId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!challenges.length) {
      setSelectedId('');
      return;
    }
    if (!challenges.some((c) => c._id === selectedId)) {
      setSelectedId((challenges.find((c) => c.status === 'active') || challenges[0])._id);
    }
  }, [challenges, selectedId]);

  const selected = challenges.find((c) => c._id === selectedId);
  const minDate = selected ? istKeyOf(selected.startDate) : undefined;
  const endKey = selected ? istKeyOf(selected.endDate) : undefined;
  const today = istTodayKey();
  const maxDate = endKey && endKey < today ? endKey : today;

  const load = useCallback(async () => {
    if (!selectedId || !token) return;
    const current = ++seq.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [board, history] = await Promise.all([
        getChallengeLeaderboard(selectedId, 'overall', token),
        getStreakAdjustments(selectedId, token),
      ]);
      if (current !== seq.current) return;
      setParticipants(board.leaderboard || []);
      setAdjustments(history.adjustments || []);
    } catch (err) {
      if (current === seq.current) setLoadError(err.message || 'Failed to load streak protection data.');
    } finally {
      if (current === seq.current) setLoading(false);
    }
  }, [selectedId, token]);

  useEffect(() => {
    setParticipantId('');
    setDate('');
    setReason('');
    setFormError(null);
    setNotice(null);
    setParticipants([]);
    setAdjustments([]);
    load();
  }, [load]);

  const handleGrant = async (e) => {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    if (!participantId || !date || reason.trim().length < 5) {
      setFormError('Select a participant, a date, and give a reason of at least 5 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await grantStreakAdjustment(
        { challengeId: selectedId, participantId, date, reason: reason.trim() },
        token
      );
      const who = participants.find((p) => p.participantId === participantId)?.name || 'participant';
      setNotice(`Protected ${formatDayKey(date)} for ${who}. Current streak is now ${res.streak?.currentStreak ?? 0}.`);
      setDate('');
      setReason('');
      await load();
    } catch (err) {
      setFormError(err.message || 'Failed to grant streak protection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (adj) => {
    const who = adj.participant?.name || 'this participant';
    const input = window.prompt(
      `Revoke streak protection for ${who} on ${formatDayKey(adj.date)}?\nOptional reason (kept in the audit trail):`,
      ''
    );
    if (input === null) return; // cancelled
    setRevokingId(adj._id);
    setFormError(null);
    setNotice(null);
    try {
      await revokeStreakAdjustment(adj._id, input.trim(), token);
      setNotice(`Revoked protection for ${who} on ${formatDayKey(adj.date)}.`);
      await load();
    } catch (err) {
      setFormError(err.message || 'Failed to revoke streak protection.');
    } finally {
      setRevokingId(null);
    }
  };

  const visible = adjustments.filter((a) => statusFilter === 'all' || a.status === statusFilter);

  return (
    <section id="streak-protection" className="lc-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-cream-100/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="lc-eyebrow mb-1">Fairness</div>
          <h2 className="font-serif text-2xl text-cream-50 font-normal">Streak Protection</h2>
          <p className="mt-0.5 max-w-xl text-xs text-ink-400">
            Credit a calendar day (IST) when a technical issue stopped a real solve from being recorded. This
            preserves the streak only. It never creates a submission and never awards points.
          </p>
        </div>

        {challenges.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 sm:w-64">
              <label htmlFor="streak-challenge-select" className="lc-label">
                Challenge
              </label>
              <select
                id="streak-challenge-select"
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
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="lc-btn-secondary px-3 py-2.5"
              aria-label="Refresh streak protection data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {challenges.length === 0 ? (
        <p className="p-6 text-xs italic text-ink-500">Create a challenge to manage streak protection.</p>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:divide-x divide-cream-100/10">
          {/* Grant form */}
          <form id="streak-grant-form" onSubmit={handleGrant} className="space-y-4 border-b border-cream-100/10 p-5 sm:p-6 lg:border-b-0">
            <div className="flex items-center gap-2 text-peach-300">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em]">Grant streak credit</span>
            </div>

            <div>
              <label htmlFor="streak-participant" className="lc-label">Participant</label>
              <select
                id="streak-participant"
                className="lc-input"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                required
              >
                <option value="">{participants.length ? 'Select participant…' : 'No participants yet'}</option>
                {participants.map((p) => (
                  <option key={p.participantId} value={p.participantId}>
                    {p.name} · 🔥 {p.currentStreak || 0}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="streak-date" className="lc-label">Challenge date (IST)</label>
              <input
                id="streak-date"
                type="date"
                className="lc-input font-mono text-xs"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <p className="mt-1 text-[10px] text-ink-500">
                Within the challenge window; today (IST) or earlier.
              </p>
            </div>

            <div>
              <label htmlFor="streak-reason" className="lc-label">Reason</label>
              <textarea
                id="streak-reason"
                rows="3"
                maxLength={500}
                className="lc-input resize-none"
                placeholder="e.g. Our sync automation failed; solve was made on time."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <p className="mt-1 text-right text-[10px] text-ink-500">{reason.length}/500</p>
            </div>

            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-sm border border-hard/40 bg-hard/10 p-3 text-xs text-hard">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {notice && (
              <div role="status" className="rounded-sm border border-easy/30 bg-easy/10 p-3 text-xs text-easy">
                {notice}
              </div>
            )}

            <button type="submit" disabled={submitting || !selectedId} className="lc-btn-primary w-full py-2.5 text-xs">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Granting…
                </>
              ) : (
                'Grant streak credit'
              )}
            </button>
          </form>

          {/* History */}
          <div className="min-w-0 p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-400">
                Adjustment history <span className="font-mono text-peach-300">({visible.length})</span>
              </div>
              <div className="flex items-center gap-1 border-b border-cream-100/10">
                {['all', 'active', 'revoked'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={statusFilter === key ? 'lc-tab-active' : 'lc-tab-idle'}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {loadError && (
              <div role="alert" className="mb-3 rounded-sm border border-hard/40 bg-hard/10 p-3 text-xs text-hard">
                {loadError}
              </div>
            )}

            {loading && adjustments.length === 0 ? (
              <div className="flex items-center gap-2 py-10 text-xs text-ink-400">
                <Loader2 className="h-4 w-4 animate-spin text-peach-300" /> Loading history…
              </div>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center font-serif text-lg italic text-cream-200">
                {adjustments.length === 0 ? 'No streak credits granted yet' : `No ${statusFilter} adjustments`}
              </p>
            ) : (
              <ul className="divide-y divide-cream-100/[0.06]">
                {visible.map((adj) => (
                  <li key={adj._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-cream-100">{adj.participant?.name || 'Unknown participant'}</span>
                        <span className="font-mono text-xs text-peach-300">{formatDayKey(adj.date)}</span>
                        <span className={`lc-badge ${adj.status === 'active' ? 'lc-badge-approved' : 'lc-badge-rejected'}`}>
                          {adj.status}
                        </span>
                      </div>
                      <p className="break-words text-xs text-cream-300">“{adj.reason}”</p>
                      <p className="text-[10.5px] text-ink-500">
                        Granted by {adj.grantedBy?.name || 'host'} · {formatStamp(adj.grantedAt)}
                        {adj.status === 'revoked' && (
                          <>
                            {' '}· Revoked by {adj.revokedBy?.name || 'host'} · {formatStamp(adj.revokedAt)}
                            {adj.revokeReason ? ` — ${adj.revokeReason}` : ''}
                          </>
                        )}
                      </p>
                    </div>
                    {adj.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(adj)}
                        disabled={revokingId === adj._id}
                        className="lc-btn-danger shrink-0 text-[10px]"
                      >
                        {revokingId === adj._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
