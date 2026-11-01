import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';

function difficultyClass(difficulty) {
  if (difficulty === 'Easy') return 'text-easy';
  if (difficulty === 'Medium') return 'text-medium';
  if (difficulty === 'Hard') return 'text-hard';
  return 'text-ink-400';
}

function StatusCell({ status, pointsAwarded }) {
  if (status === 'Approved') {
    return (
      <span className="lc-badge lc-badge-approved">
        <CheckCircle2 className="w-3 h-3" />
        +{pointsAwarded || 0} pts
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="lc-badge lc-badge-rejected">
        <XCircle className="w-3 h-3" />
        Rejected
      </span>
    );
  }
  return (
    <span className="lc-badge lc-badge-pending">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

export default function SubmissionsList({ submissions, onOpenSubmitModal }) {
  const [filter, setFilter] = useState('All');

  const filtered = submissions.filter((s) => {
    if (filter === 'All') return true;
    return s.status === filter;
  });

  return (
    <div className="lc-card overflow-hidden">
      {/* Header & Tabs */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cream-100/10">
        <div>
          <div className="lc-eyebrow mb-0.5">Activity Record</div>
          <h2 className="font-serif text-2xl text-cream-50 font-normal">
            Your Submissions <span className="font-mono text-sm text-peach-300 ml-1">({submissions.length})</span>
          </h2>
        </div>

        <div className="flex items-center gap-1 border-b border-cream-100/10">
          {['All', 'Pending', 'Approved', 'Rejected'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={filter === statusKey ? 'lc-tab-active' : 'lc-tab-idle'}
            >
              {statusKey}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-14 text-center space-y-3">
          <p className="font-serif italic text-xl text-cream-200">
            {filter === 'All' ? 'No submissions logged yet' : `No ${filter.toLowerCase()} submissions found`}
          </p>
          <p className="text-xs text-ink-500 max-w-sm mx-auto">
            Solve problems on LeetCode and submit your activity links to have points verified.
          </p>
          {onOpenSubmitModal && filter === 'All' && (
            <div className="pt-2">
              <button onClick={onOpenSubmitModal} className="lc-btn-primary text-xs">
                Submit a solve
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-cream-100/10 text-[10px] uppercase tracking-[0.24em] text-ink-500 font-semibold">
                <th className="px-6 py-3.5">Problem</th>
                <th className="px-6 py-3.5">Difficulty</th>
                <th className="px-6 py-3.5">Solved</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100/[0.05]">
              {filtered.map((sub) => (
                <tr key={sub._id} className="hover:bg-cream-100/[0.02] transition-colors">
                  <td className="px-6 py-4 align-top">
                    <a
                      href={sub.problemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-cream-100 hover:text-peach-200 transition-colors"
                    >
                      {sub.problemTitle}
                      <ExternalLink className="w-3 h-3 text-ink-500" />
                    </a>
                    <div className="text-[11px] font-mono text-ink-500 mt-0.5">{sub.problemSlug}</div>
                    {sub.notes && (
                      <p className="font-serif italic text-xs text-cream-300 mt-1 line-clamp-2">
                        “{sub.notes}”
                      </p>
                    )}
                    {sub.reviewNotes && sub.status === 'Approved' && (
                      <p className="text-[11px] text-pine-300 mt-1">
                        Host note: {sub.reviewNotes}
                      </p>
                    )}
                    {sub.reviewNotes && sub.status === 'Rejected' && (
                      <p className="text-[11px] text-hard/90 mt-1">
                        Rejection reason: {sub.reviewNotes}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top font-semibold text-xs">
                    <span className={difficultyClass(sub.difficulty)}>● {sub.difficulty}</span>
                  </td>
                  <td className="px-6 py-4 align-top font-mono text-xs text-ink-400">
                    {sub.completionDate ? new Date(sub.completionDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 align-top text-right">
                    <StatusCell status={sub.status} pointsAwarded={sub.pointsAwarded} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
