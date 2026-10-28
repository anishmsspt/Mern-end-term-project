import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMyChallenges, getChallengeLeaderboard } from '../../services/api';
import { Trophy, Medal, Award, Flame, RefreshCw, Calendar, Users, ExternalLink, ShieldCheck } from 'lucide-react';

export default function LeaderboardPage() {
  const { token, user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [timeframe, setTimeframe] = useState('overall'); // 'overall' or 'weekly'
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user's challenges on mount
  useEffect(() => {
    async function loadChallenges() {
      try {
        const res = await getMyChallenges(token);
        if (res.success && res.data && res.data.length > 0) {
          setChallenges(res.data);
          setSelectedChallengeId(res.data[0]._id);
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

  // Load leaderboard whenever challenge or timeframe changes
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
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20">
          <Trophy className="w-4 h-4 text-amber-400" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40">
          <Medal className="w-4 h-4 text-slate-300" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40">
          <Award className="w-4 h-4 text-amber-600" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-mono text-xs font-semibold">
        #{rank}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Challenge Leaderboard
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Authoritative, verifiable rankings driven exclusively by host-approved solutions.
          </p>
        </div>

        {/* Controls: Challenge select & Timeframe toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {challenges.length > 0 && (
            <select
              value={selectedChallengeId}
              onChange={(e) => setSelectedChallengeId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
            >
              {challenges.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Timeframe selector */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setTimeframe('overall')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                timeframe === 'overall'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                timeframe === 'weekly'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Week
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* No Challenges State */}
      {challenges.length === 0 && !loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center max-w-md mx-auto">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-white">No active challenge found</h3>
          <p className="text-xs text-slate-400 mt-2">
            You must be enrolled in or host a challenge to view leaderboard standings. Join a challenge from your dashboard.
          </p>
        </div>
      )}

      {/* Challenge Summary Banner */}
      {leaderboardData && leaderboardData.challenge && (
        <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              Active Challenge Standings
            </span>
            <h2 className="text-lg font-bold text-white">{leaderboardData.challenge.title}</h2>
            <p className="text-xs text-slate-400 line-clamp-1">
              {leaderboardData.challenge.description || 'Continuous algorithm mastery tracking.'}
            </p>
          </div>

          <div className="flex items-center space-x-6 text-xs text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
            <div>
              <span className="block font-mono text-base font-bold text-white">
                {leaderboardData.totalParticipants || 0}
              </span>
              <span className="text-[10px] uppercase text-slate-500">Participants</span>
            </div>
            <div>
              <span className="block font-mono text-base font-bold text-amber-400">
                {leaderboardData.standings.reduce((sum, s) => sum + (s.totalPoints || 0), 0)}
              </span>
              <span className="text-[10px] uppercase text-slate-500">Total Points Awarded</span>
            </div>
            <div>
              <span className="block font-mono text-base font-bold text-emerald-400">
                {leaderboardData.standings.reduce((sum, s) => sum + (s.solvedCount || 0), 0)}
              </span>
              <span className="text-[10px] uppercase text-slate-500">Problems Solved</span>
            </div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-lg bg-rose-950/50 border border-rose-800/60 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Leaderboard Standings Table */}
      {leaderboardData && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-5 py-3.5 text-center w-16">Rank</th>
                  <th scope="col" className="px-5 py-3.5">Participant</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Score</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Solves</th>
                  <th scope="col" className="px-5 py-3.5">Breakdown (E / M / H)</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Latest Solved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboardData.standings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-500">
                      No approved solutions recorded yet for this timeframe.
                    </td>
                  </tr>
                ) : (
                  leaderboardData.standings.map((entry) => {
                    const isCurrentUser = user && user._id === entry.userId;
                    return (
                      <tr
                        key={entry.userId}
                        className={`transition ${
                          isCurrentUser
                            ? 'bg-amber-500/10 hover:bg-amber-500/15'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          {getRankBadge(entry.rank)}
                        </td>

                        {/* Participant Details */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                              {entry.name?.charAt(0)?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white text-sm">
                                  {entry.name}
                                </span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500 text-slate-950">
                                    YOU
                                  </span>
                                )}
                              </div>
                              {entry.leetCodeUsername ? (
                                <a
                                  href={`https://leetcode.com/u/${entry.leetCodeUsername}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono mt-0.5"
                                >
                                  <span>@{entry.leetCodeUsername}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {entry.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Points */}
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <span className="font-mono text-base font-extrabold text-amber-400">
                            {entry.totalPoints}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">pts</span>
                        </td>

                        {/* Solved Count */}
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <span className="font-mono text-sm font-semibold text-white">
                            {entry.solvedCount}
                          </span>
                          <span className="text-[10px] text-slate-500 block font-mono">solved</span>
                        </td>

                        {/* Difficulty Breakdown */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                              title="Easy Solves"
                            >
                              {entry.easyCount || 0}E
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40"
                              title="Medium Solves"
                            >
                              {entry.mediumCount || 0}M
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-950/60 text-rose-400 border border-rose-800/40"
                              title="Hard Solves"
                            >
                              {entry.hardCount || 0}H
                            </span>
                          </div>
                        </td>

                        {/* Last Solved Date */}
                        <td className="px-5 py-4 whitespace-nowrap text-right font-mono text-[11px] text-slate-400">
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
