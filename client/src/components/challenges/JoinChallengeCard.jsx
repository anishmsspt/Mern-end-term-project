import React, { useState } from 'react';
import { joinChallenge } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Trophy,
  KeyRound,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShieldCheck,
  Users,
} from 'lucide-react';

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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">{activeChallenge.title}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                  Active Member
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{activeChallenge.description}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
              Code: <strong className="text-brand-400">{activeChallenge.joinCode}</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 space-y-1">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Challenge Window</span>
            </span>
            <div className="font-mono text-slate-200">
              {new Date(activeChallenge.startDate).toLocaleDateString()} — {new Date(activeChallenge.endDate).toLocaleDateString()}
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 space-y-1">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Daily Submission Limit</span>
            </span>
            <div className="font-mono text-slate-200">
              {activeChallenge.rules?.maxSubmissionsPerDay || 5} problems / day
            </div>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 space-y-1">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Scoring Policy</span>
            </span>
            <div className="font-mono text-slate-200 capitalize">
              {activeChallenge.rules?.pointsPolicy || 'Manual Host Allocation'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not yet joined a challenge
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Join a Challenge</h2>
          <p className="text-xs text-slate-400">
            Enter the unique challenge join code provided by your Host (e.g. <code className="text-slate-300">SPRINT26</code>)
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 flex items-start space-x-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-3 flex items-start space-x-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {isParticipant ? (
        <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. SPRINT26"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-100 uppercase font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !joinCode.trim()}
            className="py-2.5 px-5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Join Challenge</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-400 italic">
          Host accounts manage and configure challenges from the Host Overview.
        </p>
      )}
    </div>
  );
}
