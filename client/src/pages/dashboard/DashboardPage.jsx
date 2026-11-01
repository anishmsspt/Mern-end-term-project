
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyChallenges, getMySubmissions, createChallenge } from '../../services/api';
import JoinChallengeCard from '../../components/challenges/JoinChallengeCard';
import SubmissionModal from '../../components/submissions/SubmissionModal';
import SubmissionsList from '../../components/submissions/SubmissionsList';
import { ExternalLink, PlusCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, token, isHost, isParticipant } = useAuth();

  const [challenges, setChallenges] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [newChallengeForm, setNewChallengeForm] = useState({
    title: '',
    description: '',
    joinCode: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [createChallengeLoading, setCreateChallengeLoading] = useState(false);
  const [createChallengeError, setCreateChallengeError] = useState(null);

  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      const challengeRes = await getMyChallenges(token);
      const userChallenges = challengeRes.challenges || [];
      setChallenges(userChallenges);

      const currentActive = userChallenges.find((c) => c.status === 'active') || userChallenges[0] || null;
      setActiveChallenge(currentActive);

      if (isParticipant) {
        const subRes = await getMySubmissions(currentActive?._id, token);
        setSubmissions(subRes.submissions || []);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  const handleChallengeJoined = (newChallenge) => {
    setActiveChallenge(newChallenge);
    loadDashboardData();
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    setCreateChallengeLoading(true);
    setCreateChallengeError(null);
    try {
      const res = await createChallenge(newChallengeForm, token);
      if (res.success) {
        setIsCreateChallengeModalOpen(false);
        setNewChallengeForm({
          title: '',
          description: '',
          joinCode: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        loadDashboardData();
      } else {
        setCreateChallengeError(res.message || 'Failed to create challenge');
      }
    } catch (err) {
      setCreateChallengeError(err.message || 'Error creating challenge');
    } finally {
      setCreateChallengeLoading(false);
    }
  };

  const handleSubmissionCreated = (newSub) => {
    setSubmissions((prev) => [newSub, ...prev]);
  };

  const approvedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'Pending').length;

  return (
    <div className="lc-page space-y-6">
      <div className="relative isolate overflow-hidden rounded-2xl border border-white/[0.08] bg-[#090b12] px-6 py-8 shadow-2xl shadow-black/30 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-24 -top-32 -z-10 h-80 w-80 rounded-full bg-orange-500/[0.12] blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 h-64 w-64 rounded-full bg-violet-500/[0.07] blur-[100px]" />

        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-8 bg-orange-500" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">
                {isHost ? 'HOST CONTROL CENTER' : 'YOUR COMPETITIVE SPACE'}
              </p>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
              Welcome back,
              <span className="block bg-gradient-to-r from-orange-300 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0] || 'Champion'}.
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400">
              {isHost
                ? 'Your challenges. Your community. Keep the competition moving.'
                : 'Sharpen your skills, solve problems, and climb the leaderboard.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                {isHost ? 'Host access' : 'Participant access'}
              </span>
              <span className="text-xs text-slate-600">{user?.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/leaderboard"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Leaderboard
            </Link>

            {isParticipant && activeChallenge && (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="lc-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold shadow-lg shadow-orange-500/10"
              >
                <PlusCircle size={15} />
                Submit problem
              </button>
            )}

            {isHost && (
              <Link
                to="/host/review"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
              >
                Review queue
                <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      
      {isLoadingData ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0b0d14]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
            <p className="text-xs font-medium tracking-wide text-slate-500">
              LOADING YOUR WORKSPACE
            </p>
          </div>
        </div>
      ) : (
        <>
          <JoinChallengeCard
            activeChallenge={activeChallenge}
            onChallengeJoined={handleChallengeJoined}
          />

          {isParticipant && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0b0d14] p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Submitted
                </div>
                <div className="mt-2 text-3xl font-black text-white">
                  {submissions.length}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/10 bg-[#0b0d14] p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Pending
                </div>
                <div className="mt-2 text-3xl font-black text-amber-400">
                  {pendingCount}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/10 bg-[#0b0d14] p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Approved
                </div>
                <div className="mt-2 text-3xl font-black text-emerald-400">
                  {approvedCount}
                </div>
              </div>
            </div>
          )}

          {isParticipant && activeChallenge && (
            <SubmissionsList
              submissions={submissions}
              onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
            />
          )}

          {isHost && (
            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0d14]">
              <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
                    MANAGEMENT
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                    Your challenges
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Manage your competitive programming events.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateChallengeModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-bold text-black shadow-lg shadow-orange-500/10 transition hover:bg-orange-400"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create challenge
                </button>
              </div>

              <div className="p-5 sm:p-6">
                {challenges.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
                    <p className="text-sm font-medium text-slate-300">
                      No challenges yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Create your first challenge to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {challenges.map((c) => (
                      <div
                        key={c._id}
                        className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-orange-500/30 hover:bg-white/[0.035]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-white">
                              {c.title}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                              {c.description || 'No description provided.'}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                            {c.status}
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3">
                          <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                            JOIN CODE
                          </span>
                          <span className="rounded-md bg-orange-500/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-orange-400">
                            {c.joinCode}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-white/[0.07] bg-[#0b0d14] p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
                ACCOUNT
              </p>
              <h2 className="mt-1 text-lg font-bold text-white">Profile details</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Email
                </div>
                <div className="mt-2 break-all text-sm text-slate-300">
                  {user?.email}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Role
                </div>
                <div className="mt-2 text-sm font-semibold capitalize text-slate-300">
                  {user?.role}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  LeetCode
                </div>
                {user?.leetcodeUsername ? (
                  <a
                    href={`https://leetcode.com/u/${user.leetcodeUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-orange-400 transition hover:text-orange-300"
                  >
                    {user.leetcodeUsername}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span className="mt-2 block text-sm italic text-slate-600">
                    Not set
                  </span>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      
      {activeChallenge && (
        <SubmissionModal
          challenge={activeChallenge}
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSubmissionCreated={handleSubmissionCreated}
        />
      )}

      {isHost && isCreateChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-white/10 bg-[#0d1019] p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
                  HOST WORKSPACE
                </p>
                <h3 className="mt-1 text-xl font-bold text-white">
                  Create challenge
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Set up your next competitive sprint.
                </p>
              </div>

              <button
                onClick={() => setIsCreateChallengeModalOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Close
              </button>
            </div>

            {createChallengeError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {createChallengeError}
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-4 text-sm">
              <div>
                <label className="lc-label">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Winter 2026 30-Day Sprint"
                  value={newChallengeForm.title}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, title: e.target.value })
                  }
                  className="lc-input"
                />
              </div>

              <div>
                <label className="lc-label">Description</label>
                <textarea
                  rows="3"
                  placeholder="Goals, target problem count, rules..."
                  value={newChallengeForm.description}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, description: e.target.value })
                  }
                  className="lc-input resize-none"
                />
              </div>

              <div>
                <label className="lc-label">Join code (optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank for a random code"
                  value={newChallengeForm.joinCode}
                  onChange={(e) =>
                    setNewChallengeForm({
                      ...newChallengeForm,
                      joinCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="lc-input font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lc-label">Start *</label>
                  <input
                    type="date"
                    required
                    value={newChallengeForm.startDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, startDate: e.target.value })
                    }
                    className="lc-input"
                  />
                </div>

                <div>
                  <label className="lc-label">End *</label>
                  <input
                    type="date"
                    required
                    value={newChallengeForm.endDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, endDate: e.target.value })
                    }
                    className="lc-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateChallengeModalOpen(false)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-xs font-semibold text-slate-300 transition hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createChallengeLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {createChallengeLoading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {createChallengeLoading ? 'Creating...' : 'Create challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
