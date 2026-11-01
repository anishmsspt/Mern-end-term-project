import React from 'react';
import { Link } from 'react-router-dom';
import ConnectivityCard from '../components/ConnectivityCard';

export default function LandingPage() {
  const workflowSteps = [
    {
      roman: 'i.',
      title: 'Solve on LeetCode',
      desc: 'Complete assigned problems on LeetCode.',
    },
    {
      roman: 'ii.',
      title: 'Submit activity',
      desc: 'Log the canonical problem URL from your dashboard.',
    },
    {
      roman: 'iii.',
      title: 'Host review',
      desc: 'Hosts verify evidence, difficulty, and timestamps.',
    },
    {
      roman: 'iv.',
      title: 'Score & rank',
      desc: 'Approved solves award points on the leaderboard.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Cinematic Hero */}
      <section className="relative min-h-[680px] lg:min-h-[740px] overflow-hidden flex flex-col justify-between border-b border-cream-100/10">
        {/* Background photo with subtle drift & cinematic overlay */}
        <div
          className="absolute inset-0 bg-cover bg-[center_40%] scale-105 motion-safe:animate-drift"
          style={{ backgroundImage: "url('/dawn-ridge.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/60 via-ink-950/20 to-ink-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/40 to-transparent" />

        {/* Hero body content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 w-full pt-20 pb-12 flex-1 flex flex-col justify-center">
          <div className="max-w-2xl">
            <div className="lc-eyebrow mb-6">Competitive programming club hub</div>
            <h1 className="font-serif font-normal text-5xl sm:text-7xl lg:text-8xl text-cream-50 leading-[0.95] tracking-tight">
              Track solves.<br />
              Review submissions.<br />
              <em className="italic text-peach-200">Rank the cohort.</em>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-cream-200/90 max-w-xl font-normal leading-relaxed">
              A compact workspace for hosts and participants — submissions, approval, points, and standings in one place.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link to="/register" className="lc-btn-primary py-3 px-6 text-xs group">
                Get started <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <Link to="/login" className="lc-btn-secondary py-3 px-6 text-xs">
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Steps strip */}
        <div className="relative z-10 border-t border-cream-100/15 bg-ink-950/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {workflowSteps.map((item, idx) => (
                <div
                  key={item.roman}
                  className={`pr-4 ${idx !== workflowSteps.length - 1 ? 'lg:border-r lg:border-cream-100/10' : ''}`}
                >
                  <div className="font-serif italic text-2xl text-peach-300 mb-1">{item.roman}</div>
                  <h3 className="font-serif font-normal text-xl text-cream-50">{item.title}</h3>
                  <p className="mt-1 text-xs text-ink-400 leading-relaxed font-sans">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Narrative & Operational Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="lc-eyebrow">Cohort Architecture</div>
            <h2 className="font-serif text-3xl sm:text-4xl text-cream-50 leading-tight">
              A refined clubhouse for <em>rigorous practice</em>.
            </h2>
            <p className="text-sm text-ink-400 leading-relaxed max-w-xl">
              Unanimous eliminates manual spreadsheets and fragmented chat threads. Every LeetCode problem solve is logged with timestamps, verified by hosts, and ranked on an immutable, audit-logged leaderboard.
            </p>
          </div>

          <div className="lg:col-span-5">
            <ConnectivityCard />
          </div>
        </div>
      </div>
    </div>
  );
}
