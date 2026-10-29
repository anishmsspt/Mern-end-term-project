import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyChallenges, getChallengeLeaderboard } from '../../services/api';
import { Trophy, Medal, Award, RefreshCw, Users, ExternalLink } from 'lucide-react';

export default function LeaderboardPage() {
  const { token, user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [timeframe, setTimeframe] = useState('overall');
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadChallenges() {
      try {
        const res = await getMyChallenges(token);
        const challengeList = res.challenges || res.data || [];
        if (res.success && challengeList.length > 0) {
          setChallenges(challengeList);
          setSelectedChallengeId(challengeList[0]._id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err.message || 'Failed to load challenges');
        setLoading(false);
      }
    }
    loadChallenges();
  }, [token]);

  useEffect(() => {
    if (!selectedChallengeId) return;

    let isMounted = true;
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const tf = timeframe === 'weekly' ? 'weekly' : '';
        const res = await getChallengeLeaderboard(selectedChallengeId, tf, token);
        if (isMounted) {
          if (res.success) {
            setLeaderboardData(res.data);
          } else {
            setError(res.message || 'Failed to fetch standings');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Error loading leaderboard data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      isMounted = false;
    };
  }, [selectedChallengeId, timeframe, token]);

  const handleRefresh = async () => {
    if (!selectedChallengeId) return;
    setLoading(true);
    try {
      const tf = timeframe === 'weekly' ? 'weekly' : '';
      const res = await getChallengeLeaderboard(selectedChallengeId, tf, token);
      if (res.success) {
        setLeaderboardData(res.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 text-brand-500">
          <Trophy className="w-4 h-4" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 text-slate-300">
          <Medal className="w-4 h-4" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 text-amber-700">
          <Award className="w-4 h-4" />
        </span>
      );
    }
    return <span className="font-mono text-xs text-slate-500">{rank}</span>;
  };

  return (
    <div className="lc-page space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Leaderboard</h1>
          <p className="text-xs text-slate-400">Rankings from host-approved solutions only.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {challenges.length > 0 && (
            <select
              value={selectedChallengeId}
              onChange={(e) => setSelectedChallengeId(e.target.value)}
              className="lc-input py-1.5 w-auto text-xs"
            >
              {challenges.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5">
            <button
              onClick={() => setTimeframe('overall')}
              className={timeframe === 'overall' ? 'lc-tab-active' : 'lc-tab-idle'}
            >
              Overall
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={timeframe === 'weekly' ? 'lc-tab-active' : 'lc-tab-idle'}
            >
              This week
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="lc-btn-ghost p-1.5"
            title="Refresh leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>
      </div>

      {challenges.length === 0 && !loading && (
        <div className="lc-card p-10 text-center">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white">No challenge found</h3>
          <p className="text-xs text-slate-400 mt-1">Join a challenge from the dashboard to view standings.</p>
        </div>
      )}

      {leaderboardData && leaderboardData.challenge && (
        <div className="lc-card px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <div className="text-sm font-semibold text-white">{leaderboardData.challenge.title}</div>
            <p className="text-slate-400 line-clamp-1">
              {leaderboardData.challenge.description || 'Cohort standings'}
            </p>
          </div>
          <div className="flex items-center gap-5 text-slate-400">
            <div>
              <span className="block font-mono text-sm text-white">
                {leaderboardData.totalParticipants || 0}
              </span>
              Participants
            </div>
            <div>
              <span className="block font-mono text-sm text-brand-500">
                {leaderboardData.standings.reduce((sum, s) => sum + (s.totalPoints || 0), 0)}
              </span>
              Points
            </div>
            <div>
              <span className="block font-mono text-sm text-easy">
                {leaderboardData.standings.reduce((sum, s) => sum + (s.solvedCount || 0), 0)}
              </span>
              Solves
            </div>
          </div>
        </div>
      )}

      {error && <div className="lc-card border-hard/30 p-3 text-xs text-hard">{error}</div>}

      {leaderboardData && (
        <div className="lc-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2 w-12 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Participant</th>
                  <th className="px-4 py-2 text-right font-medium">Score</th>
                  <th className="px-4 py-2 text-right font-medium">Solves</th>
                  <th className="px-4 py-2 font-medium">E / M / H</th>
                  <th className="px-4 py-2 text-right font-medium">Latest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leaderboardData.standings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 text-sm">
                      No approved solutions recorded yet for this timeframe.
                    </td>
                  </tr>
                ) : (
                  leaderboardData.standings.map((entry) => {
                    const isCurrentUser = user && user._id === entry.userId;
                    return (
                      <tr
                        key={entry.userId}
                        className={isCurrentUser ? 'bg-brand-500/10' : 'hover:bg-slate-850/80'}
                      >
                        <td className="px-4 py-2.5 text-center">{getRankBadge(entry.rank)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{entry.name}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] font-semibold text-brand-500">YOU</span>
                            )}
                          </div>
                          {entry.leetCodeUsername ? (
                            <a
                              href={`https://leetcode.com/u/${entry.leetCodeUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-400 font-mono"
                            >
                              @{entry.leetCodeUsername}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">{entry.email}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand-500">
                          {entry.totalPoints}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-200">
                          {entry.solvedCount}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          <span className="text-easy">{entry.easyCount || 0}</span>
                          <span className="text-slate-600"> / </span>
                          <span className="text-medium">{entry.mediumCount || 0}</span>
                          <span className="text-slate-600"> / </span>
                          <span className="text-hard">{entry.hardCount || 0}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {entry.lastSolvedAt
                            ? new Date(entry.lastSolvedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
