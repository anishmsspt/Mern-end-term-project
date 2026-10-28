import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-xs font-mono text-slate-400">Verifying session credentials...</p>
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
      <div className="max-w-md mx-auto my-16 p-6 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your account role (<code className="text-brand-400">{user.role}</code>) does not have permission to view this resource.
          Required role(s): <code className="text-slate-300">{allowedRoles.join(', ')}</code>.
        </p>
      </div>
    );
  }

  return children;
}
