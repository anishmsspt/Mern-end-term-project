import React from 'react';
import { Link } from 'react-router-dom';
import ConnectivityCard from '../components/ConnectivityCard';
import { Code2, CheckCircle, Trophy, Users } from 'lucide-react';

export default function LandingPage() {
  const workflowSteps = [
    {
      step: '01',
      title: 'Solve on LeetCode',
      desc: 'Complete assigned problems on LeetCode.',
      icon: Code2,
    },
    {
      step: '02',
      title: 'Submit activity',
      desc: 'Log the canonical problem URL from your dashboard.',
      icon: CheckCircle,
    },
    {
      step: '03',
      title: 'Host review',
      desc: 'Hosts verify evidence, difficulty, and timestamps.',
      icon: Users,
    },
    {
      step: '04',
      title: 'Score & rank',
      desc: 'Approved solves award points on the leaderboard.',
      icon: Trophy,
    },
  ];

  return (
    <div className="lc-page space-y-8">
      <section className="pt-6 max-w-2xl">
        <p className="text-xs font-medium text-brand-500 mb-2">Competitive programming club hub</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">
          Track solves. Review submissions. Rank the cohort.
        </h1>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          A compact workspace for hosts and participants — submissions, approval, points, and standings in one place.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <Link to="/register" className="lc-btn-primary">
            Get started
          </Link>
          <Link to="/login" className="lc-btn-secondary">
            Sign in
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {workflowSteps.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.step} className="lc-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-500">{item.step}</span>
                <Icon className="w-4 h-4 text-brand-500" />
              </div>
              <h3 className="text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </section>

      <section>
        <ConnectivityCard />
      </section>
    </div>
  );
}
