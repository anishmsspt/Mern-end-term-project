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
      <div className="lc-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">{activeChallenge.title}</h2>
              <span className="lc-badge bg-easy/10 text-easy">{activeChallenge.status}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{activeChallenge.description}</p>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Code <span className="text-brand-500 font-semibold">{activeChallenge.joinCode}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400">
          <div>
            Window{' '}
            <span className="text-slate-200 font-mono">
              {new Date(activeChallenge.startDate).toLocaleDateString()} —{' '}
              {new Date(activeChallenge.endDate).toLocaleDateString()}
            </span>
          </div>
          <div>
            Daily limit{' '}
            <span className="text-slate-200">
              {activeChallenge.rules?.maxSubmissionsPerDay || 5} / day
            </span>
          </div>
          <div>
            Scoring{' '}
            <span className="text-slate-200 capitalize">
              {activeChallenge.rules?.pointsPolicy || 'Manual host allocation'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lc-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">Join a challenge</h2>
        <p className="text-xs text-slate-400">Enter the join code from your host.</p>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 text-xs text-hard">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 text-xs text-easy">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {isParticipant ? (
        <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="SPRINT26"
            className="lc-input uppercase font-mono flex-1"
          />
          <button type="submit" disabled={isLoading || !joinCode.trim()} className="lc-btn-primary">
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
        <p className="text-xs text-slate-400">Hosts create and manage challenges from this dashboard.</p>
      )}
    </div>
  );
}
