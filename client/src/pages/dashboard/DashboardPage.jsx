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
    <div className="lc-page space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">{user?.name}</h1>
          <p className="text-xs text-slate-400">
            {user?.email}
            <span className="ml-2 uppercase tracking-wide text-slate-500">{user?.role}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/leaderboard" className="lc-btn-secondary text-xs">
            Leaderboard
          </Link>
          {isParticipant && activeChallenge && (
            <button onClick={() => setIsSubmitModalOpen(true)} className="lc-btn-primary text-xs">
              <PlusCircle className="w-3.5 h-3.5" />
              Submit problem
            </button>
          )}
          {isHost && (
            <Link to="/host/review" className="lc-btn-secondary text-xs">
              Review queue
            </Link>
          )}
        </div>
      </div>

      {isLoadingData ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
          Loading workspace...
        </div>
      ) : (
        <>
          <JoinChallengeCard
            activeChallenge={activeChallenge}
            onChallengeJoined={handleChallengeJoined}
          />

          {isParticipant && (
            <div className="grid grid-cols-3 gap-2">
              <div className="lc-card px-3 py-2.5">
                <div className="text-[11px] text-slate-500">Submitted</div>
                <div className="text-lg font-semibold font-mono text-white">{submissions.length}</div>
              </div>
              <div className="lc-card px-3 py-2.5">
                <div className="text-[11px] text-slate-500">Pending</div>
                <div className="text-lg font-semibold font-mono text-medium">{pendingCount}</div>
              </div>
              <div className="lc-card px-3 py-2.5">
                <div className="text-[11px] text-slate-500">Approved</div>
                <div className="text-lg font-semibold font-mono text-easy">{approvedCount}</div>
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
            <section className="lc-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Challenges</h2>
                <button
                  onClick={() => setIsCreateChallengeModalOpen(true)}
                  className="lc-btn-primary text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create
                </button>
              </div>

              {challenges.length === 0 ? (
                <p className="text-xs text-slate-400">No challenges created yet.</p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {challenges.map((c) => (
                    <div key={c._id} className="py-2.5 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm text-white">{c.title}</h3>
                          <span className="lc-badge bg-easy/10 text-easy uppercase">{c.status}</span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{c.description}</p>
                      </div>
                      <span className="text-xs font-mono text-brand-500 shrink-0">{c.joinCode}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="lc-card p-4 text-xs">
            <h2 className="text-sm font-semibold text-white mb-3">Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-slate-500">Email</div>
                <div className="font-mono text-slate-200 mt-0.5">{user?.email}</div>
              </div>
              <div>
                <div className="text-slate-500">Role</div>
                <div className="uppercase text-slate-200 mt-0.5">{user?.role}</div>
              </div>
              <div>
                <div className="text-slate-500">LeetCode</div>
                {user?.leetcodeUsername ? (
                  <a
                    href={`https://leetcode.com/u/${user.leetcodeUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-brand-500 hover:text-brand-400 mt-0.5"
                  >
                    {user.leetcodeUsername}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-500 italic mt-0.5 block">Not set</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="lc-card max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Create challenge</h3>
              <button
                onClick={() => setIsCreateChallengeModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            {createChallengeError && (
              <div className="p-2.5 rounded-md bg-hard/10 border border-hard/30 text-xs text-hard">
                {createChallengeError}
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-3 text-sm">
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
                  rows="2"
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateChallengeModalOpen(false)}
                  className="lc-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={createChallengeLoading} className="lc-btn-primary text-xs">
                  {createChallengeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {createChallengeLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
