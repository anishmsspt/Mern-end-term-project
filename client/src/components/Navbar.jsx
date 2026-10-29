import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const navClass = ({ isActive }) =>
  `text-sm px-2.5 py-1 rounded-md transition ${
    isActive ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
  }`;

export default function Navbar() {
  const { user, isAuthenticated, isHost, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
          <span className="w-6 h-6 rounded bg-brand-500 text-slate-950 font-bold text-xs flex items-center justify-center">
            U
          </span>
          <span className="font-semibold text-sm text-white tracking-tight">Unanimous</span>
          <span className="hidden sm:inline text-[11px] text-slate-500">Challenge Hub</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/leaderboard" className={navClass}>
                Leaderboard
              </NavLink>
              {isHost && (
                <NavLink to="/host/review" className={navClass}>
                  Review
                </NavLink>
              )}

              <span className="hidden sm:flex items-center gap-1.5 pl-2 ml-1 border-l border-slate-800 text-xs text-slate-300">
                <span className="max-w-[120px] truncate">{user?.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-500">{user?.role}</span>
              </span>

              <button
                onClick={handleLogout}
                className="lc-btn-ghost text-slate-400"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="lc-btn-ghost text-sm">
                Sign in
              </Link>
              <Link to="/register" className="lc-btn-primary text-sm">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
