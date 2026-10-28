import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal, LogOut, User, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isHost, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition">
            <Terminal className="w-4 h-4 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-brand-400 transition">
                Unanimous
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/30 font-mono">
                LeetCode Hub
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Competitive Programming Management</p>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Dashboard</span>
              </Link>

              {/* User role pill */}
              <div className="hidden sm:flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-full text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHost ? 'bg-indigo-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="font-medium text-slate-200">{user?.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                    isHost
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                      : 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                  }`}
                >
                  {user?.role}
                </span>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/50 px-3 py-1.5 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-400" />
                <span>Sign In</span>
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-950 px-3.5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 shadow-md shadow-emerald-950/40 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
