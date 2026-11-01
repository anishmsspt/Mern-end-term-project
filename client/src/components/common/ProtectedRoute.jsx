import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-xs text-ink-400">
        <Loader2 className="w-6 h-6 text-peach-300 animate-spin" />
        <span className="tracking-[0.24em] uppercase text-[10px]">Authenticating session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page and preserve attempted path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if restricted
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-20 lc-card p-8 text-center space-y-3">
        <ShieldAlert className="w-8 h-8 text-hard mx-auto" />
        <div className="lc-eyebrow justify-center text-hard">Access Restricted</div>
        <h2 className="font-serif text-3xl font-normal text-cream-50">Authorized Personnel Only</h2>
        <p className="text-xs text-ink-400 leading-relaxed">
          Your current account role is <span className="font-mono text-peach-300">{user.role}</span>. Access to this workspace requires one of: <span className="text-cream-100 font-mono">{allowedRoles.join(', ')}</span>.
        </p>
      </div>
    );
  }

  return children;
}
