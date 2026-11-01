import React, { useState } from 'react';
import { joinChallenge } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function JoinChallengeCard({ activeChallenge, onChallengeJoined }) {
  const { token, isParticipant } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!joinCode.trim()) {
      setErrorMsg('Please enter a challenge join code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await joinChallenge(joinCode.trim(), token);
      setSuccessMsg(res.message || 'Successfully joined challenge!');
      setJoinCode('');
      if (onChallengeJoined) {
        onChallengeJoined(res.challenge);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join challenge. Please verify the join code.');
    } finally {
      setIsLoading(false);
    }
  };

  if (activeChallenge) {
    return (
      <div className="lc-card lc-card-pine p-6 relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-serif text-2xl text-cream-50 font-normal">
                {activeChallenge.title}
              </span>
              <span className="lc-badge lc-badge-approved">
                {activeChallenge.status}
              </span>
            </div>
            <p className="text-xs text-pine-300 mt-1 max-w-xl leading-relaxed">
              {activeChallenge.description || 'Active competitive programming cohort challenge.'}
            </p>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.24em] text-pine-300">
              Join code
            </div>
            <div className="font-mono text-xl tracking-[0.22em] text-peach-300 font-semibold mt-0.5">
              {activeChallenge.joinCode}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-pine-500/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-pine-300">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-pine-400 block mb-0.5">Timeframe</span>
            <span className="text-cream-100 font-mono text-[11px]">
              {new Date(activeChallenge.startDate).toLocaleDateString()} — {new Date(activeChallenge.endDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-pine-400 block mb-0.5">Daily cap</span>
            <span className="text-cream-100 font-semibold">
            {activeChallenge.rules?.maxSubmissionsPerDay == null
                ? 'Unlimited'
                : `${activeChallenge.rules.maxSubmissionsPerDay} problems / day`}
            </span>
          </div>
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-pine-400 block mb-0.5">Scoring</span>
            <span className="text-cream-100 capitalize">
              {activeChallenge.rules?.pointsPolicy || 'Host allocation'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lc-card p-6 space-y-4">
      <div>
        <div className="lc-eyebrow mb-1">Cohort Enrollment</div>
        <h2 className="font-serif text-2xl text-cream-50 font-normal">Join a challenge</h2>
        <p className="text-xs text-ink-400 mt-1">
          Enter the unique join code provided by your cohort host.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-sm border border-hard/40 bg-hard/10 flex items-start gap-2 text-xs text-hard">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-sm border border-easy/40 bg-easy/10 flex items-start gap-2 text-xs text-easy">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {isParticipant ? (
        <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="SPRINT26"
            className="lc-input uppercase font-mono tracking-[0.2em] text-peach-300 flex-1 py-2.5"
          />
          <button
            type="submit"
            disabled={isLoading || !joinCode.trim()}
            className="lc-btn-primary px-6 py-2.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              'Join'
            )}
          </button>
        </form>
      ) : (
        <p className="text-xs text-ink-400">
          As a host, you can provision and govern challenges from the management section below.
        </p>
      )}
    </div>
  );
}
