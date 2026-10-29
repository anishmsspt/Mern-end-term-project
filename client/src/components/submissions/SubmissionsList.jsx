import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, ExternalLink, AlertTriangle } from 'lucide-react';

function difficultyClass(difficulty) {
  if (difficulty === 'Easy') return 'text-easy';
  if (difficulty === 'Medium') return 'text-medium';
  if (difficulty === 'Hard') return 'text-hard';
  return 'text-slate-400';
}

function StatusCell({ status, pointsAwarded }) {
  if (status === 'Approved') {
    return (
      <span className="inline-flex items-center gap-1 text-easy text-xs">
        <CheckCircle2 className="w-3.5 h-3.5" />
        +{pointsAwarded || 0}
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-hard text-xs">
        <XCircle className="w-3.5 h-3.5" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-medium text-xs">
      <Clock className="w-3.5 h-3.5" />
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
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800">
        <div className="text-sm font-semibold text-white">
          Submissions <span className="text-slate-500 font-normal text-xs">{submissions.length}</span>
        </div>
        <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-md border border-slate-800">
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
        <div className="py-10 text-center space-y-2">
          <p className="text-sm text-slate-300">
            {filter === 'All' ? 'No submissions yet' : `No ${filter.toLowerCase()} submissions`}
          </p>
          {onOpenSubmitModal && filter === 'All' && (
            <button onClick={onOpenSubmitModal} className="lc-btn-primary text-xs">
              Submit a problem
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-800">
              <tr>
                <th className="px-4 py-2 font-medium">Problem</th>
                <th className="px-4 py-2 font-medium">Difficulty</th>
                <th className="px-4 py-2 font-medium">Solved</th>
                <th className="px-4 py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((sub) => (
                <tr key={sub._id} className="hover:bg-slate-850/80">
                  <td className="px-4 py-2.5 align-top">
                    <a
                      href={sub.problemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-100 hover:text-brand-400"
                    >
                      {sub.problemTitle}
                      <ExternalLink className="w-3 h-3 text-slate-500" />
                    </a>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">{sub.problemSlug}</div>
                    {sub.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sub.notes}</p>}
                    {sub.reviewNotes && sub.status === 'Approved' && (
                      <p className="text-xs text-easy mt-1">{sub.reviewNotes}</p>
                    )}
                    {sub.status === 'Rejected' && (sub.rejectionReason || sub.reviewNotes) && (
                      <p className="text-xs text-hard mt-1 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        {sub.rejectionReason || sub.reviewNotes}
                      </p>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-xs font-medium ${difficultyClass(sub.difficulty)}`}>
                    {sub.difficulty}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(sub.completionDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
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
