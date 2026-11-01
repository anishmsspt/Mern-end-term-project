import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isHost, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navClass = ({ isActive }) =>
    `text-[11px] uppercase tracking-[0.22em] font-semibold py-2 px-3 relative transition-colors duration-200 ${
      isActive
        ? 'text-cream-50 after:content-[""] after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[1px] after:bg-peach-300'
        : 'text-cream-200/80 hover:text-cream-50'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-cream-100/10 bg-ink-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-baseline gap-2.5 group">
          <span className="font-serif text-2xl tracking-[0.22em] text-cream-50 group-hover:text-peach-200 transition-colors">
            UNANIMOUS
          </span>
          <span className="text-[10px] tracking-[0.28em] uppercase text-cream-300 font-sans hidden sm:inline">
            Challenge Hub
          </span>
        </Link>

        {/* Links & Auth State */}
        <div className="flex items-center gap-1 sm:gap-4">
          {isAuthenticated ? (
            <>
              <nav className="flex items-center gap-1 sm:gap-2">
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
              </nav>

              <div className="h-4 w-px bg-cream-100/15 mx-1 hidden sm:block" />

              <div className="hidden md:flex items-center gap-2 text-xs">
                <span className="text-cream-200 max-w-[130px] truncate font-medium">
                  {user?.name}
                </span>
                <span className="lc-badge lc-badge-role text-[9.5px]">
                  {user?.role}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="lc-btn-ghost text-cream-300 hover:text-cream-50 text-xs py-1.5 px-2.5"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="lc-btn-ghost text-xs">
                Sign in
              </Link>
              <Link to="/register" className="lc-btn-primary text-xs">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
