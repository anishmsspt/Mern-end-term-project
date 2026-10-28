import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Shield,
  Code2,
  Mail,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isHost } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
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
              <span className="text-xs text-slate-500 font-mono">Phase 2 Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="text-brand-400">{user?.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              {isHost
                ? 'You are signed in as a Challenge Host. You have administrative authority to manage challenges, inspect submissions, and award official score points.'
                : 'You are signed in as a Challenge Participant. In upcoming phases, you will submit daily solves, track review feedback, and compete on the leaderboard.'}
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-1 text-slate-400">
            <div className="text-slate-500">SESSION AUTHENTICATED</div>
            <div className="text-slate-200 truncate max-w-[200px]">{user?.email}</div>
            <div className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>JWT Bearer Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Metadata Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Profile Details</h2>
              <p className="text-xs text-slate-400">Registered Account</p>
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
                <span>Assigned Role</span>
              </span>
              <span className="font-mono text-slate-200 uppercase font-semibold">
                {user?.role}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Code2 className="w-3.5 h-3.5 text-slate-500" />
                <span>LeetCode Handle</span>
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

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Member Since</span>
              </span>
              <span className="text-slate-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}
              </span>
            </div>
          </div>
        </div>

        {/* Role Capabilities Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 md:col-span-2">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isHost ? 'Host Command Center Capabilities' : 'Participant Hub Capabilities'}
              </h2>
              <p className="text-xs text-slate-400">Role-specific system actions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {isHost ? (
              <>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-indigo-300">Submission Review Queue</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Inspect participant solve links, verify completion timestamps, and approve or reject submissions.
                  </p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-indigo-300">Point Allocation & Auditing</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Award score points upon approval; all score adjustments generate immutable audit transaction records.
                  </p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-indigo-300">Challenge Configuration</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Configure challenge rules, unique join codes, start/end dates, and daily submission limits.
                  </p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-indigo-300">Weekly Problem Sets</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Curate recommended problem sets and publish cohort announcements.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-emerald-300">Daily Activity Submission</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Submit solved LeetCode problem URLs, completion date, and optional code or screenshot proof.
                  </p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-emerald-300">Review Status & Feedback</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Track status transitions from Pending to Approved or Rejected with Host feedback notes.
                  </p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-emerald-300">Dynamic Leaderboard</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    View official overall and weekly rankings calculated from verified approved points.
                  </p>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
                  <div className="font-semibold text-emerald-300">Streak & Goal Progress</div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Maintain your daily solving streak and hit weekly cohort targets.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Phase 3 Ready Callout */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Next Milestone: Phase 3</h3>
            <p className="text-xs text-slate-400">
              Challenge membership (join codes) and the daily LeetCode submission engine will connect to this dashboard.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
          Phase 2 Complete • RBAC Verified
        </div>
      </div>
    </div>
  );
}
