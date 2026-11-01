import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyChallenges, getMySubmissions, createChallenge } from '../../services/api';
import JoinChallengeCard from '../../components/challenges/JoinChallengeCard';
import SubmissionModal from '../../components/submissions/SubmissionModal';
import SubmissionsList from '../../components/submissions/SubmissionsList';
import { ExternalLink, PlusCircle, Loader2, X } from 'lucide-react';

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
    <div className="lc-page space-y-8">
      {/* Editorial Dashboard Hero with Dawn Ridge dim band */}
      <div className="relative overflow-hidden rounded border border-cream-100/10 min-h-[220px] p-6 sm:p-10 flex flex-col justify-end shadow-frame">
        {/* Background photo band */}
        <div
          className="absolute inset-0 bg-cover bg-[center_35%] filter saturate-[0.85] opacity-50"
          style={{ backgroundImage: "url('/dawn-ridge.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 to-ink-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="lc-eyebrow mb-2">
              {isHost ? 'Host Command Center' : 'Your Competitive Space'}
            </div>
            <h1 className="font-serif font-normal text-4xl sm:text-6xl text-cream-50 leading-[0.98]">
              Welcome back,<br />
              <em className="italic text-peach-200">
                {user?.name?.split(' ')[0] || 'Champion'}.
              </em>
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-cream-200/80 max-w-lg">
              {isHost
                ? 'Oversee submissions, verify LeetCode activity, and steward cohort standings.'
                : 'Log canonical solves, track approval reviews, and climb the standings.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/leaderboard"
              className="lc-btn-secondary py-2.5 px-4 text-xs"
            >
              Leaderboard
            </Link>

            {isParticipant && activeChallenge && (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="lc-btn-primary py-2.5 px-4 text-xs group"
              >
                <PlusCircle className="w-4 h-4 text-ink-950" />
                <span>Submit problem</span>
              </button>
            )}

            {isHost && (
              <Link
                to="/host/review"
                className="lc-btn-primary py-2.5 px-4 text-xs flex items-center gap-2"
              >
                <span>Review queue</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {isLoadingData ? (
        <div className="flex min-h-[260px] items-center justify-center rounded border border-cream-100/10 bg-ink-900/50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-peach-300" />
            <span className="text-[10px] uppercase tracking-[0.24em] text-ink-400">
              Loading workspace...
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Active Challenge Status */}
          <JoinChallengeCard
            activeChallenge={activeChallenge}
            onChallengeJoined={handleChallengeJoined}
          />

          {/* Participant Stat Numerals (Serif Display) */}
          {isParticipant && (
            <div className="grid grid-cols-1 sm:grid-cols-3 border border-cream-100/10 rounded overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-cream-100/10 bg-ink-900/60">
              <div className="p-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-500">
                  Submitted Solves
                </div>
                <div className="font-serif text-4xl sm:text-5xl text-cream-50 mt-1 leading-tight">
                  {submissions.length}
                </div>
              </div>

              <div className="p-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-500">
                  Pending Review
                </div>
                <div className="font-serif text-4xl sm:text-5xl text-medium mt-1 leading-tight">
                  {pendingCount}
                </div>
              </div>

              <div className="p-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-500">
                  Approved &amp; Verified
                </div>
                <div className="font-serif text-4xl sm:text-5xl text-easy mt-1 leading-tight">
                  {approvedCount}
                </div>
              </div>
            </div>
          )}

          {/* Submissions List */}
          {isParticipant && activeChallenge && (
            <SubmissionsList
              submissions={submissions}
              onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
            />
          )}

          {/* Host Challenge Management Grid */}
          {isHost && (
            <section className="lc-card overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-cream-100/10">
                <div>
                  <div className="lc-eyebrow mb-1">Management</div>
                  <h2 className="font-serif text-2xl text-cream-50 font-normal">
                    Your challenges
                  </h2>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Configure and govern your cohort programming events.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateChallengeModalOpen(true)}
                  className="lc-btn-primary py-2.5 px-4 text-xs"
                >
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Create challenge
                </button>
              </div>

              <div className="p-6">
                {challenges.length === 0 ? (
                  <div className="rounded border border-dashed border-cream-100/15 p-12 text-center">
                    <p className="font-serif italic text-lg text-cream-200">
                      No challenges provisioned yet
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      Create your first cohort challenge to distribute join codes.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {challenges.map((c) => (
                      <div
                        key={c._id}
                        className="lc-card lc-card-lift p-5 space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-serif text-2xl text-cream-50 font-normal truncate">
                              {c.title}
                            </h3>
                            <p className="mt-1 text-xs text-ink-400 line-clamp-2 leading-relaxed">
                              {c.description || 'No description provided.'}
                            </p>
                          </div>
                          <span className="lc-badge lc-badge-approved shrink-0">
                            {c.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-cream-100/10 text-xs">
                          <span className="text-[10px] uppercase tracking-[0.24em] text-ink-500">
                            Join Code
                          </span>
                          <span className="font-mono text-base tracking-[0.2em] text-peach-300 font-semibold">
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

          {/* Account Profile Card */}
          <section className="lc-card p-6">
            <div className="mb-4">
              <div className="lc-eyebrow mb-1">Account credentials</div>
              <h2 className="font-serif text-xl text-cream-50 font-normal">Profile Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-cream-100/10 text-xs">
              <div>
                <span className="text-[10px] tracking-[0.2em] uppercase text-ink-500 block mb-1">
                  Email
                </span>
                <span className="text-cream-100 font-mono text-[12px] break-all">
                  {user?.email}
                </span>
              </div>

              <div>
                <span className="text-[10px] tracking-[0.2em] uppercase text-ink-500 block mb-1">
                  Role
                </span>
                <span className="lc-badge lc-badge-role capitalize">
                  {user?.role}
                </span>
              </div>

              <div>
                <span className="text-[10px] tracking-[0.2em] uppercase text-ink-500 block mb-1">
                  LeetCode Handle
                </span>
                {user?.leetcodeUsername ? (
                  <a
                    href={`https://leetcode.com/u/${user.leetcodeUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-peach-300 hover:text-cream-50 font-mono text-xs transition-colors"
                  >
                    <span>@{user.leetcodeUsername}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-ink-500 italic">Not specified</span>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Submission Modal */}
      {activeChallenge && (
        <SubmissionModal
          challenge={activeChallenge}
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSubmissionCreated={handleSubmissionCreated}
        />
      )}

      {/* Create Challenge Modal for Hosts */}
      {isHost && isCreateChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="lc-card w-full max-w-lg p-6 sm:p-8 space-y-5 border border-cream-100/15 shadow-frame bg-ink-900">
            <div className="flex items-start justify-between gap-3 border-b border-cream-100/10 pb-4">
              <div>
                <div className="lc-eyebrow mb-1">Host Provisioning</div>
                <h3 className="font-serif text-2xl text-cream-50 font-normal">Create Challenge</h3>
                <p className="text-xs text-ink-400 mt-0.5">Define dates and join code for the cohort.</p>
              </div>
              <button
                onClick={() => setIsCreateChallengeModalOpen(false)}
                className="text-ink-400 hover:text-cream-50 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createChallengeError && (
              <div className="p-3 rounded-sm border border-hard/40 bg-hard/10 text-xs text-hard">
                {createChallengeError}
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div>
                <label className="lc-label">Title *</label>
                <input
                  type="text"
                  value={newChallengeForm.title}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, title: e.target.value })
                  }
                  placeholder="e.g. Winter 2026 Sprint"
                  required
                  className="lc-input"
                />
              </div>

              <div>
                <label className="lc-label">Description</label>
                <textarea
                  value={newChallengeForm.description}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, description: e.target.value })
                  }
                  placeholder="Goals, target problem patterns, expectations..."
                  rows="2"
                  className="lc-input resize-none"
                />
              </div>

              <div>
                <label className="lc-label">Join Code *</label>
                <input
                  type="text"
                  value={newChallengeForm.joinCode}
                  onChange={(e) =>
                    setNewChallengeForm({
                      ...newChallengeForm,
                      joinCode: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="SPRINT26"
                  required
                  className="lc-input font-mono uppercase text-peach-300 tracking-[0.2em]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="lc-label">Start Date *</label>
                  <input
                    type="date"
                    value={newChallengeForm.startDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, startDate: e.target.value })
                    }
                    required
                    className="lc-input font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="lc-label">End Date *</label>
                  <input
                    type="date"
                    value={newChallengeForm.endDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, endDate: e.target.value })
                    }
                    required
                    className="lc-input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream-100/10">
                <button
                  type="button"
                  onClick={() => setIsCreateChallengeModalOpen(false)}
                  className="lc-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createChallengeLoading}
                  className="lc-btn-primary px-5 py-2 text-xs"
                >
                  {createChallengeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Creating...
                    </>
                  ) : (
                    'Create cohort challenge'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
