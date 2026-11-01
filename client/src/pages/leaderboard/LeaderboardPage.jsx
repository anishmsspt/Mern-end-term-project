import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyChallenges, getChallengeLeaderboard } from '../../services/api';
import { Trophy, RefreshCw, Users, ExternalLink } from 'lucide-react';

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

  const standings = leaderboardData?.standings || [];
  const topFirst = standings.find((s) => s.rank === 1);
  const topSecond = standings.find((s) => s.rank === 2);
  const topThird = standings.find((s) => s.rank === 3);
  const hasPodium = standings.length > 0;

  return (
    <div className="lc-page space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-cream-100/10 pb-6">
        <div>
          <div className="lc-eyebrow mb-1">Standings</div>
          <h1 className="font-serif text-4xl sm:text-5xl text-cream-50 font-normal">
            Leaderboard
          </h1>
          <p className="text-xs text-ink-400 mt-1">
            Authoritative scores verified from host-approved LeetCode solutions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {challenges.length > 0 && (
            <select
              value={selectedChallengeId}
              onChange={(e) => setSelectedChallengeId(e.target.value)}
              className="lc-input py-1.5 px-3 w-auto text-xs"
            >
              {challenges.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center border-b border-cream-100/10">
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
            className="lc-btn-ghost p-2"
            title="Refresh leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-peach-300' : ''}`} />
          </button>
        </div>
      </div>

      {challenges.length === 0 && !loading && (
        <div className="lc-card p-12 text-center">
          <Users className="w-8 h-8 text-ink-500 mx-auto mb-3" />
          <h3 className="font-serif text-2xl text-cream-50">No challenge found</h3>
          <p className="text-xs text-ink-400 mt-1">
            Join or create a challenge from your dashboard to view cohort standings.
          </p>
        </div>
      )}

      {leaderboardData && leaderboardData.challenge && (
        <div className="lc-card p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-serif text-2xl text-cream-50 font-normal">
              {leaderboardData.challenge.title}
            </div>
            <p className="text-xs text-ink-400 mt-0.5 line-clamp-1">
              {leaderboardData.challenge.description || 'Cohort standings and solve metrics.'}
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-ink-400">
            <div>
              <span className="block font-serif text-2xl text-cream-50">
                {leaderboardData.totalParticipants || 0}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-ink-500">Participants</span>
            </div>
            <div>
              <span className="block font-serif text-2xl text-peach-300">
                {leaderboardData.standings.reduce((sum, s) => sum + (s.totalPoints || 0), 0)}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-ink-500">Total Points</span>
            </div>
            <div>
              <span className="block font-serif text-2xl text-easy">
                {leaderboardData.standings.reduce((sum, s) => sum + (s.solvedCount || 0), 0)}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-ink-500">Solves</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-sm border border-hard/40 bg-hard/10 text-xs text-hard">
          {error}
        </div>
      )}

      {/* Top 3 Podium (Visual presentation of top 3 in standings) */}
      {hasPodium && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2">
          {/* Rank 2 */}
          <div className="order-2 md:order-1 lc-card p-5 text-center space-y-1">
            <div className="font-serif italic text-3xl text-ink-400">ii</div>
            <div className="font-serif text-xl text-cream-50 truncate">
              {topSecond?.name || '—'}
            </div>
            <div className="font-mono text-xs text-ink-400">
              {topSecond ? `${topSecond.totalPoints} pts · ${topSecond.solvedCount} solves` : 'Unclaimed'}
            </div>
          </div>

          {/* Rank 1 (Center, taller, highlighted) */}
          <div className="order-1 md:order-2 lc-card p-6 text-center space-y-1.5 border-peach-300/40 shadow-card-lift relative">
            <div className="font-serif italic text-4xl text-peach-300">i</div>
            <div className="font-serif text-2xl text-cream-50 font-normal truncate">
              {topFirst?.name || '—'}
            </div>
            <div className="font-mono text-sm text-peach-300 font-semibold">
              {topFirst ? `${topFirst.totalPoints} pts` : 'Unclaimed'}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500">
              {topFirst ? `${topFirst.solvedCount} solves verified` : 'Cohort Leader'}
            </div>
          </div>

          {/* Rank 3 */}
          <div className="order-3 lc-card p-5 text-center space-y-1">
            <div className="font-serif italic text-3xl text-ink-400">iii</div>
            <div className="font-serif text-xl text-cream-50 truncate">
              {topThird?.name || '—'}
            </div>
            <div className="font-mono text-xs text-ink-400">
              {topThird ? `${topThird.totalPoints} pts · ${topThird.solvedCount} solves` : 'Unclaimed'}
            </div>
          </div>
        </div>
      )}

      {/* Complete Leaderboard Table */}
      {leaderboardData && (
        <div className="lc-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-cream-100/10 text-[10px] uppercase tracking-[0.24em] text-ink-500 font-semibold">
                  <th className="px-6 py-3.5 w-16 text-center">#</th>
                  <th className="px-6 py-3.5">Participant</th>
                  <th className="px-6 py-3.5 text-right">Score</th>
                  <th className="px-6 py-3.5 text-right">Solves</th>
                  <th className="px-6 py-3.5">E / M / H</th>
                  <th className="px-6 py-3.5 text-right">Latest solve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100/[0.05]">
                {standings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-14 font-serif italic text-lg text-ink-400">
                      No approved solutions recorded yet for this timeframe.
                    </td>
                  </tr>
                ) : (
                  standings.map((entry) => {
                    const isCurrentUser = user && user._id === entry.userId;
                    return (
                      <tr
                        key={entry.userId}
                        className={`transition-colors ${
                          isCurrentUser
                            ? 'bg-gradient-to-r from-ember-500/15 via-ember-500/5 to-transparent'
                            : 'hover:bg-cream-100/[0.02]'
                        }`}
                      >
                        <td className="px-6 py-3.5 text-center">
                          <span
                            className={`font-serif text-xl ${
                              entry.rank === 1
                                ? 'text-peach-300 font-normal italic'
                                : entry.rank <= 3
                                ? 'text-cream-50 italic'
                                : 'text-ink-400'
                            }`}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-lg text-cream-50">
                              {entry.name}
                            </span>
                            {isCurrentUser && (
                              <span className="lc-badge lc-badge-role text-[9px] py-0 px-1.5">
                                You
                              </span>
                            )}
                          </div>
                          {entry.leetCodeUsername && (
                            <a
                              href={`https://leetcode.com/u/${entry.leetCodeUsername}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-ink-500 hover:text-peach-300 font-mono transition-colors"
                            >
                              <span>@{entry.leetCodeUsername}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="font-serif text-2xl text-cream-50">
                            {entry.totalPoints}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs text-cream-200">
                          {entry.solvedCount}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs">
                          <span className="text-easy">{entry.easyCount || 0}</span>
                          <span className="text-ink-500"> / </span>
                          <span className="text-medium">{entry.mediumCount || 0}</span>
                          <span className="text-ink-500"> / </span>
                          <span className="text-hard">{entry.hardCount || 0}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono text-xs text-ink-400">
                          {entry.lastSolvedAt
                            ? new Date(entry.lastSolvedAt).toLocaleDateString()
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
