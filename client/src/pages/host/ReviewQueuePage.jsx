import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getReviewQueue, reviewSubmission, getMyChallenges } from '../../services/api';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
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
        setErrorMsg('Points cannot exceed 100 per single problem.');
        return;
      }
    }

    if (mode === 'reject' && (!reviewNotes || !reviewNotes.trim())) {
      setErrorMsg('A rejection reason is mandatory so participants understand why.');
      return;
    }

    setActionLoadingId(submissionId);
    try {
      const res = await reviewSubmission(
        submissionId,
        {
          action: mode === 'approve' ? 'approve' : 'reject',
          pointsAwarded: mode === 'approve' ? parseInt(pointsAwarded, 10) : 0,
          reviewNotes: reviewNotes.trim(),
        },
        token
      );

      setFeedbackMsg(res.message || `Submission marked as ${mode}d.`);
      setActiveDialog(null);
      fetchQueueData();
    } catch (err) {
      setErrorMsg(err.message || 'Error executing review action.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="lc-page space-y-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-cream-100/10 pb-6">
        <div>
          <div className="lc-eyebrow mb-1">Host Oversight</div>
          <h1 className="font-serif text-4xl sm:text-5xl text-cream-50 font-normal">
            Review queue
          </h1>
          <p className="text-xs text-ink-400 mt-1">
            Verify participant problem solutions, check evidence, and allocate points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {challenges.length > 0 && (
            <select
              value={selectedChallengeId}
              onChange={(e) => {
                setSelectedChallengeId(e.target.value);
                setPage(1);
              }}
              className="lc-input py-1.5 px-3 w-auto text-xs"
            >
              <option value="">All Challenges</option>
              {challenges.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center border-b border-cream-100/10">
            {['Pending', 'Approved', 'Rejected', 'All'].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setSelectedStatus(st);
                  setPage(1);
                }}
                className={selectedStatus === st ? 'lc-tab-active' : 'lc-tab-idle'}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchQueueData()}
            disabled={isLoading}
            className="lc-btn-ghost p-2"
            title="Refresh queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-peach-300' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-sm border border-easy/40 bg-easy/10 flex items-start gap-2.5 text-xs text-easy">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-sm border border-hard/40 bg-hard/10 flex items-start gap-2.5 text-xs text-hard">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Review Queue Items */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-xs text-ink-400">
          <Loader2 className="w-6 h-6 animate-spin text-peach-300" />
          <span className="tracking-[0.24em] uppercase text-[10px]">Retrieving queue items...</span>
        </div>
      ) : submissions.length === 0 ? (
        <div className="lc-card p-14 text-center space-y-2">
          <p className="font-serif italic text-2xl text-peach-200">Queue is clear</p>
          <p className="text-xs text-ink-500">
            No {selectedStatus.toLowerCase()} submissions found for the selected challenge.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {submissions.map((sub) => {
            const isProcessing = actionLoadingId === sub._id;
            return (
              <div
                key={sub._id}
                className="lc-card lc-card-lift p-6 flex flex-col md:flex-row md:items-start justify-between gap-6"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-serif text-2xl text-cream-50 font-normal">
                      {sub.problemTitle}
                    </h3>
                    <span
                      className={`lc-badge ${
                        sub.difficulty === 'Easy'
                          ? 'lc-badge-approved'
                          : sub.difficulty === 'Medium'
                          ? 'lc-badge-pending'
                          : 'lc-badge-rejected'
                      }`}
                    >
                      ● {sub.difficulty}
                    </span>
                    <span className="lc-badge lc-badge-role text-[9px]">
                      {sub.challenge?.title || 'Challenge'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-400">
                    <span className="text-cream-200 font-sans font-medium">
                      {sub.participant?.name || 'Participant'}
                    </span>
                    {sub.participant?.leetcodeUsername && (
                      <span className="text-peach-300">
                        @{sub.participant.leetcodeUsername}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-ink-500" />
                      {new Date(sub.completionDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center gap-4 text-xs">
                    <a
                      href={sub.problemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-peach-300 hover:text-cream-50 font-mono transition-colors"
                    >
                      <span>Canonical LeetCode problem</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    {sub.evidenceUrl && (
                      <a
                        href={sub.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-ink-400 hover:text-cream-50 font-mono transition-colors"
                      >
                        <span>Evidence screenshot link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {sub.notes && (
                    <div className="pt-2">
                      <p className="font-serif italic text-sm text-cream-200 leading-relaxed bg-ink-950/40 p-3 rounded-sm border border-cream-100/5">
                        “{sub.notes}”
                      </p>
                    </div>
                  )}

                  {sub.reviewNotes && (
                    <div className="pt-1 text-xs">
                      <span className="text-ink-500 uppercase tracking-wider text-[10px] block">
                        Host review record:
                      </span>
                      <p className="text-cream-100 font-sans mt-0.5">{sub.reviewNotes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex md:flex-col items-center md:items-end gap-2.5 shrink-0 pt-2 md:pt-0">
                  {sub.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleOpenApprove(sub)}
                        disabled={isProcessing}
                        className="lc-btn-success text-xs px-4 py-2 w-full md:w-auto"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleOpenReject(sub)}
                        disabled={isProcessing}
                        className="lc-btn-danger text-xs px-4 py-2 w-full md:w-auto"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <div className="text-right">
                      <span
                        className={`lc-badge ${
                          sub.status === 'Approved'
                            ? 'lc-badge-approved'
                            : 'lc-badge-rejected'
                        }`}
                      >
                        {sub.status === 'Approved' ? `Approved (+${sub.pointsAwarded} pts)` : 'Rejected'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-cream-100/10 text-xs">
              <span className="text-ink-400">
                Page <span className="font-mono text-cream-100">{page}</span> of <span className="font-mono text-cream-100">{totalPages}</span> ({totalSubmissions} total)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="lc-btn-secondary px-3 py-1.5 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="lc-btn-secondary px-3 py-1.5 text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Confirmation Sheet / Dialog */}
      {activeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm">
          <div className="lc-card w-full max-w-md p-6 sm:p-8 space-y-5 border border-cream-100/15 shadow-frame bg-ink-900">
            <div className="flex items-start justify-between gap-3 border-b border-cream-100/10 pb-4">
              <div>
                <div className="lc-eyebrow mb-1">
                  {activeDialog.mode === 'approve' ? 'Verification' : 'Audit Action'}
                </div>
                <h3 className="font-serif text-2xl text-cream-50 font-normal">
                  {activeDialog.mode === 'approve' ? 'Approve solve' : 'Reject solve'}
                </h3>
                <p className="text-xs text-ink-400 mt-0.5">
                  {activeDialog.problemTitle} · {activeDialog.participantName}
                </p>
              </div>
              <button
                onClick={() => setActiveDialog(null)}
                className="text-ink-400 hover:text-cream-50 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-4">
              {activeDialog.mode === 'approve' && (
                <div>
                  <label className="lc-label">Points to award (1–100) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={activeDialog.pointsAwarded}
                    onChange={(e) =>
                      setActiveDialog({ ...activeDialog, pointsAwarded: e.target.value })
                    }
                    required
                    className="lc-input font-mono text-base text-peach-300"
                  />
                  <p className="text-[11px] text-ink-500 mt-1">
                    Standard guideline: 1 pt for Easy, 3 pts for Medium, 5 pts for Hard.
                  </p>
                </div>
              )}

              <div>
                <label className="lc-label">
                  Review note / feedback {activeDialog.mode === 'reject' ? '*' : '(optional)'}
                </label>
                <textarea
                  value={activeDialog.reviewNotes}
                  onChange={(e) =>
                    setActiveDialog({ ...activeDialog, reviewNotes: e.target.value })
                  }
                  required={activeDialog.mode === 'reject'}
                  placeholder={
                    activeDialog.mode === 'reject'
                      ? 'Explain why (e.g., incorrect problem link, missing code verification)...'
                      : 'Verified code approach on LeetCode...'
                  }
                  rows="3"
                  className="lc-input resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream-100/10">
                <button
                  type="button"
                  onClick={() => setActiveDialog(null)}
                  className="lc-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className={
                    activeDialog.mode === 'approve'
                      ? 'lc-btn-success px-5 py-2 text-xs'
                      : 'lc-btn-danger px-5 py-2 text-xs'
                  }
                >
                  {actionLoadingId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : activeDialog.mode === 'approve' ? (
                    'Confirm approval'
                  ) : (
                    'Confirm rejection'
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
