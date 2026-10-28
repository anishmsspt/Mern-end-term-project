import React from 'react';
import ConnectivityCard from '../components/ConnectivityCard';
import {
  Code2,
  CheckCircle,
  Trophy,
  Users,
  ShieldCheck,
  ArrowRight,
  GitCommit,
  Layers,
  Database,
} from 'lucide-react';

export default function LandingPage() {
  const workflowSteps = [
    {
      step: '01',
      title: 'Solve on LeetCode',
      desc: 'Participant solves a daily problem or weekly assigned set on LeetCode.',
      icon: Code2,
    },
    {
      step: '02',
      title: 'Submit Activity',
      desc: 'Participant logs into the dashboard and submits the canonical problem URL and completion details.',
      icon: CheckCircle,
    },
    {
      step: '03',
      title: 'Host Review',
      desc: 'The Challenge Host inspects completion timestamps, difficulty, and evidence in a dedicated review queue.',
      icon: Users,
    },
    {
      step: '04',
      title: 'Approve & Score',
      desc: 'Host approves the submission and awards points, creating an immutable score audit transaction.',
      icon: Trophy,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Header */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-brand-400 font-mono">
          <GitCommit className="w-3.5 h-3.5" />
          <span>Milestone 1 — Baseline Infrastructure & Live API Diagnostics</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
          Unanimous <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">LeetCode Challenge</span> Hub
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
          The centralized, automated platform replacing spreadsheets, WhatsApp messages, and manual score calculations for competitive programming clubs and student cohorts.
        </p>
      </section>

      {/* Live Connectivity Diagnostic */}
      <section className="max-w-4xl mx-auto">
        <ConnectivityCard />
      </section>

      {/* Primary Workflow Visualizer */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Primary Operational Workflow</h2>
          <p className="text-xs text-slate-400">End-to-end data lifecycle from submission to official score allocation</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workflowSteps.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3 relative overflow-hidden group hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-bold text-slate-700 group-hover:text-brand-500/80 transition">
                    {item.step}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
                    <Icon className="w-4 h-4 text-brand-400" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* System Architecture Highlights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-200">Strict Authorization</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Role-based access control separates Host management privileges from Participant reporting. Backend validation prevents participants from awarding themselves points.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Layers className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-200">Auditable Scoring Ledger</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Points are never arbitrary numbers; each approved submission generates an immutable transaction recording reviewer identity, timestamp, and score delta.
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-brand-400">
            <Database className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-200">Multi-Environment DB</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configured for production MongoDB Atlas deployments while supporting an isolated, development-only in-memory server for instantaneous local tests and evaluation.
          </p>
        </div>
      </section>

      {/* Project Status & Roadmap Footer */}
      <section className="border-t border-slate-800/80 pt-6 text-center text-xs text-slate-500 font-mono">
        <p>Unanimous LeetCode Challenge Hub • MERN Stack Architecture • Phase 1 Completed</p>
      </section>
    </div>
  );
}
