import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getReviewQueue, reviewSubmission, getMyChallenges } from '../../services/api';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Code2,
  Calendar,
  User,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Trophy,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

export default function ReviewQueuePage() {
  const { token } = useAuth();

  const [submissions, setSubmissions] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Active dialog state: { submissionId, mode: 'approve' | 'reject', points: 10, reason: '' }
  const [activeDialog, setActiveDialog] = useState(null);

  const fetchQueueData = async (resetPage = false) => {
    setIsLoading(true);
    setErrorMsg('');
    const targetPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    try {
      const res = await getReviewQueue(
        {
          status: selectedStatus,
          challengeId: selectedChallengeId || undefined,
          page: targetPage,
          limit: 10,
        },
        token
      );

      setSubmissions(res.submissions || []);
      setTotalPages(res.totalPages || 1);
      setTotalSubmissions(res.total || 0);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load review queue.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load Host challenges for filter
  useEffect(() => {
    async function loadChallenges() {
      try {
        const res = await getMyChallenges(token);
        setChallenges(res.challenges || []);
      } catch (err) {
        console.error('Error fetching host challenges:', err);
      }
    }
    if (token) loadChallenges();
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchQueueData();
    }
  }, [token, selectedStatus, selectedChallengeId, page]);

  const handleOpenApprove = (sub) => {
    // Default points based on difficulty if known
    let defaultPts = 3;
    if (sub.difficulty === 'Easy') defaultPts = 1;
    if (sub.difficulty === 'Medium') defaultPts = 3;
    if (sub.difficulty === 'Hard') defaultPts = 5;

    setActiveDialog({
      submissionId: sub._id,
      problemTitle: sub.problemTitle,
      participantName: sub.participant?.name || 'Participant',
      mode: 'approve',
      pointsAwarded: defaultPts,
      reviewNotes: 'Verified solution on LeetCode.',
    });
  };

  const handleOpenReject = (sub) => {
    setActiveDialog({
      submissionId: sub._id,
      problemTitle: sub.problemTitle,
      participantName: sub.participant?.name || 'Participant',
      mode: 'reject',
      pointsAwarded: 0,
      reviewNotes: '',
    });
  };

  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!activeDialog) return;

    setErrorMsg('');
    setFeedbackMsg('');

    const { submissionId, mode, pointsAwarded, reviewNotes } = activeDialog;

    if (mode === 'approve') {
      const pts = parseInt(pointsAwarded, 10);
      if (isNaN(pts) || pts <= 0) {
        setErrorMsg('Please specify a positive integer point value (points > 0).');
        return;
      }
      if (pts > 100) {
        setErrorMsg('Points cannot exceed 100 per submission.');
        return;
      }
    }

    if (mode === 'reject') {
      if (!reviewNotes || !reviewNotes.trim()) {
        setErrorMsg('A rejection reason is mandatory so the participant understands how to correct it.');
        return;
      }
    }

    setActionLoadingId(submissionId);
    try {
      const res = await reviewSubmission(
        submissionId,
        {
          decision: mode,
          pointsAwarded: mode === 'approve' ? parseInt(pointsAwarded, 10) : 0,
          reviewNotes: reviewNotes.trim(),
        },
        token
      );

      setFeedbackMsg(res.message || 'Review recorded successfully.');
      setActiveDialog(null);
      fetchQueueData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit review decision.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Host Authorization Active
              </span>
              <span className="text-xs text-slate-500 font-mono">Phase 4 Review Workflow</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Submission Review Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Inspect participant activity reports, verify LeetCode problem solves, allocate official challenge points, and provide constructive review feedback.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-1 text-slate-400 self-start sm:self-auto">
            <div className="text-slate-500">QUEUE METRIC</div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {totalSubmissions} {selectedStatus === 'All' ? 'Total' : selectedStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {feedbackMsg && (
        <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-4 flex items-start space-x-3 text-xs text-emerald-300 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-emerald-200">Review Confirmed</div>
            <div>{feedbackMsg}</div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-4 flex items-start space-x-3 text-xs text-rose-300 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-rose-200">Action Blocked</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {['Pending', 'Approved', 'Rejected', 'All'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => {
                setSelectedStatus(statusKey);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition font-medium ${
                selectedStatus === statusKey
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {statusKey}
            </button>
          ))}
        </div>

        {/* Challenge Filter & Refresh */}
        <div className="flex items-center space-x-3 text-xs">
          {challenges.length > 1 && (
            <select
              value={selectedChallengeId}
              onChange={(e) => {
                setSelectedChallengeId(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="">All Managed Challenges</option>
              {challenges.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title} ({c.joinCode})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchQueueData()}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Submissions Queue Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-xs font-mono text-slate-400">Loading submissions from review queue...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            {selectedStatus === 'Pending' ? 'Queue is Clear!' : `No ${selectedStatus} Submissions Found`}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {selectedStatus === 'Pending'
              ? 'All daily problem solves for your managed challenges have been reviewed and scored.'
              : `There are currently no submissions matching status '${selectedStatus}'.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <div
              key={sub._id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Left: Participant & Problem Info */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-brand-400" />
                      <span>{sub.participant?.name || 'Unknown Participant'}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">({sub.participant?.email})</span>
                    {sub.participant?.leetcodeUsername && (
                      <a
                        href={`https://leetcode.com/u/${sub.participant.leetcodeUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-brand-400 hover:text-brand-300 flex items-center space-x-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
                      >
                        <span>LC: @{sub.participant.leetcodeUsername}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    <span className="text-xs text-slate-500 font-mono">• Challenge: {sub.challenge?.title}</span>
                  </div>

                  {/* Problem Title & Canonical Link */}
                  <div className="flex items-center space-x-2">
                    <a
                      href={sub.problemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-bold text-white hover:text-brand-400 transition flex items-center space-x-1.5"
                    >
                      <span>{sub.problemTitle}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${getDifficultyBadge(
                        sub.difficulty
                      )}`}
                    >
                      {sub.difficulty}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                    <span>canonical slug: {sub.problemSlug}</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reported Solved: {new Date(sub.completionDate).toLocaleDateString()}</span>
                    </span>
                    <span>Submitted: {new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right: Current Status Badge & Action Controls */}
                <div className="flex flex-col sm:items-end space-y-2">
                  {sub.status === 'Pending' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenApprove(sub)}
                        disabled={actionLoadingId === sub._id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-950/40"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Solve</span>
                      </button>
                      <button
                        onClick={() => handleOpenReject(sub)}
                        disabled={actionLoadingId === sub._id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border border-rose-900/50 font-medium text-xs transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}

                  {sub.status === 'Approved' && (
                    <div className="text-right">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approved: +{sub.pointsAwarded} pts</span>
                      </span>
                      {sub.reviewedAt && (
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          Reviewed {new Date(sub.reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}

                  {sub.status === 'Rejected' && (
                    <div className="text-right">
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rejected</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes or Evidence if provided */}
              {(sub.notes || sub.evidenceUrl) && (
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs space-y-1.5">
                  {sub.notes && (
                    <div className="flex items-start space-x-2 text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{sub.notes}</span>
                    </div>
                  )}
                  {sub.evidenceUrl && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <ExternalLink className="w-3.5 h-3.5 text-brand-400" />
                      <span>Evidence:</span>
                      <a
                        href={sub.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-400 hover:text-brand-300 underline font-mono truncate"
                      >
                        {sub.evidenceUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Review notes / Rejection Reason display */}
              {sub.reviewNotes && (
                <div
                  className={`p-3 rounded-lg border text-xs leading-relaxed ${
                    sub.status === 'Approved'
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                      : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                  }`}
                >
                  <span className="font-semibold">
                    {sub.status === 'Approved' ? 'Host Review Notes: ' : 'Host Rejection Feedback: '}
                  </span>
                  <span>{sub.reviewNotes}</span>
                </div>
              )}
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 flex items-center space-x-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Confirmation Modal */}
      {activeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  activeDialog.mode === 'approve'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {activeDialog.mode === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {activeDialog.mode === 'approve' ? 'Approve & Allocate Points' : 'Reject Problem Submission'}
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{activeDialog.problemTitle}</p>
              </div>
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-4 text-xs">
              {activeDialog.mode === 'approve' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="font-medium text-slate-300 flex items-center justify-between">
                      <span>Points to Allocate *</span>
                      <span className="text-[10px] text-slate-500">Positive integer (1–100)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={activeDialog.pointsAwarded}
                      onChange={(e) =>
                        setActiveDialog((prev) => ({ ...prev, pointsAwarded: e.target.value }))
                      }
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-slate-300">Approval Feedback / Notes (Optional)</label>
                    <textarea
                      rows={2}
                      value={activeDialog.reviewNotes}
                      onChange={(e) =>
                        setActiveDialog((prev) => ({ ...prev, reviewNotes: e.target.value }))
                      }
                      placeholder="e.g. Clean solution; efficient two-pointer approach."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="font-medium text-slate-300 flex items-center justify-between">
                    <span>Rejection Reason *</span>
                    <span className="text-[10px] text-rose-400">Mandatory</span>
                  </label>
                  <textarea
                    rows={3}
                    value={activeDialog.reviewNotes}
                    onChange={(e) =>
                      setActiveDialog((prev) => ({ ...prev, reviewNotes: e.target.value }))
                    }
                    placeholder="e.g. The problem link does not match the submitted title, or solution was not accepted on LeetCode."
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none"
                  />
                  <p className="text-[10px] text-slate-500">
                    The participant will see this explanation and may correct eligible submissions.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveDialog(null)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className={`py-2 px-5 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 disabled:opacity-50 ${
                    activeDialog.mode === 'approve'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/40'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {activeDialog.mode === 'approve'
                      ? `Confirm & Award ${activeDialog.pointsAwarded || ''} Pts`
                      : 'Confirm Rejection'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
