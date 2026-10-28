import React, { useState } from 'react';
import { submitProblem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Code2,
  Calendar,
  Layers,
  FileText,
  Link2,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SubmissionModal({ challenge, isOpen, onClose, onSubmissionCreated }) {
  const { token } = useAuth();

  // Format local date YYYY-MM-DD avoiding UTC shift
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Submit Daily LeetCode Solve</h2>
              <p className="text-xs text-slate-400">Challenge: {challenge?.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 flex items-start space-x-3 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-3 flex items-start space-x-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Problem Title */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Problem Title *</label>
            <input
              type="text"
              name="problemTitle"
              value={formData.problemTitle}
              onChange={handleChange}
              placeholder="e.g. 1. Two Sum"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>

          {/* LeetCode URL */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">LeetCode Problem URL *</label>
            <div className="relative">
              <Link2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="url"
                name="problemUrl"
                value={formData.problemUrl}
                onChange={handleChange}
                placeholder="https://leetcode.com/problems/two-sum/"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              The backend parses and canonicalizes the problem slug to prevent duplicate solve exploits.
            </p>
          </div>

          {/* Difficulty & Completion Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              >
                <option value="Easy">Easy (1 pt standard)</option>
                <option value="Medium">Medium (3 pts standard)</option>
                <option value="Hard">Hard (5 pts standard)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-slate-300">Completion Date *</label>
              <input
                type="date"
                name="completionDate"
                value={formData.completionDate}
                min={challengeStartStr || undefined}
                max={todayStr}
                onChange={handleChange}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          {/* Implementation Notes */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Solution Notes / Approach (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. Solved with monotonic stack; O(n) runtime, O(n) space complexity."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition resize-none"
            />
          </div>

          {/* Evidence URL */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Optional Evidence Link</label>
            <input
              type="url"
              name="evidenceUrl"
              value={formData.evidenceUrl}
              onChange={handleChange}
              placeholder="https://gist.github.com/... or submission screenshot"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-2 px-5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <span>Submit Problem</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
