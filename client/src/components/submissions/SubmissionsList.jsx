import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Code2,
  Calendar,
  AlertTriangle,
  FileText,
  Filter,
} from 'lucide-react';

export default function SubmissionsList({ submissions, onOpenSubmitModal }) {
  const [filter, setFilter] = useState('All');

  const filtered = submissions.filter((s) => {
    if (filter === 'All') return true;
    return s.status === filter;
  });

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Code2 className="w-5 h-5 text-brand-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Your Submission History</h2>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {submissions.length} total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status updates and review feedback from your Challenge Host
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs self-start sm:self-auto">
          {['All', 'Pending', 'Approved', 'Rejected'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={`px-3 py-1 rounded-md transition font-medium ${
                filter === statusKey
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {statusKey}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List / Empty State */}
      {filtered.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
            <Code2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              {filter === 'All' ? 'No Submissions Yet' : `No ${filter} Submissions`}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {filter === 'All'
                ? 'Solve a problem on LeetCode and submit your activity report to begin earning challenge points.'
                : `You currently have no problems in '${filter}' status.`}
            </p>
          </div>
          {onOpenSubmitModal && filter === 'All' && (
            <button
              onClick={onOpenSubmitModal}
              className="mt-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-950 font-semibold text-xs transition"
            >
              Submit Your First Problem
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div
              key={sub._id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4.5 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <a
                      href={sub.problemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-white hover:text-brand-400 transition flex items-center space-x-1.5"
                    >
                      <span>{sub.problemTitle}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${getDifficultyBadge(
                        sub.difficulty
                      )}`}
                    >
                      {sub.difficulty}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                    <span className="text-slate-500">slug: {sub.problemSlug}</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>Solved: {new Date(sub.completionDate).toLocaleDateString()}</span>
                    </span>
                    <span>Reported: {new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-start sm:self-auto">
                  {getStatusBadge(sub.status)}
                </div>
              </div>

              {/* Notes excerpt if present */}
              {sub.notes && (
                <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 flex items-start space-x-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{sub.notes}</span>
                </div>
              )}

              {/* Host Feedback for Rejected Submissions */}
              {sub.status === 'Rejected' && sub.rejectionReason && (
                <div className="bg-rose-950/40 border border-rose-900/60 rounded-lg p-3 text-xs text-rose-300 flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-200">Host Review Feedback: </span>
                    <span className="text-rose-300/90">{sub.rejectionReason}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
