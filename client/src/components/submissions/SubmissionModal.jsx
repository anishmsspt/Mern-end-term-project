import React, { useState } from 'react';
import { submitProblem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SubmissionModal({ challenge, isOpen, onClose, onSubmissionCreated }) {
  const { token } = useAuth();

  const formatLocalDate = (dateObj) => {
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatLocalDate(new Date());
  const challengeStartStr = challenge?.startDate ? formatLocalDate(challenge.startDate) : '';

  const [formData, setFormData] = useState({
    problemTitle: '',
    problemUrl: '',
    difficulty: 'Easy',
    completionDate: todayStr,
    notes: '',
    evidenceUrl: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.problemTitle.trim() || !formData.problemUrl.trim()) {
      setErrorMsg('Problem title and LeetCode URL are required.');
      return;
    }

    if (!formData.problemUrl.toLowerCase().includes('leetcode.')) {
      setErrorMsg('Problem URL must be a valid LeetCode link (e.g. https://leetcode.com/problems/<slug>/).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await submitProblem(
        {
          challengeId: challenge._id,
          problemTitle: formData.problemTitle.trim(),
          problemUrl: formData.problemUrl.trim(),
          difficulty: formData.difficulty,
          completionDate: formData.completionDate,
          notes: formData.notes.trim(),
          evidenceUrl: formData.evidenceUrl.trim(),
        },
        token
      );

      setSuccessMsg('Submission received! Status is Pending review by Host.');
      setTimeout(() => {
        if (onSubmissionCreated) onSubmissionCreated(res.submission);
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit problem solution.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="lc-card w-full max-w-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Submit a solve</h2>
            <p className="text-xs text-slate-400">{challenge?.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 text-xs text-hard">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 text-xs text-easy">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="lc-label">Problem title *</label>
            <input
              type="text"
              name="problemTitle"
              value={formData.problemTitle}
              onChange={handleChange}
              placeholder="1. Two Sum"
              required
              className="lc-input"
            />
          </div>

          <div>
            <label className="lc-label">LeetCode URL *</label>
            <input
              type="url"
              name="problemUrl"
              value={formData.problemUrl}
              onChange={handleChange}
              placeholder="https://leetcode.com/problems/two-sum/"
              required
              className="lc-input font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="lc-label">Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="lc-input"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="lc-label">Completion date *</label>
              <input
                type="date"
                name="completionDate"
                value={formData.completionDate}
                min={challengeStartStr || undefined}
                max={todayStr}
                onChange={handleChange}
                required
                className="lc-input"
              />
            </div>
          </div>

          <div>
            <label className="lc-label">Notes (optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Approach, complexity..."
              className="lc-input resize-none"
            />
          </div>

          <div>
            <label className="lc-label">Evidence link (optional)</label>
            <input
              type="url"
              name="evidenceUrl"
              value={formData.evidenceUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="lc-input font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="lc-btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="lc-btn-primary text-xs">
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
