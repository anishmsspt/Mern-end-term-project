import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyChallenges, getMySubmissions, createChallenge } from '../../services/api';
import JoinChallengeCard from '../../components/challenges/JoinChallengeCard';
import SubmissionModal from '../../components/submissions/SubmissionModal';
import SubmissionsList from '../../components/submissions/SubmissionsList';
import {
  User,
  Shield,
  Code2,
  Mail,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Layers,
  PlusCircle,
  Clock,
  Trophy,
  Loader2,
  Sparkles,
} from 'lucide-react';

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

  // Load challenges and user submissions
  const loadDashboardData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Fetch user challenges
      const challengeRes = await getMyChallenges(token);
      const userChallenges = challengeRes.challenges || [];
      setChallenges(userChallenges);

      const currentActive = userChallenges.find((c) => c.status === 'active') || userChallenges[0] || null;
      setActiveChallenge(currentActive);

      // 2. If participant has an active challenge, fetch their submissions
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

  // Derive points authoritatively from approved submissions
  const approvedSubmissions = submissions.filter((s) => s.status === 'Approved');
  const totalApprovedPoints = approvedSubmissions.reduce(
    (sum, s) => sum + (s.pointsAwarded || 0),
    0
  );
  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'Pending').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome & Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-mono font-semibold border ${
                  isHost
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                }`}
              >
                {isHost ? 'Host Privileges Active' : 'Participant Role Active'}
              </span>
              <span className="text-xs text-slate-500 font-mono">Phase 3 Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-brand-400">{user?.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              {isHost
                ? 'Manage challenges, curate weekly sets, inspect daily reports in the review queue, and award verified points.'
                : 'Report your solved LeetCode problems, monitor host review status, and climb the cohort leaderboard.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link
              to="/leaderboard"
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs transition flex items-center space-x-2 border border-amber-500/30"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>View Leaderboard</span>
            </Link>

            {isParticipant && activeChallenge && (
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="py-2.5 px-5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs transition flex items-center space-x-2 shadow-lg shadow-emerald-950/40"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit Daily Problem</span>
              </button>
            )}

            {isHost && (
              <Link
                to="/host/review"
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center space-x-2 shadow-lg shadow-indigo-950/40"
              >
                <Clock className="w-4 h-4" />
                <span>Review Queue</span>
              </Link>
            )}

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-1 text-slate-400">
              <div className="text-slate-500">AUTHENTICATED USER</div>
              <div className="text-slate-200 truncate max-w-[180px]">{user?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingData ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading challenge workspace and submissions...</p>
        </div>
      ) : (
        <>
          {/* Challenge Membership Card */}
          <section>
            <JoinChallengeCard
              activeChallenge={activeChallenge}
              onChallengeJoined={handleChallengeJoined}
            />
          </section>

          {/* Participant Submissions Workflow */}
          {isParticipant && activeChallenge && (
            <section className="space-y-4">
              <SubmissionsList
                submissions={submissions}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
              />
            </section>
          )}

          {/* Host Challenge Management Summary */}
          {isHost && (
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Active Challenges Managed</h2>
                    <p className="text-xs text-slate-400">Create cohorts and share join codes with participants</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateChallengeModalOpen(true)}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 self-start sm:self-auto shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Challenge</span>
                </button>
              </div>

              {challenges.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No challenges created yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {challenges.map((c) => (
                    <div
                      key={c._id}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                          {c.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs font-mono">
                        <span className="text-slate-400">Join Code:</span>
                        <strong className="text-brand-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {c.joinCode}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Profile Details & Metadata */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Profile Details</h2>
                  <p className="text-xs text-slate-400">Verified Member</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Email</span>
                  </span>
                  <span className="font-mono text-slate-200">{user?.email}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Role</span>
                  </span>
                  <span className="font-mono text-slate-200 uppercase font-semibold">
                    {user?.role}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <Code2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>LeetCode</span>
                  </span>
                  {user?.leetcodeUsername ? (
                    <a
                      href={`https://leetcode.com/u/${user.leetcodeUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                    >
                      <span>{user.leetcodeUsername}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">Not set</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics & Phase 4 Preparation */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 md:col-span-2">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Challenge Activity Summary</h2>
                  <p className="text-xs text-slate-400">Current cohort status</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="text-slate-400">Total Solves Submitted</div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {isParticipant ? submissions.length : '—'}
                  </div>
                  <p className="text-[10px] text-slate-500">Activity logged</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="text-slate-400">Pending Review</div>
                  <div className="text-2xl font-bold font-mono text-amber-400">
                    {isParticipant ? submissions.filter((s) => s.status === 'Pending').length : '—'}
                  </div>
                  <p className="text-[10px] text-slate-500">Awaiting Host action</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="text-slate-400">Approved Problems</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {isParticipant ? submissions.filter((s) => s.status === 'Approved').length : '—'}
                  </div>
                  <p className="text-[10px] text-slate-500">Official solves credited</p>
                </div>
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

      {/* Host Create Challenge Modal */}
      {isHost && isCreateChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Create New Challenge</h3>
              </div>
              <button
                onClick={() => setIsCreateChallengeModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ ESC
              </button>
            </div>

            {createChallengeError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
                {createChallengeError}
              </div>
            )}

            <form onSubmit={handleCreateChallenge} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Challenge Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter 2026 30-Day LeetCode Sprint"
                  value={newChallengeForm.title}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, title: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Goals, target problem count, rules..."
                  value={newChallengeForm.description}
                  onChange={(e) =>
                    setNewChallengeForm({ ...newChallengeForm, description: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Custom Join Code (Optional, uppercase auto-formatted)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CODECAMP26 (Leave blank for random 8-character code)"
                  value={newChallengeForm.joinCode}
                  onChange={(e) =>
                    setNewChallengeForm({
                      ...newChallengeForm,
                      joinCode: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newChallengeForm.startDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, startDate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newChallengeForm.endDate}
                    onChange={(e) =>
                      setNewChallengeForm({ ...newChallengeForm, endDate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateChallengeModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createChallengeLoading}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center space-x-2"
                >
                  {createChallengeLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{createChallengeLoading ? 'Creating...' : 'Create Challenge'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
