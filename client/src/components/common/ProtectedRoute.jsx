import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
        Checking session...
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
      <div className="max-w-sm mx-auto my-16 lc-card p-5 text-center space-y-2">
        <ShieldAlert className="w-6 h-6 text-hard mx-auto" />
        <h2 className="text-sm font-semibold text-white">Access denied</h2>
        <p className="text-xs text-slate-400">
          Role <code className="text-brand-500">{user.role}</code> cannot view this page. Required:{' '}
          <code className="text-slate-300">{allowedRoles.join(', ')}</code>.
        </p>
      </div>
    );
  }

  return children;
}
