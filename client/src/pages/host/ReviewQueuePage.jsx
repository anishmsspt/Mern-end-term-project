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

  const difficultyClass = (difficulty) => {
    if (difficulty === 'Easy') return 'text-easy';
    if (difficulty === 'Medium') return 'text-medium';
    if (difficulty === 'Hard') return 'text-hard';
    return 'text-slate-400';
  };

  return (
    <div className="lc-page space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Review queue</h1>
          <p className="text-xs text-slate-400">Verify solves and award points.</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-500 uppercase">Queue</div>
          <div className="font-mono text-sm text-brand-500">
            {totalSubmissions} {selectedStatus === 'All' ? 'total' : selectedStatus.toLowerCase()}
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="lc-card border-easy/30 p-3 flex items-start gap-2 text-xs text-easy">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="lc-card border-hard/30 p-3 flex items-start gap-2 text-xs text-hard">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-md border border-slate-800">
          {['Pending', 'Approved', 'Rejected', 'All'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => {
                setSelectedStatus(statusKey);
                setPage(1);
              }}
              className={selectedStatus === statusKey ? 'lc-tab-active' : 'lc-tab-idle'}
            >
              {statusKey}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {challenges.length > 1 && (
            <select
              value={selectedChallengeId}
              onChange={(e) => {
                setSelectedChallengeId(e.target.value);
                setPage(1);
              }}
              className="lc-input py-1.5 w-auto text-xs"
            >
              <option value="">All challenges</option>
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
            className="lc-btn-secondary text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
          Loading queue...
        </div>
      ) : submissions.length === 0 ? (
        <div className="lc-card p-10 text-center space-y-1">
          <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">
            {selectedStatus === 'Pending' ? 'Queue is clear' : `No ${selectedStatus.toLowerCase()} submissions`}
          </h3>
          <p className="text-xs text-slate-400">
            {selectedStatus === 'Pending'
              ? 'All submitted solves have been reviewed.'
              : `Nothing matches status “${selectedStatus}”.`}
          </p>
        </div>
      ) : (
        <div className="lc-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2 font-medium">Participant</th>
                  <th className="px-4 py-2 font-medium">Problem</th>
                  <th className="px-4 py-2 font-medium">Diff</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {submissions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-850/80 align-top">
                    <td className="px-4 py-2.5">
                      <div className="text-slate-100">{sub.participant?.name || 'Unknown'}</div>
                      <div className="text-[11px] font-mono text-slate-500">{sub.participant?.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <a
                        href={sub.problemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-100 hover:text-brand-400"
                      >
                        {sub.problemTitle}
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                      <div className="text-[11px] font-mono text-slate-500">{sub.problemSlug}</div>
                      {(sub.notes || sub.evidenceUrl) && (
                        <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                          {sub.notes && <p className="line-clamp-2">{sub.notes}</p>}
                          {sub.evidenceUrl && (
                            <a
                              href={sub.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-500 hover:underline font-mono"
                            >
                              Evidence
                            </a>
                          )}
                        </div>
                      )}
                      {sub.reviewNotes && (
                        <p className={`mt-1 text-xs ${sub.status === 'Approved' ? 'text-easy' : 'text-hard'}`}>
                          {sub.reviewNotes}
                        </p>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${difficultyClass(sub.difficulty)}`}>
                      {sub.difficulty}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(sub.completionDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {sub.status === 'Pending' && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenApprove(sub)}
                            disabled={actionLoadingId === sub._id}
                            className="lc-btn-success text-xs py-1"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenReject(sub)}
                            disabled={actionLoadingId === sub._id}
                            className="lc-btn-danger text-xs py-1"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {sub.status === 'Approved' && (
                        <span className="text-xs text-easy">+{sub.pointsAwarded} pts</span>
                      )}
                      {sub.status === 'Rejected' && (
                        <span className="inline-flex items-center gap-1 text-xs text-hard">
                          <XCircle className="w-3.5 h-3.5" />
                          Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="lc-btn-secondary text-xs py-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="lc-btn-secondary text-xs py-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="lc-card w-full max-w-md p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {activeDialog.mode === 'approve' ? 'Approve submission' : 'Reject submission'}
              </h3>
              <p className="text-xs text-slate-400 truncate">{activeDialog.problemTitle}</p>
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-3 text-sm">
              {activeDialog.mode === 'approve' ? (
                <>
                  <div>
                    <label className="lc-label">Points (1–100) *</label>
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
                      className="lc-input font-mono text-easy"
                    />
                  </div>
                  <div>
                    <label className="lc-label">Notes (optional)</label>
                    <textarea
                      rows={2}
                      value={activeDialog.reviewNotes}
                      onChange={(e) =>
                        setActiveDialog((prev) => ({ ...prev, reviewNotes: e.target.value }))
                      }
                      placeholder="Verified on LeetCode."
                      className="lc-input resize-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="lc-label">Rejection reason *</label>
                  <textarea
                    rows={3}
                    value={activeDialog.reviewNotes}
                    onChange={(e) =>
                      setActiveDialog((prev) => ({ ...prev, reviewNotes: e.target.value }))
                    }
                    placeholder="Explain why this submission was rejected."
                    required
                    className="lc-input resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setActiveDialog(null)} className="lc-btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoadingId !== null}
                  className={activeDialog.mode === 'approve' ? 'lc-btn-success text-xs' : 'lc-btn-danger text-xs'}
                >
                  {activeDialog.mode === 'approve'
                    ? `Award ${activeDialog.pointsAwarded || ''} pts`
                    : 'Confirm reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
